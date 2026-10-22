"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { emailSchema, passwordSchema, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit } from "@/server/audit";
import { createStaffSession, revokeSessionsForUser } from "@/server/auth";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/passwords";
import { checkRateLimit, clearRateLimit, hashedClientIp, sha256 } from "@/server/security";

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.").max(200) });

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Enter your email and password." };
  const { email, password } = parsed.data;
  const ip = await hashedClientIp();
  const generic = { ok: false, message: "That email and password combination was not recognised." };

  if (!(await checkRateLimit("login-ip", ip, 20, 15 * 60_000)) || !(await checkRateLimit("login-email", email, 6, 15 * 60_000))) {
    return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) {
    if (user) {
      await audit({ type: "SYSTEM", label: "Authentication" }, { action: "auth.login_failed", entityType: "User", entityId: user.id, summary: `Failed sign-in for ${email}` });
    }
    return generic;
  }
  if (!user.isActive) return { ok: false, message: "This account has been deactivated. Contact a firm administrator." };

  await clearRateLimit("login-email", email);
  await createStaffSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ type: "STAFF", id: user.id, label: user.name }, { action: "auth.login", entityType: "User", entityId: user.id, summary: `${user.name} signed in` });
  redirect(user.mustChangePassword ? "/admin/account?required=1" : safeNext(formData.get("next")));
}

const resetSchema = z
  .object({ token: z.string().min(20).max(100), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  if (!(await checkRateLimit("reset", await hashedClientIp(), 10, 15 * 60_000))) {
    return { ok: false, message: "Too many attempts. Please wait and try again." };
  }
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.userId) {
    return { ok: false, message: "This reset link is invalid or has expired. Ask an administrator for a new one." };
  }
  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    const user = await tx.user.update({ where: { id: record.userId! }, data: { passwordHash, mustChangePassword: false } });
    await audit({ type: "STAFF", id: user.id, label: user.name }, { action: "auth.password_reset", entityType: "User", entityId: user.id, summary: `${user.name} set a new password using a reset link` }, tx);
  });
  await revokeSessionsForUser(record.userId);
  redirect("/admin/login?reset=1");
}
