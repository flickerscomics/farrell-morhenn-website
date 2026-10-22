"use server";

import { prisma } from "@/lib/db";
import type { FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { issueResetLink } from "@/server/reset-links";

export async function clientAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("clients.manage");
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const account = await prisma.clientAccount.findUnique({ where: { id } });
  if (!account) return { ok: false, message: "Account not found." };
  if (op === "toggle") {
    await prisma.clientAccount.update({ where: { id }, data: { isActive: !account.isActive } });
    if (account.isActive) await prisma.session.deleteMany({ where: { clientAccountId: id } });
    await audit(staffActor(staff), { action: account.isActive ? "client.deactivated" : "client.activated", entityType: "ClientAccount", entityId: id, summary: `${account.isActive ? "Deactivated" : "Reactivated"} portal account ${account.email}` });
    return { ok: true, message: account.isActive ? "Account deactivated and signed out." : "Account reactivated." };
  }
  if (op === "reset") {
    const link = await issueResetLink({ clientAccountId: id });
    await audit(staffActor(staff), { action: "client.reset_link", entityType: "ClientAccount", entityId: id, summary: `Issued a portal password reset link for ${account.email}` });
    return { ok: true, message: `One-time reset link (valid ${link.hours} hours, shown only once): ${link.url}` };
  }
  return { ok: false, message: "Unknown action." };
}
