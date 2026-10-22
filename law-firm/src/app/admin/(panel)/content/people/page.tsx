import Link from "next/link";
import type { StaffStatus } from "@prisma/client";
import { AdminHead } from "@/components/admin/panels";
import { Portrait, StatusBadge, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { STAFF_ROLE_LABELS, STAFF_STATUS_LABELS } from "@/lib/labels";
import { requirePermission } from "@/server/auth";

export const metadata = { title: "People profiles" };

export default async function PeopleAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("content.staff");
  const sp = await searchParams;
  const status = strParam(sp.status, 20);
  const rows = await prisma.staffProfile.findMany({
    where: status in STAFF_STATUS_LABELS ? { status: status as StaffStatus } : {},
    orderBy: [{ sortOrder: "asc" }, { fullName: "asc" }],
    include: { user: { select: { email: true } } },
  });
  return (
    <>
      <AdminHead title="People profiles" description="Public attorney and staff profiles. Staff login accounts are managed separately." actions={<Link href="/admin/content/people/new" className="btn btn-primary btn-sm">New profile</Link>} />
      <nav className="chip-nav" aria-label="Filter by status">
        <Link href="/admin/content/people" aria-current={!status ? "true" : undefined}>All</Link>
        {Object.entries(STAFF_STATUS_LABELS).map(([k, v]) => <Link key={k} href={`/admin/content/people?status=${k}`} aria-current={status === k ? "true" : undefined}>{v}</Link>)}
      </nav>
      <div className="table-wrap">
        <table className="table table-stack">
          <thead><tr><th><span className="sr-only">Portrait</span></th><th>Name</th><th>Role</th><th>Status</th><th>Public</th><th>Login account</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td data-label=""><div style={{ width: 44 }}><Portrait name={p.fullName} portraitId={p.portraitId} className="thumb" /></div></td>
                <td data-label="Name"><Link href={`/admin/content/people/${p.id}`}>{p.fullName}</Link><span className="sub">{p.title}</span></td>
                <td data-label="Role">{STAFF_ROLE_LABELS[p.role]}</td>
                <td data-label="Status"><StatusBadge status={p.status} label={STAFF_STATUS_LABELS[p.status]} /></td>
                <td data-label="Public">{p.isPublished && (p.status === "ACTIVE" || p.status === "ON_LEAVE") ? "Visible" : <span className="muted">Hidden</span>}</td>
                <td data-label="Login account">{p.user?.email ?? <span className="muted">None</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
