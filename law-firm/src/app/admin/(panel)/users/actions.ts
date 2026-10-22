"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission, WILDCARD } from "@/lib/permissions";
import { emailSchema, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission, revokeSessionsForUser, type StaffActor } from "@/server/auth";
import { setFlash } from "@/server/flash";
import { hashPassword } from "@/server/passwords";
import { issueResetLink } from "@/server/reset-links";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  roleId: z.string().min(1, "Choose a role."),
  staffProfileId: z.string().max(40),
});

async function checkRole(staff: StaffActor, roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { ok: false as const, error: "Unknown role." };
  if (role.permissions.includes(WILDCARD) && !hasPermission(staff.permissions, "roles.manage")) {
    return { ok: false as const, error: "Only administrators who manage roles can grant super administrator access." };
  }
  return { ok: true as const, role };
}

async function checkProfile(profileId: string, userId?: string) {
  if (!profileId) return null;
  const linked = await prisma.user.findFirst({ where: { staffProfileId: profileId, NOT: userId ? { id: userId } : undefined } });
  return linked ? "That profile is already linked to another account." : null;
}

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("users.manage");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;
  if (await prisma.user.findUnique({ where: { email: d.email } })) return { ok: false, errors: { email: "An account with this email already exists." } };
  const role = await checkRole(staff, d.roleId);
  if (!role.ok) return { ok: false, errors: { roleId: role.error } };
  const profileError = await checkProfile(d.staffProfileId);
  if (profileError) return { ok: false, errors: { staffProfileId: profileError } };

  // The account starts with an unguessable password; the person sets their own via the link.
  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      roleId: d.roleId,
      staffProfileId: d.staffProfileId || null,
      passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
    },
  });
  const link = await issueResetLink({ userId: user.id });
  await audit(staffActor(staff), { action: "user.created", entityType: "User", entityId: user.id, summary: `Created ${role.role.name} account for ${user.name} (${user.email})` });
  return {
    ok: true,
    message: `Account created. Send ${user.name} this one-time setup link (valid ${link.hours} hours, shown only once): ${link.url}`,
  };
}

const updateSchema = schema.extend({ id: z.string().min(1) });

async function activeSuperAdmins(excludeId: string) {
  return prisma.user.count({ where: { isActive: true, id: { not: excludeId }, role: { permissions: { has: WILDCARD } } } });
}

export async function updateUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("users.manage");
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: d.id }, include: { role: true } });
  if (!user) return { ok: false, message: "Account not found." };
  const isActive = formData.get("isActive") === "on";
  if (await prisma.user.findFirst({ where: { email: d.email, NOT: { id: user.id } } })) return { ok: false, errors: { email: "Another account uses this email." } };
  const role = await checkRole(staff, d.roleId);
  if (!role.ok) return { ok: false, errors: { roleId: role.error } };
  if (user.role.permissions.includes(WILDCARD) && !hasPermission(staff.permissions, "roles.manage") && d.roleId !== user.roleId) {
    return { ok: false, errors: { roleId: "Only administrators who manage roles can change a super administrator's role." } };
  }
  if (user.id === staff.id && (d.roleId !== user.roleId || !isActive)) {
    return { ok: false, message: "You cannot change your own role or deactivate your own account." };
  }
  const losingSuper = user.role.permissions.includes(WILDCARD) && (!role.role.permissions.includes(WILDCARD) || !isActive);
  if (losingSuper && (await activeSuperAdmins(user.id)) === 0) {
    return { ok: false, message: "At least one active super administrator must remain." };
  }
  const profileError = await checkProfile(d.staffProfileId, user.id);
  if (profileError) return { ok: false, errors: { staffProfileId: profileError } };

  await prisma.user.update({
    where: { id: user.id },
    data: { name: d.name, email: d.email, roleId: d.roleId, staffProfileId: d.staffProfileId || null, isActive },
  });
  if (!isActive || d.roleId !== user.roleId) await revokeSessionsForUser(user.id);
  const changes = [
    d.roleId !== user.roleId ? `role → ${role.role.name}` : null,
    isActive !== user.isActive ? (isActive ? "reactivated" : "deactivated") : null,
    d.email !== user.email ? "email changed" : null,
  ].filter(Boolean);
  await audit(staffActor(staff), { action: "user.updated", entityType: "User", entityId: user.id, summary: `Updated ${user.name}${changes.length ? `: ${changes.join(", ")}` : ""}` });
  await setFlash("Account updated.");
  redirect("/admin/users");
}

export async function resetLinkAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("users.manage");
  const user = await prisma.user.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!user) return { ok: false, message: "Account not found." };
  const link = await issueResetLink({ userId: user.id });
  await audit(staffActor(staff), { action: "user.reset_link", entityType: "User", entityId: user.id, summary: `Issued a password reset link for ${user.name}` });
  return { ok: true, message: `One-time reset link for ${user.name} (valid ${link.hours} hours, shown only once): ${link.url}` };
}

export async function revokeSessionsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("users.manage");
  const user = await prisma.user.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!user) return { ok: false, message: "Account not found." };
  await revokeSessionsForUser(user.id);
  await audit(staffActor(staff), { action: "user.sessions_revoked", entityType: "User", entityId: user.id, summary: `Signed ${user.name} out of all sessions` });
  return { ok: true, message: `${user.name} has been signed out everywhere.` };
}
