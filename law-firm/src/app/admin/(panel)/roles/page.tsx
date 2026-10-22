import Link from "next/link";
import { AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { ALL_PERMISSIONS, WILDCARD } from "@/lib/permissions";
import { requirePermission } from "@/server/auth";

export const metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  await requirePermission("roles.manage");
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } });
  return (
    <>
      <AdminHead title="Roles & permissions" description="Permissions are enforced on the server for every page and action." actions={<Link href="/admin/roles/new" className="btn btn-primary btn-sm">New role</Link>} />
      <div className="table-wrap">
        <table className="table table-stack">
          <thead><tr><th>Role</th><th className="num">Permissions</th><th className="num">Accounts</th><th>Type</th></tr></thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td data-label="Role"><Link href={`/admin/roles/${r.id}`}>{r.name}</Link><span className="sub">{r.description}</span></td>
                <td data-label="Permissions" className="num">{r.permissions.includes(WILDCARD) ? "All" : `${r.permissions.length} / ${ALL_PERMISSIONS.length}`}</td>
                <td data-label="Accounts" className="num">{r._count.users}</td>
                <td data-label="Type">{r.isSystem ? "Built-in" : "Custom"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
