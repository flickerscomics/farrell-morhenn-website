import { AdminHead } from "@/components/admin/panels";
import { requirePermission } from "@/server/auth";
import { userFormOptions } from "../data";
import { UserForm } from "../forms";

export const metadata = { title: "New staff account" };

export default async function NewUser() {
  await requirePermission("users.manage");
  return (
    <>
      <AdminHead back={{ href: "/admin/users", label: "Staff accounts" }} title="New staff account" description="The new person receives a one-time link to choose their own password. No password is ever sent or shown." />
      <section className="panel" style={{ maxWidth: 820 }}>
        <UserForm {...(await userFormOptions())} values={{ name: "", email: "", roleId: "", staffProfileId: "", isActive: true }} />
      </section>
    </>
  );
}
