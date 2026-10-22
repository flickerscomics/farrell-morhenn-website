"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientRegistrationSchema, emailSchema, passwordSchema, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit } from "@/server/audit";
import { createClientSession, destroyClientSession, requireClient } from "@/server/auth";
import { setFlash } from "@/server/flash";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/passwords";
import { checkRateLimit, clearRateLimit, hashedClientIp, sha256 } from "@/server/security";
import { isRealFile, persistFile, prepareFile, UploadError } from "@/server/uploads";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/portal") && !next.startsWith("//") ? next : "/portal";
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = clientRegistrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  if (!(await checkRateLimit("portal-register", await hashedClientIp(), 5, 60 * 60_000))) {
    return { ok: false, message: "Too many registrations from your connection. Please try again later." };
  }
  const { email, characterName, password } = parsed.data;
  if (await prisma.clientAccount.findUnique({ where: { email } })) {
    return { ok: false, errors: { email: "An account with this email already exists. Try signing in." } };
  }
  const account = await prisma.clientAccount.create({ data: { email, characterName, passwordHash: await hashPassword(password) } });
  await audit({ type: "CLIENT", id: account.id, label: characterName }, { action: "client.registered", entityType: "ClientAccount", entityId: account.id, summary: `Portal account registered: ${email}` });
  await createClientSession(account.id);
  redirect("/portal");
}

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.").max(200) });

export async function clientLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Enter your email and password." };
  const { email, password } = parsed.data;
  if (!(await checkRateLimit("portal-login-ip", await hashedClientIp(), 20, 15 * 60_000)) || !(await checkRateLimit("portal-login-email", email, 6, 15 * 60_000))) {
    return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }
  const account = await prisma.clientAccount.findUnique({ where: { email } });
  const valid = await verifyPassword(password, account?.passwordHash ?? (await getDummyHash()));
  if (!account || !valid) return { ok: false, message: "That email and password combination was not recognised." };
  if (!account.isActive) return { ok: false, message: "This account has been deactivated. Please contact the firm." };
  await clearRateLimit("portal-login-email", email);
  await createClientSession(account.id);
  await prisma.clientAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  redirect(safeNext(formData.get("next")));
}

export async function clientLogoutAction() {
  await destroyClientSession();
  redirect("/portal/login");
}

const resetSchema = z
  .object({ token: z.string().min(20).max(100), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export async function clientResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.clientAccountId) {
    return { ok: false, message: "This link is invalid or has expired. Please ask the firm for a new one." };
  }
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.clientAccount.update({ where: { id: record.clientAccountId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    prisma.session.deleteMany({ where: { clientAccountId: record.clientAccountId } }),
  ]);
  await setFlash("Password updated. Please sign in.");
  redirect("/portal/login");
}

const changeSchema = z
  .object({ current: z.string().min(1, "Enter your current password."), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export async function clientChangePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const client = await requireClient();
  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  if (!(await verifyPassword(parsed.data.current, client.passwordHash))) return { ok: false, errors: { current: "Your current password is incorrect." } };
  await prisma.clientAccount.update({ where: { id: client.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  return { ok: true, message: "Password updated." };
}

/** Loads a matter only if it is shared with the signed-in client. */
async function ownMatter(matterId: string) {
  const client = await requireClient();
  const matter = await prisma.matter.findFirst({ where: { id: matterId, clientAccountId: client.id } });
  if (!matter) redirect("/portal");
  return { client, matter };
}

export async function clientMessageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { client, matter } = await ownMatter(String(formData.get("matterId") ?? ""));
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 2 || body.length > 5000) return { ok: false, errors: { body: "Messages must be between 2 and 5,000 characters." } };
  if (!(await checkRateLimit("portal-message", client.id, 30, 60 * 60_000))) return { ok: false, message: "You have sent a lot of messages. Please wait a little before sending more." };
  await prisma.$transaction(async (tx) => {
    await tx.matterMessage.create({ data: { matterId: matter.id, body, senderClientId: client.id, readByClientAt: new Date() } });
    await audit({ type: "CLIENT", id: client.id, label: client.characterName }, { action: "matter.client_message", entityType: "Matter", entityId: matter.id, summary: `Client sent a message on ${matter.reference}` }, tx);
  });
  await setFlash("Message sent.");
  redirect(`/portal/matters/${matter.id}#messages`);
}

const CLIENT_TYPES = ["application/pdf", "text/plain", "image/jpeg", "image/png", "image/webp"] as const;

export async function clientUploadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { client, matter } = await ownMatter(String(formData.get("matterId") ?? ""));
  const file = formData.get("file");
  if (!isRealFile(file)) return { ok: false, errors: { file: "Choose a file to upload." } };
  if (!(await checkRateLimit("portal-upload", client.id, 20, 60 * 60_000))) return { ok: false, message: "Upload limit reached. Please try again later." };
  try {
    const prepared = await prepareFile(file, CLIENT_TYPES);
    await prisma.$transaction(async (tx) => {
      const upload = await persistFile(
        prepared,
        { visibility: "PRIVATE", purpose: "CLIENT_UPLOAD", matterId: matter.id, uploadedByClientId: client.id, clientVisible: true, altText: String(formData.get("description") ?? "").slice(0, 200) },
        tx,
      );
      await audit({ type: "CLIENT", id: client.id, label: client.characterName }, { action: "matter.client_upload", entityType: "Matter", entityId: matter.id, summary: `Client uploaded ${upload.originalName} to ${matter.reference}` }, tx);
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, errors: { file: e.message } };
    throw e;
  }
  await setFlash("Document uploaded. The firm has been notified.");
  redirect(`/portal/matters/${matter.id}#documents`);
}

