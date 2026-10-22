import { notFound } from "next/navigation";
import { PageHero, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { MATTER_EVENT_LABELS, MATTER_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/time";
import { requireClient } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { ClientUploadForm, MessageForm } from "../../forms";
import { PortalBar } from "../../portal-nav";

export const metadata = { title: "Matter", robots: { index: false } };

export default async function PortalMatter({ params }: { params: Promise<{ id: string }> }) {
  const client = await requireClient();
  const { id } = await params;
  // Ownership check: the matter must be shared with this client account.
  const matter = await prisma.matter.findFirst({
    where: { id, clientAccountId: client.id },
    select: {
      id: true, reference: true, title: true, status: true, openedAt: true, closedAt: true,
      practiceArea: { select: { name: true } },
      leadAttorney: { select: { name: true, staffProfile: { select: { fullName: true, title: true } } } },
      events: { where: { clientVisible: true }, orderBy: { occursAt: "desc" }, select: { id: true, type: true, title: true, body: true, occursAt: true, isDeadline: true, completedAt: true } },
      documents: {
        where: { OR: [{ clientVisible: true }, { uploadedByClientId: client.id }] },
        orderBy: { createdAt: "desc" },
        select: { id: true, originalName: true, altText: true, createdAt: true, uploadedByClientId: true, size: true },
      },
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true, senderUser: { select: { name: true } }, senderClientId: true } },
    },
  });
  if (!matter) notFound();
  await prisma.matterMessage.updateMany({ where: { matterId: id, senderUserId: { not: null }, readByClientAt: null }, data: { readByClientAt: new Date() } });
  const settings = await getSettings();
  const tz = settings.timezone;
  const lead = matter.leadAttorney?.staffProfile ? `${matter.leadAttorney.staffProfile.fullName}, ${matter.leadAttorney.staffProfile.title}` : (matter.leadAttorney?.name ?? "To be assigned");

  return (
    <>
      <PageHero eyebrow={matter.reference} title={matter.title} crumbs={[{ label: "Client portal", href: "/portal" }, { label: matter.reference }]} />
      <section className="section-tight">
        <div className="container">
          <PortalBar name={client.characterName} />
          <div className="split split-aside">
            <div className="stack">
              <section className="card" aria-labelledby="timeline-h">
                <h2 id="timeline-h" style={{ fontSize: "1.3rem" }}>Updates and key dates</h2>
                {matter.events.length === 0 ? <p className="muted">Your legal team has not shared any updates yet.</p> : (
                  <ol className="timeline-public">
                    {matter.events.map((e) => (
                      <li key={e.id}>
                        <span className="timeline-year small">{formatDate(e.occursAt, tz)}</span>
                        <div>
                          <h3>{e.title} <span className="badge badge-outline">{MATTER_EVENT_LABELS[e.type]}</span>{e.completedAt && <> <span className="badge badge-success">Done</span></>}</h3>
                          <p className="small muted">{formatDateTime(e.occursAt, tz)}</p>
                          {e.body && <p style={{ whiteSpace: "pre-wrap" }}>{e.body}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <section className="card" id="messages" aria-labelledby="messages-h">
                <h2 id="messages-h" style={{ fontSize: "1.3rem" }}>Messages</h2>
                {matter.messages.length === 0 ? <p className="muted">No messages yet.</p> : (
                  <ul className="feed" style={{ listStyle: "none", padding: 0 }}>
                    {matter.messages.map((m) => (
                      <li key={m.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--line-soft)" }}>
                        <div className="small muted">{m.senderClientId ? "You" : `${m.senderUser?.name ?? "The firm"} (${settings.shortName})`} · {formatDateTime(m.createdAt, tz)}</div>
                        <p style={{ whiteSpace: "pre-wrap", margin: "0.25rem 0 0" }}>{m.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: "1rem" }}><MessageForm matterId={matter.id} /></div>
              </section>
            </div>
            <aside className="stack">
              <div className="card">
                <dl className="profile-meta">
                  <div><dt>Status</dt><dd><StatusBadge status={matter.status} label={MATTER_STATUS_LABELS[matter.status]} /></dd></div>
                  <div><dt>Lead attorney</dt><dd>{lead}</dd></div>
                  <div><dt>Practice area</dt><dd>{matter.practiceArea?.name ?? "—"}</dd></div>
                  <div><dt>Opened</dt><dd>{formatDate(matter.openedAt, tz)}</dd></div>
                  {matter.closedAt && <div><dt>Closed</dt><dd>{formatDate(matter.closedAt, tz)}</dd></div>}
                </dl>
              </div>
              <div className="card" id="documents">
                <h2 style={{ fontSize: "1.2rem" }}>Documents</h2>
                {matter.documents.length === 0 ? <p className="small muted">No documents shared yet.</p> : (
                  <ul className="list-check small">
                    {matter.documents.map((d) => (
                      <li key={d.id}><a href={`/files/${d.id}`}>{d.originalName}</a><br /><span className="muted">{d.uploadedByClientId ? "Uploaded by you" : "From the firm"} · {formatDate(d.createdAt, tz)}</span></li>
                    ))}
                  </ul>
                )}
                <hr />
                <ClientUploadForm matterId={matter.id} maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
