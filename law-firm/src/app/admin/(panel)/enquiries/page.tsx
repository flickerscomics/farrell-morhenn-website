import Link from "next/link";
import type { EnquiryStatus, Prisma, Priority } from "@prisma/client";
import { AdminHead } from "@/components/admin/panels";
import { EmptyState, Pagination, StatusBadge, pageParam, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { ENQUIRY_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { formatDateTime, formatShortDate } from "@/lib/time";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { staffWith } from "@/server/staff-directory";

export const metadata = { title: "Enquiries" };
const PER_PAGE = 25;

const SORTS: Record<string, Prisma.EnquiryOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  followup: [{ followUpAt: { sort: "asc", nulls: "last" } }],
  priority: [{ priority: "desc" }, { createdAt: "desc" }],
};

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await requirePermission("enquiries.view");
  const sp = await searchParams;
  const q = strParam(sp.q, 80).trim();
  const status = strParam(sp.status, 40);
  const priority = strParam(sp.priority, 20);
  const assigned = strParam(sp.assigned, 40);
  const area = strParam(sp.area, 40);
  const followup = strParam(sp.followup, 10);
  const sort = SORTS[strParam(sp.sort, 20)] ? strParam(sp.sort, 20) : "newest";
  const page = pageParam(sp.page);
  const settings = await getSettings();

  const and: Prisma.EnquiryWhereInput[] = [];
  if (q) and.push({ OR: [{ reference: { contains: q, mode: "insensitive" } }, { characterName: { contains: q, mode: "insensitive" } }, { subject: { contains: q, mode: "insensitive" } }] });
  if (status === "open") and.push({ status: { notIn: ["CLOSED", "DECLINED", "ACCEPTED"] } });
  else if (status in ENQUIRY_STATUS_LABELS) and.push({ status: status as EnquiryStatus });
  if (priority in PRIORITY_LABELS) and.push({ priority: priority as Priority });
  if (assigned === "me") and.push({ assignedToId: staff.id });
  else if (assigned === "none") and.push({ assignedToId: null });
  else if (assigned) and.push({ assignedToId: assigned });
  if (area) and.push({ practiceAreaId: area });
  if (followup === "due") and.push({ followUpAt: { lte: new Date() }, status: { notIn: ["CLOSED", "DECLINED", "ACCEPTED"] } });
  const where: Prisma.EnquiryWhereInput = { AND: and };

  const [total, rows, areas, users] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, reference: true, characterName: true, subject: true, status: true, priority: true, createdAt: true, followUpAt: true,
        practiceArea: { select: { name: true } }, assignedTo: { select: { name: true } }, matterId: true,
      },
    }),
    prisma.practiceArea.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    staffWith("enquiries.manage"),
  ]);
  const params = { q, status, priority, assigned, area, followup, sort };

  return (
    <>
      <AdminHead title="Enquiries" description={`${total} matching ${total === 1 ? "enquiry" : "enquiries"}. Includes general enquiries and practice-area intake submissions.`} />
      <form className="filters" method="get" aria-label="Filter enquiries">
        <div className="field field-grow">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" className="input input-sm" defaultValue={q} placeholder="Reference, name or subject" />
        </div>
        <div className="field">
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="select select-sm" defaultValue={status}>
            <option value="">Any status</option>
            <option value="open">All open</option>
            {Object.entries(ENQUIRY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
          <label className="label" htmlFor="assigned">Assigned to</label>
          <select id="assigned" name="assigned" className="select select-sm" defaultValue={assigned}>
            <option value="">Anyone</option>
            <option value="me">Me</option>
            <option value="none">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
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
          <label className="label" htmlFor="sort">Sort</label>
          <select id="sort" name="sort" className="select select-sm" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Priority</option>
            <option value="followup">Follow-up date</option>
          </select>
        </div>
        {followup && <input type="hidden" name="followup" value={followup} />}
        <div className="row">
          <button className="btn btn-primary btn-sm" type="submit">Apply</button>
          <Link href="/admin/enquiries" className="btn btn-ghost btn-sm">Reset</Link>
        </div>
      </form>
      {followup === "due" && <p className="small"><span className="badge badge-warn">Showing follow-ups that are due</span></p>}

      {rows.length === 0 ? (
        <EmptyState title="No enquiries match these filters" />
      ) : (
        <div className="table-wrap">
          <table className="table table-stack">
            <thead>
              <tr>
                <th>Enquiry</th><th>Area</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Follow-up</th><th>Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Enquiry">
                    <Link href={`/admin/enquiries/${r.id}`}>{r.subject}</Link>
                    <span className="sub"><span className="mono">{r.reference}</span> · {r.characterName}{r.matterId ? " · converted" : ""}</span>
                  </td>
                  <td data-label="Area">{r.practiceArea?.name ?? "General"}</td>
                  <td data-label="Status"><StatusBadge status={r.status} label={ENQUIRY_STATUS_LABELS[r.status]} /></td>
                  <td data-label="Priority"><StatusBadge status={r.priority} label={PRIORITY_LABELS[r.priority]} /></td>
                  <td data-label="Assigned">{r.assignedTo?.name ?? <span className="muted">Unassigned</span>}</td>
                  <td data-label="Follow-up" className="nowrap">
                    {r.followUpAt ? (
                      <span className={r.followUpAt < new Date() ? "error-text" : undefined}>{formatShortDate(r.followUpAt, settings.timezone)}</span>
                    ) : "—"}
                  </td>
                  <td data-label="Received" className="nowrap">{formatDateTime(r.createdAt, settings.timezone, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/enquiries" params={params} />
    </>
  );
}
