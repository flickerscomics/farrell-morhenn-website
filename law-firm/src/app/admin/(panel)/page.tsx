import Link from "next/link";
import { AdminHead } from "@/components/admin/panels";
import { StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { APPOINTMENT_STATUS_LABELS, ENQUIRY_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";
import { can, requirePermission } from "@/server/auth";
import { CLOSED_MATTER_STATUSES, matterAccessWhere } from "@/server/services/matters";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const staff = await requirePermission("dashboard.view");
  const settings = await getSettings();
  const tz = settings.timezone;
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86400_000);
  const canEnq = can(staff, "enquiries.view");
  const canAppt = can(staff, "appointments.view");
  const canMatters = can(staff, "matters.view_assigned") || can(staff, "matters.view_all");
  const canRec = can(staff, "recruitment.view");
  const canAudit = can(staff, "audit.view");
  const matterWhere = matterAccessWhere(staff);
  const openMatter = { status: { notIn: CLOSED_MATTER_STATUSES } };

  const [newEnq, reviewEnq, followEnq, upcoming, requested, activeMatters, followMatters, deadlines, openApps, recentEnq, nextAppts, activity] =
    await Promise.all([
      canEnq ? prisma.enquiry.count({ where: { status: "NEW" } }) : null,
      canEnq ? prisma.enquiry.count({ where: { status: { in: ["UNDER_REVIEW", "AWAITING_INFORMATION"] } } }) : null,
      canEnq ? prisma.enquiry.count({ where: { followUpAt: { lte: now }, status: { notIn: ["CLOSED", "DECLINED", "ACCEPTED"] } } }) : null,
      canAppt ? prisma.appointment.count({ where: { status: { in: ["CONFIRMED", "RESCHEDULED"] }, scheduledStart: { gte: now, lte: weekAhead } } }) : null,
      canAppt ? prisma.appointment.count({ where: { status: "REQUESTED" } }) : null,
      canMatters ? prisma.matter.count({ where: { AND: [matterWhere, { status: "ACTIVE" }] } }) : null,
      canMatters ? prisma.matter.count({ where: { AND: [matterWhere, openMatter, { followUpAt: { lte: weekAhead } }] } }) : null,
      canMatters
        ? prisma.matterEvent.findMany({
            where: { isDeadline: true, completedAt: null, occursAt: { lte: new Date(now.getTime() + 14 * 86400_000) }, matter: { AND: [matterWhere, openMatter] } },
            orderBy: { occursAt: "asc" },
            take: 6,
            include: { matter: { select: { id: true, reference: true, title: true } } },
          })
        : [],
      canRec ? prisma.application.count({ where: { archivedAt: null, status: { in: ["RECEIVED", "UNDER_REVIEW", "INTERVIEW"] } } }) : null,
      canEnq ? prisma.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, reference: true, subject: true, characterName: true, status: true, createdAt: true } }) : [],
      canAppt
        ? prisma.appointment.findMany({
            where: { OR: [{ status: "REQUESTED" }, { status: { in: ["CONFIRMED", "RESCHEDULED"] }, scheduledStart: { gte: now } }] },
            orderBy: [{ requestedStart: "asc" }],
            take: 6,
            select: { id: true, reference: true, characterName: true, status: true, requestedStart: true, scheduledStart: true, consultationType: true },
          })
        : [],
      canAudit ? prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }) : [],
    ]);

  const stats = [
    { show: newEnq !== null, value: newEnq, label: "New enquiries", href: "/admin/enquiries?status=NEW" },
    { show: reviewEnq !== null, value: reviewEnq, label: "Enquiries in review", href: "/admin/enquiries?status=UNDER_REVIEW" },
    { show: followEnq !== null, value: followEnq, label: "Enquiry follow-ups due", href: "/admin/enquiries?followup=due" },
    { show: requested !== null, value: requested, label: "Consultation requests", href: "/admin/appointments?status=REQUESTED" },
    { show: upcoming !== null, value: upcoming, label: "Appointments next 7 days", href: "/admin/appointments?view=upcoming" },
    { show: activeMatters !== null, value: activeMatters, label: "Active matters", href: "/admin/matters?status=ACTIVE" },
    { show: followMatters !== null, value: followMatters, label: "Matters needing follow-up", href: "/admin/matters?followup=due" },
    { show: openApps !== null, value: openApps, label: "Open applications", href: "/admin/recruitment" },
  ].filter((s) => s.show);

  return (
    <>
      <AdminHead title={`Good to see you, ${staff.name.split(" ")[0]}`} description="Live figures from the firm's records." />
      {stats.length > 0 ? (
        <div className="stat-grid">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="stat">
              <div className="value">{s.value}</div>
              <div className="label-sm">{s.label}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel"><p>Your role gives you access to website content. Use the menu to get started.</p></div>
      )}
      <div className="grid grid-2">
        {canEnq && (
          <section className="panel">
            <div className="panel-head"><h2>Latest enquiries</h2><Link href="/admin/enquiries" className="link-arrow">All</Link></div>
            {recentEnq.length === 0 ? <p className="small muted">No enquiries yet.</p> : (
              <ul className="feed">
                {recentEnq.map((e) => (
                  <li key={e.id} className="row row-between">
                    <span><Link href={`/admin/enquiries/${e.id}`}>{e.subject}</Link><br /><span className="when">{e.reference} · {e.characterName} · {formatDateTime(e.createdAt, tz)}</span></span>
                    <StatusBadge status={e.status} label={ENQUIRY_STATUS_LABELS[e.status]} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {canAppt && (
          <section className="panel">
            <div className="panel-head"><h2>Appointments needing attention</h2><Link href="/admin/appointments" className="link-arrow">All</Link></div>
            {nextAppts.length === 0 ? <p className="small muted">Nothing pending.</p> : (
              <ul className="feed">
                {nextAppts.map((a) => (
                  <li key={a.id} className="row row-between">
                    <span><Link href={`/admin/appointments/${a.id}`}>{a.characterName}</Link> · {a.consultationType}<br /><span className="when">{a.reference} · {formatDateTime(a.scheduledStart ?? a.requestedStart, tz)}</span></span>
                    <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {canMatters && (
          <section className="panel">
            <div className="panel-head"><h2>Deadlines in the next 14 days</h2><Link href="/admin/matters" className="link-arrow">Matters</Link></div>
            {deadlines.length === 0 ? <p className="small muted">No open deadlines.</p> : (
              <ul className="feed">
                {deadlines.map((d) => (
                  <li key={d.id}>
                    <Link href={`/admin/matters/${d.matter.id}`}>{d.title}</Link>
                    {d.occursAt < now && <> <span className="badge badge-danger">Overdue</span></>}
                    <div className="when">{d.matter.reference} · {d.matter.title} · {formatDateTime(d.occursAt, tz)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {canAudit && (
          <section className="panel">
            <div className="panel-head"><h2>Recent activity</h2><Link href="/admin/audit" className="link-arrow">Audit log</Link></div>
            {activity.length === 0 ? <p className="small muted">No activity yet.</p> : (
              <ul className="feed">
                {activity.map((e) => (
                  <li key={e.id}>{e.summary}<div className="when">{e.actorLabel} · {formatDateTime(e.createdAt, tz)}</div></li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
