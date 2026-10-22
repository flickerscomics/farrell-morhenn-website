"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { passwordSchema, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { currentStaffToken, destroyStaffSession, getStaff, requireStaff, revokeSessionsForUser } from "@/server/auth";
import { setFlash } from "@/server/flash";
import { hashPassword, verifyPassword } from "@/server/passwords";

export async function logoutAction() {
  const staff = await getStaff();
  if (staff) await audit(staffActor(staff), { action: "auth.logout", entityType: "User", entityId: staff.id, summary: `${staff.name} signed out` });
  await destroyStaffSession();
  redirect("/admin/login");
}

const schema = z
  .object({ current: z.string().min(1, "Enter your current password."), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] })
  .refine((v) => v.password !== v.current, { message: "Choose a password different from the current one.", path: ["password"] });

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const parsed = schema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  if (!(await verifyPassword(parsed.data.current, staff.passwordHash))) {
    return { ok: false, errors: { current: "Your current password is incorrect." } };
  }
  await prisma.user.update({
    where: { id: staff.id },
    data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false },
  });
  await revokeSessionsForUser(staff.id, await currentStaffToken());
  await audit(staffActor(staff), { action: "auth.password_changed", entityType: "User", entityId: staff.id, summary: `${staff.name} changed their password` });
  await setFlash("Password updated. Other sessions have been signed out.");
  redirect("/admin/account");
}
