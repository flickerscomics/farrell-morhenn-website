import Link from "next/link";
import type { ActorType, Prisma } from "@prisma/client";
import { AdminHead } from "@/components/admin/panels";
import { EmptyState, Pagination, pageParam, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDateTime, isValidDateString, zonedTimeToUtc } from "@/lib/time";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Audit log" };
const PER_PAGE = 50;
const ENTITY_LINKS: Record<string, string> = {
  Enquiry: "/admin/enquiries/",
  Appointment: "/admin/appointments/",
  Matter: "/admin/matters/",
  Application: "/admin/recruitment/",
  Article: "/admin/content/articles/",
  User: "/admin/users/",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("audit.view");
  const sp = await searchParams;
  const q = strParam(sp.q, 80).trim();
  const entity = strParam(sp.entity, 40);
  const actor = strParam(sp.actor, 20);
  const from = strParam(sp.from, 10);
  const to = strParam(sp.to, 10);
  const page = pageParam(sp.page);
  const settings = await getSettings();
  const tz = settings.timezone;

  const and: Prisma.AuditEventWhereInput[] = [];
  if (q) and.push({ OR: [{ summary: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }, { actorLabel: { contains: q, mode: "insensitive" } }] });
  if (entity) and.push({ entityType: entity });
  if (["STAFF", "CLIENT", "PUBLIC", "SYSTEM"].includes(actor)) and.push({ actorType: actor as ActorType });
  if (isValidDateString(from)) and.push({ createdAt: { gte: zonedTimeToUtc(from, "00:00", tz)! } });
  if (isValidDateString(to)) and.push({ createdAt: { lte: zonedTimeToUtc(to, "23:59", tz)! } });
  const where = { AND: and };

  const [total, rows, entities] = await Promise.all([
    prisma.auditEvent.count({ where }),
    prisma.auditEvent.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.auditEvent.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
  ]);

  return (
    <>
      <AdminHead title="Audit log" description="A permanent record of significant actions: sign-ins, submissions, status changes, content and permission changes." />
      <form className="filters" method="get">
        <div className="field field-grow"><label className="label" htmlFor="q">Search</label><input id="q" name="q" className="input input-sm" defaultValue={q} /></div>
        <div className="field"><label className="label" htmlFor="entity">Record type</label>
          <select id="entity" name="entity" className="select select-sm" defaultValue={entity}><option value="">All</option>{entities.map((e) => <option key={e.entityType} value={e.entityType}>{e.entityType}</option>)}</select></div>
        <div className="field"><label className="label" htmlFor="actor">Actor</label>
          <select id="actor" name="actor" className="select select-sm" defaultValue={actor}><option value="">Anyone</option><option value="STAFF">Staff</option><option value="CLIENT">Portal client</option><option value="PUBLIC">Public visitor</option><option value="SYSTEM">System</option></select></div>
        <div className="field"><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" className="input input-sm" defaultValue={from} /></div>
        <div className="field"><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" className="input input-sm" defaultValue={to} /></div>
        <div className="row"><button className="btn btn-primary btn-sm" type="submit">Apply</button><Link href="/admin/audit" className="btn btn-ghost btn-sm">Reset</Link></div>
      </form>
      {rows.length === 0 ? <EmptyState title="No events match" /> : (
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Summary</th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td data-label="When" className="nowrap">{formatDateTime(e.createdAt, tz, false)}</td>
                  <td data-label="Who">{e.actorLabel || "—"}<span className="sub">{e.actorType.toLowerCase()}</span></td>
                  <td data-label="Action"><span className="mono">{e.action}</span></td>
                  <td data-label="Summary">
                    {e.entityId && ENTITY_LINKS[e.entityType] ? <Link href={`${ENTITY_LINKS[e.entityType]}${e.entityId}`}>{e.summary}</Link> : e.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/audit" params={{ q, entity, actor, from, to }} />
    </>
  );
}
