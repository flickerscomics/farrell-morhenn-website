import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/client-ui";
import { AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { WILDCARD } from "@/lib/permissions";
import { requirePermission } from "@/server/auth";
import { deleteRoleAction } from "../actions";
import { RoleForm } from "../role-form";

export const metadata = { title: "Edit role" };

export default async function EditRole({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("roles.manage");
  const r = await prisma.role.findUnique({ where: { id: (await params).id }, include: { users: { select: { name: true } } } });
  if (!r) notFound();
  return (
    <>
      <AdminHead back={{ href: "/admin/roles", label: "Roles" }} title={r.name} description={r.users.length ? `Assigned to: ${r.users.map((u) => u.name).join(", ")}` : "No accounts use this role."} />
      <section className="panel"><RoleForm locked={r.permissions.includes(WILDCARD)} values={{ id: r.id, name: r.name, description: r.description, permissions: r.permissions }} /></section>
      {!r.isSystem && r.users.length === 0 && (
        <section className="panel">
          <form action={deleteRoleAction}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmSubmit title={`Delete the ${r.name} role?`} message="This cannot be undone." confirmLabel="Delete role">Delete role</ConfirmSubmit>
          </form>
        </section>
      )}
    </>
  );
}
