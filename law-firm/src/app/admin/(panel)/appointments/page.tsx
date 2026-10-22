import Link from "next/link";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { AdminHead } from "@/components/admin/panels";
import { EmptyState, Pagination, StatusBadge, pageParam, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { isValidDateString, timeZoneName, zonedDateString, zonedTimeToUtc } from "@/lib/time";
import { can, requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Appointments" };
const PER_PAGE = 40;

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await requirePermission("appointments.view");
  const sp = await searchParams;
  const settings = await getSettings();
  const tz = settings.timezone;
  const view = ["requests", "upcoming", "all"].includes(strParam(sp.view, 20)) ? strParam(sp.view, 20) : "upcoming";
  const status = strParam(sp.status, 20);
  const attorney = strParam(sp.attorney, 40);
  const from = strParam(sp.from, 10);
  const to = strParam(sp.to, 10);
  const q = strParam(sp.q, 80).trim();
  const page = pageParam(sp.page);
  const now = new Date();

  const and: Prisma.AppointmentWhereInput[] = [];
  if (status in APPOINTMENT_STATUS_LABELS) and.push({ status: status as AppointmentStatus });
  else if (view === "requests") and.push({ status: "REQUESTED" });
  else if (view === "upcoming") and.push({ OR: [{ status: "REQUESTED" }, { status: { in: ["CONFIRMED", "RESCHEDULED"] }, scheduledStart: { gte: new Date(now.getTime() - 3 * 3600_000) } }] });
  if (attorney === "general") and.push({ attorneyId: null });
  else if (attorney) and.push({ attorneyId: attorney });
  if (q) and.push({ OR: [{ reference: { contains: q, mode: "insensitive" } }, { characterName: { contains: q, mode: "insensitive" } }] });
  const fromDate = isValidDateString(from) ? zonedTimeToUtc(from, "00:00", tz) : null;
  const toDate = isValidDateString(to) ? zonedTimeToUtc(to, "23:59", tz) : null;
  if (fromDate || toDate) {
    const range = { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) };
    and.push({ OR: [{ scheduledStart: range }, { scheduledStart: null, requestedStart: range }] });
  }
  const where: Prisma.AppointmentWhereInput = { AND: and };

  const [total, rows, attorneys] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: view === "all" ? [{ requestedStart: "desc" }] : [{ requestedStart: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { attorney: { select: { fullName: true } } },
    }),
    prisma.staffProfile.findMany({ where: { acceptsConsultations: true }, orderBy: { sortOrder: "asc" }, select: { id: true, fullName: true } }),
  ]);

  // Group into an agenda by office-local day.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = zonedDateString(r.scheduledStart ?? r.requestedStart, tz);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const dayLabel = (d: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${d}T12:00:00Z`));
  const timeLabel = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
  const params = { view, status, attorney, from, to, q };

  return (
    <>
      <AdminHead
        title="Appointments"
        description={`Consultation requests and confirmed appointments. Times shown in ${timeZoneName(tz)} (${tz}). There is no external calendar integration; this list is the firm's appointment book.`}
        actions={can(staff, "appointments.manage") && <Link href="/admin/appointments/new" className="btn btn-primary btn-sm">Book an appointment</Link>}
      />
      <nav className="tabs" aria-label="Appointment views">
        {[["upcoming", "Upcoming & requests"], ["requests", "Awaiting confirmation"], ["all", "All appointments"]].map(([k, label]) => (
          <Link key={k} href={`/admin/appointments?view=${k}`} aria-current={view === k ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      <form className="filters" method="get" aria-label="Filter appointments">
        <input type="hidden" name="view" value={view} />
        <div className="field">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" className="input input-sm" defaultValue={q} placeholder="Reference or name" />
        </div>
        <div className="field">
          <label className="label" htmlFor="from">From</label>
          <input id="from" name="from" type="date" className="input input-sm" defaultValue={from} />
        </div>
        <div className="field">
          <label className="label" htmlFor="to">To</label>
          <input id="to" name="to" type="date" className="input input-sm" defaultValue={to} />
        </div>
        <div className="field">
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="select select-sm" defaultValue={status}>
            <option value="">Any</option>
            {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="attorney">Attorney</label>
          <select id="attorney" name="attorney" className="select select-sm" defaultValue={attorney}>
            <option value="">All</option>
            <option value="general">General (unassigned)</option>
            {attorneys.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
          </select>
        </div>
        <div className="row">
          <button className="btn btn-primary btn-sm" type="submit">Apply</button>
          <Link href={`/admin/appointments?view=${view}`} className="btn btn-ghost btn-sm">Reset</Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No appointments match these filters" />
      ) : (
        [...groups.entries()].map(([day, items]) => (
          <section key={day} style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontFamily: "var(--font-sans)" }}>
              {dayLabel(day)} {day === zonedDateString(now, tz) && <span className="badge badge-info">Today</span>}
            </h2>
            <div className="table-wrap">
              <table className="table table-stack">
                <thead><tr><th>Time</th><th>Client</th><th>Type</th><th>Attorney</th><th>Status</th></tr></thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Time" className="nowrap">
                        {timeLabel(a.scheduledStart ?? a.requestedStart)}
                        {!a.scheduledStart && <span className="sub">requested</span>}
                      </td>
                      <td data-label="Client"><Link href={`/admin/appointments/${a.id}`}>{a.characterName}</Link><span className="sub mono">{a.reference}</span></td>
                      <td data-label="Type">{a.consultationType}</td>
                      <td data-label="Attorney">{a.attorney?.fullName ?? <span className="muted">General</span>}</td>
                      <td data-label="Status"><StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/appointments" params={params} />
    </>
  );
}
