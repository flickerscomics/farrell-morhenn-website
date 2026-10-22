import Link from "next/link";
import type { MatterStatus, Prisma, Priority } from "@prisma/client";
import { AdminHead } from "@/components/admin/panels";
import { EmptyState, Pagination, StatusBadge, pageParam, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { MATTER_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { formatShortDate } from "@/lib/time";
import { can, requirePermission } from "@/server/auth";
import { CLOSED_MATTER_STATUSES, matterAccessWhere } from "@/server/services/matters";
import { getSettings } from "@/server/settings";
import { staffWith } from "@/server/staff-directory";

export const metadata = { title: "Matters" };
const PER_PAGE = 25;
const SORTS: Record<string, Prisma.MatterOrderByWithRelationInput[]> = {
  updated: [{ updatedAt: "desc" }],
  opened: [{ openedAt: "desc" }],
  followup: [{ followUpAt: { sort: "asc", nulls: "last" } }],
  priority: [{ priority: "desc" }, { updatedAt: "desc" }],
  reference: [{ reference: "asc" }],
};

export default async function MattersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await requirePermission("matters.view_assigned", "matters.view_all");
  const sp = await searchParams;
  const q = strParam(sp.q, 80).trim();
  const status = strParam(sp.status, 40) || "open";
  const priority = strParam(sp.priority, 20);
  const area = strParam(sp.area, 40);
  const lead = strParam(sp.lead, 40);
  const followup = strParam(sp.followup, 10);
  const sortKey = SORTS[strParam(sp.sort, 20)] ? strParam(sp.sort, 20) : "updated";
  const page = pageParam(sp.page);
  const settings = await getSettings();

  const and: Prisma.MatterWhereInput[] = [matterAccessWhere(staff)];
  if (q) and.push({ OR: [{ reference: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }, { clientName: { contains: q, mode: "insensitive" } }] });
  if (status === "open") and.push({ status: { notIn: CLOSED_MATTER_STATUSES } });
  else if (status in MATTER_STATUS_LABELS) and.push({ status: status as MatterStatus });
  if (priority in PRIORITY_LABELS) and.push({ priority: priority as Priority });
  if (area) and.push({ practiceAreaId: area });
  if (lead === "me") and.push({ OR: [{ leadAttorneyId: staff.id }, { members: { some: { userId: staff.id } } }] });
  else if (lead) and.push({ leadAttorneyId: lead });
  if (followup === "due") and.push({ followUpAt: { lte: new Date(Date.now() + 7 * 86400_000) } });
  const where: Prisma.MatterWhereInput = { AND: and };

  const [total, rows, areas, leads] = await Promise.all([
    prisma.matter.count({ where }),
    prisma.matter.findMany({
      where,
      orderBy: SORTS[sortKey],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { practiceArea: { select: { name: true } }, leadAttorney: { select: { name: true } } },
    }),
    prisma.practiceArea.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    staffWith("matters.view_assigned", "matters.view_all"),
  ]);

  return (
    <>
      <AdminHead
        title="Matters"
        description={can(staff, "matters.view_all") ? "All matters you can access. Restricted matters appear only to their team." : "Matters you lead or support."}
        actions={can(staff, "matters.create") && <Link href="/admin/matters/new" className="btn btn-primary btn-sm">Open a matter</Link>}
      />
      <form className="filters" method="get" aria-label="Filter matters">
        <div className="field field-grow">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" className="input input-sm" defaultValue={q} placeholder="Reference, title or client" />
        </div>
        <div className="field">
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="select select-sm" defaultValue={status}>
            <option value="open">All open</option>
            <option value="any">Any status</option>
            {Object.entries(MATTER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="priority">Priority</label>
          <select id="priority" name="priority" className="select select-sm" defaultValue={priority}>
            <option value="">Any</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="area">Practice area</label>
          <select id="area" name="area" className="select select-sm" defaultValue={area}>
            <option value="">All</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="lead">Attorney</label>
          <select id="lead" name="lead" className="select select-sm" defaultValue={lead}>
            <option value="">Anyone</option>
            <option value="me">My matters</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="sort">Sort</label>
          <select id="sort" name="sort" className="select select-sm" defaultValue={sortKey}>
            <option value="updated">Recently updated</option>
            <option value="opened">Recently opened</option>
            <option value="followup">Follow-up date</option>
            <option value="priority">Priority</option>
            <option value="reference">Reference</option>
          </select>
        </div>
        {followup && <input type="hidden" name="followup" value={followup} />}
        <div className="row">
          <button className="btn btn-primary btn-sm" type="submit">Apply</button>
          <Link href="/admin/matters" className="btn btn-ghost btn-sm">Reset</Link>
        </div>
      </form>
      {followup === "due" && <p className="small"><span className="badge badge-warn">Showing matters with a follow-up due within 7 days</span></p>}
      {rows.length === 0 ? (
        <EmptyState title="No matters match these filters" />
      ) : (
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Matter</th><th>Client</th><th>Area</th><th>Lead</th><th>Status</th><th>Priority</th><th>Follow-up</th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td data-label="Matter">
                    <Link href={`/admin/matters/${m.id}`}>{m.title}</Link>
                    <span className="sub"><span className="mono">{m.reference}</span>{m.isRestricted && " · restricted"}</span>
                  </td>
                  <td data-label="Client">{m.clientName}</td>
                  <td data-label="Area">{m.practiceArea?.name ?? "—"}</td>
                  <td data-label="Lead">{m.leadAttorney?.name ?? "—"}</td>
                  <td data-label="Status"><StatusBadge status={m.status} label={MATTER_STATUS_LABELS[m.status]} /></td>
                  <td data-label="Priority"><StatusBadge status={m.priority} label={PRIORITY_LABELS[m.priority]} /></td>
                  <td data-label="Follow-up" className="nowrap">{m.followUpAt ? formatShortDate(m.followUpAt, settings.timezone) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/matters" params={{ q, status, priority, area, lead, followup, sort: sortKey }} />
    </>
  );
}
