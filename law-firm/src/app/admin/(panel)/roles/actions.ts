"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isPermission, WILDCARD } from "@/lib/permissions";
import { slugify, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { setFlash } from "@/server/flash";

const schema = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(80), description: z.string().trim().max(300) });

export async function saveRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("roles.manage");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const permissions = [...new Set(formData.getAll("permissions").map(String).filter(isPermission))];
  const d = parsed.data;
  if (d.id) {
    const role = await prisma.role.findUnique({ where: { id: d.id } });
    if (!role) return { ok: false, message: "Role not found." };
    if (role.permissions.includes(WILDCARD)) {
      await prisma.role.update({ where: { id: role.id }, data: { name: d.name, description: d.description } });
    } else {
      await prisma.role.update({ where: { id: role.id }, data: { name: d.name, description: d.description, permissions } });
      // Sessions pick up the new permissions on their next request; nothing else to do.
    }
    await audit(staffActor(staff), { action: "role.updated", entityType: "Role", entityId: role.id, summary: `Updated role "${d.name}" (${role.permissions.includes(WILDCARD) ? "all permissions" : `${permissions.length} permissions`})`, metadata: { before: role.permissions, after: permissions } });
  } else {
    const key = slugify(d.name).replace(/-/g, "_");
    if (await prisma.role.findUnique({ where: { key } })) return { ok: false, errors: { name: "A role with a similar name already exists." } };
    const role = await prisma.role.create({ data: { key, name: d.name, description: d.description, permissions } });
    await audit(staffActor(staff), { action: "role.created", entityType: "Role", entityId: role.id, summary: `Created role "${d.name}" with ${permissions.length} permissions` });
  }
  await setFlash("Role saved.");
  redirect("/admin/roles");
}

export async function deleteRoleAction(formData: FormData) {
  const staff = await requirePermission("roles.manage");
  const id = String(formData.get("id") ?? "");
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role || role.isSystem || role._count.users > 0) {
    await setFlash("Built-in roles and roles with members cannot be deleted.", "error");
    redirect("/admin/roles");
  }
  await prisma.role.delete({ where: { id } });
  await audit(staffActor(staff), { action: "role.deleted", entityType: "Role", entityId: id, summary: `Deleted role "${role.name}"` });
  await setFlash("Role deleted.");
  redirect("/admin/roles");
}
