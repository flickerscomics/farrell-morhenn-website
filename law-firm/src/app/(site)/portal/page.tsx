import Link from "next/link";
import { EmptyState, PageHero, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { APPOINTMENT_STATUS_LABELS, ENQUIRY_STATUS_LABELS, MATTER_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime, formatShortDate } from "@/lib/time";
import { requireClient } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { PortalBar } from "./portal-nav";

export const metadata = { title: "Client portal", robots: { index: false } };

export default async function PortalDashboard() {
  const client = await requireClient();
  const settings = await getSettings();
  const tz = settings.timezone;
  const [matters, enquiries, appointments] = await Promise.all([
    prisma.matter.findMany({
      where: { clientAccountId: client.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, reference: true, title: true, status: true, updatedAt: true,
        leadAttorney: { select: { name: true } },
        _count: { select: { messages: { where: { senderUserId: { not: null }, readByClientAt: null } } } },
      },
    }),
    prisma.enquiry.findMany({ where: { clientAccountId: client.id }, orderBy: { createdAt: "desc" }, select: { id: true, reference: true, subject: true, status: true, createdAt: true } }),
    prisma.appointment.findMany({
      where: { OR: [{ clientAccountId: client.id }, { matter: { clientAccountId: client.id } }] },
      orderBy: { requestedStart: "desc" },
      take: 20,
      select: { id: true, reference: true, consultationType: true, status: true, requestedStart: true, scheduledStart: true, attorney: { select: { fullName: true } } },
    }),
  ]);
  const now = new Date();
  const upcoming = appointments.filter((a) => (a.scheduledStart ?? a.requestedStart) >= now && !["CANCELLED", "DECLINED", "COMPLETED", "NO_SHOW"].includes(a.status));
  const past = appointments.filter((a) => !upcoming.includes(a));

  return (
    <>
      <PageHero eyebrow="Client portal" title={`Welcome, ${client.characterName}`} crumbs={[{ label: "Client portal" }]} />
      <section className="section-tight">
        <div className="container">
          <PortalBar name={client.characterName} />
          <h2>Your matters</h2>
          {matters.length === 0 ? (
            <EmptyState title="No matters have been shared with you yet">
              <p>Once the firm opens a matter for you, your attorney can share it with this account ({client.email}).</p>
            </EmptyState>
          ) : (
            <div className="grid grid-2">
              {matters.map((m) => (
                <Link key={m.id} href={`/portal/matters/${m.id}`} className="card card-link">
                  <div className="row row-between">
                    <span className="mono small">{m.reference}</span>
                    <StatusBadge status={m.status} label={MATTER_STATUS_LABELS[m.status]} />
                  </div>
                  <h3 style={{ marginTop: "0.5rem" }}>{m.title}</h3>
                  <p className="small muted" style={{ margin: 0 }}>Lead attorney: {m.leadAttorney?.name ?? "To be assigned"} · updated {formatShortDate(m.updatedAt, tz)}</p>
                  {m._count.messages > 0 && <p className="small" style={{ margin: "0.5rem 0 0" }}><span className="badge badge-info">{m._count.messages} new message{m._count.messages > 1 ? "s" : ""}</span></p>}
                </Link>
              ))}
            </div>
          )}

          <div className="grid grid-2" style={{ marginTop: "2.5rem" }}>
            <div>
              <h2>Appointments</h2>
              {appointments.length === 0 ? <p className="muted">No appointments yet. <Link href="/consultation">Request a consultation</Link>.</p> : (
                <>
                  <h3 style={{ fontSize: "1rem" }}>Upcoming</h3>
                  {upcoming.length === 0 ? <p className="small muted">None.</p> : (
                    <ul className="feed">{upcoming.map((a) => (
                      <li key={a.id}><strong>{a.consultationType}</strong> with {a.attorney?.fullName ?? "the firm"} <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} /><div className="when">{a.reference} · {a.scheduledStart ? formatDateTime(a.scheduledStart, tz) : `requested for ${formatDateTime(a.requestedStart, tz)}`}</div></li>
                    ))}</ul>
                  )}
                  <h3 style={{ fontSize: "1rem", marginTop: "1rem" }}>Past and closed</h3>
                  {past.length === 0 ? <p className="small muted">None.</p> : (
                    <ul className="feed">{past.map((a) => (
                      <li key={a.id}>{a.consultationType} <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} /><div className="when">{a.reference} · {formatDateTime(a.scheduledStart ?? a.requestedStart, tz)}</div></li>
                    ))}</ul>
                  )}
                </>
              )}
            </div>
            <div>
              <h2>Your enquiries</h2>
              {enquiries.length === 0 ? <p className="muted">Enquiries you send while signed in appear here. <Link href="/enquiry">Make an enquiry</Link>.</p> : (
                <ul className="feed">{enquiries.map((e) => (
                  <li key={e.id}>{e.subject} <StatusBadge status={e.status} label={ENQUIRY_STATUS_LABELS[e.status]} /><div className="when">{e.reference} · {formatShortDate(e.createdAt, tz)}</div></li>
                ))}</ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
