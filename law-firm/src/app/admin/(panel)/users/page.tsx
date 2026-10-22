import Link from "next/link";
import { AdminHead } from "@/components/admin/panels";
import { StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Staff accounts" };

export default async function UsersPage() {
  await requirePermission("users.manage");
  const [users, settings] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { role: { select: { name: true } }, staffProfile: { select: { fullName: true } } } }),
    getSettings(),
  ]);
  return (
    <>
      <AdminHead title="Staff accounts" description="Who can sign in to the administration area, and with which role." actions={<Link href="/admin/users/new" className="btn btn-primary btn-sm">New account</Link>} />
      <div className="table-wrap">
        <table className="table table-stack">
          <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Profile</th><th>Last sign-in</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Name"><Link href={`/admin/users/${u.id}`}>{u.name}</Link><span className="sub">{u.email}</span></td>
                <td data-label="Role">{u.role.name}</td>
                <td data-label="Status"><StatusBadge status={u.isActive ? "ACTIVE" : "INACTIVE"} label={u.isActive ? "Active" : "Deactivated"} /></td>
                <td data-label="Profile">{u.staffProfile?.fullName ?? "—"}</td>
                <td data-label="Last sign-in">{u.lastLoginAt ? formatDateTime(u.lastLoginAt, settings.timezone, false) : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
