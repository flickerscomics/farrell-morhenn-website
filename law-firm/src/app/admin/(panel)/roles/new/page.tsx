import { AdminHead } from "@/components/admin/panels";
import { requirePermission } from "@/server/auth";
import { RoleForm } from "../role-form";

export const metadata = { title: "New role" };

export default async function NewRole() {
  await requirePermission("roles.manage");
  return (
    <>
      <AdminHead back={{ href: "/admin/roles", label: "Roles" }} title="New role" />
      <section className="panel"><RoleForm locked={false} values={{ name: "", description: "", permissions: ["dashboard.view"] }} /></section>
    </>
  );
}
