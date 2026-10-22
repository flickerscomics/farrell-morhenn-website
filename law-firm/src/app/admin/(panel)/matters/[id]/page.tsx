import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit, SubmitButton } from "@/components/client-ui";
import { ActivityPanel, AdminHead, NotesPanel } from "@/components/admin/panels";
import { StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { APPOINTMENT_STATUS_LABELS, ENQUIRY_STATUS_LABELS, MATTER_EVENT_LABELS, MATTER_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { formatDate, formatDateTime, toLocalInput } from "@/lib/time";
import { activityFor } from "@/server/audit";
import { can, requirePermission } from "@/server/auth";
import { findAccessibleMatter } from "@/server/services/matters";
import { getSettings } from "@/server/settings";
import { staffWith } from "@/server/staff-directory";
import {
  addMatterNoteAction,
  draftCaseAnnouncementAction,
  matterDocumentOpAction,
  matterEventOpAction,
  staffMessageAction,
  updateMatterAction,
} from "../actions";
import { MatterForm } from "../matter-form";
import { ClientLinkForm, DocumentForm, EventForm } from "./forms";

export const metadata = { title: "Matter" };

export default async function MatterDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("matters.view_assigned", "matters.view_all");
  const { id } = await params;
  const base = await findAccessibleMatter(staff, id);
  if (!base) notFound();
  const canNotes = can(staff, "matters.notes");
  const canDocs = can(staff, "matters.documents");
  const canEdit = can(staff, "matters.edit");

  const matter = await prisma.matter.findUniqueOrThrow({
    where: { id },
    include: {
      practiceArea: { select: { id: true, name: true } },
      leadAttorney: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      enquiries: { select: { id: true, reference: true, subject: true, status: true } },
      appointments: { select: { id: true, reference: true, status: true, scheduledStart: true, requestedStart: true, consultationType: true }, orderBy: { requestedStart: "desc" } },
      events: { orderBy: { occursAt: "desc" }, include: { author: { select: { name: true } } } },
      clientAccount: { select: { email: true, characterName: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { senderUser: { select: { name: true } }, senderClient: { select: { characterName: true } } } },
      publicPosts: { select: { id: true, title: true, status: true } },
    },
  });
  // Private notes and documents are only loaded for staff permitted to see them.
  const [notes, documents] = await Promise.all([
    canNotes ? prisma.note.findMany({ where: { matterId: id }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } }) : [],
    canDocs
      ? prisma.upload.findMany({
          where: { matterId: id },
          orderBy: { createdAt: "desc" },
          include: { uploadedBy: { select: { name: true } }, uploadedByClient: { select: { characterName: true } } },
        })
      : [],
  ]);
  // Mark client messages as read by staff.
  await prisma.matterMessage.updateMany({ where: { matterId: id, senderClientId: { not: null }, readByStaffAt: null }, data: { readByStaffAt: new Date() } });

  const settings = await getSettings();
  const tz = settings.timezone;
  const [areas, team, events] = await Promise.all([
    prisma.practiceArea.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    staffWith("matters.view_assigned", "matters.view_all"),
    activityFor("Matter", id, 40),
  ]);
  const now = new Date();

  return (
    <>
      <AdminHead
        back={{ href: "/admin/matters", label: "Matters" }}
        title={matter.title}
        description={<><span className="mono">{matter.reference}</span> · client {matter.clientName} · opened {formatDate(matter.openedAt, tz)}{matter.closedAt && ` · closed ${formatDate(matter.closedAt, tz)}`}</>}
        actions={
          <>
            <StatusBadge status={matter.status} label={MATTER_STATUS_LABELS[matter.status]} />
            <StatusBadge status={matter.priority} label={`${PRIORITY_LABELS[matter.priority]} priority`} />
            {matter.isRestricted && <span className="badge badge-danger">Restricted</span>}
          </>
        }
      />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>Overview</h2>
            <dl className="dl-grid">
              <dt>Client</dt><dd>{matter.clientName}</dd>
              <dt>Client contact</dt><dd>{matter.clientContact || "—"}</dd>
              <dt>Practice area</dt><dd>{matter.practiceArea?.name ?? "—"}</dd>
              <dt>Lead attorney</dt><dd>{matter.leadAttorney?.name ?? "Unassigned"}</dd>
              <dt>Supporting staff</dt><dd>{matter.members.map((m) => m.user.name).join(", ") || "—"}</dd>
              <dt>Follow-up</dt><dd>{formatDateTime(matter.followUpAt, tz)}</dd>
              <dt>Description</dt><dd>{matter.description || "—"}</dd>
            </dl>
          </section>

          <section className="panel" id="timeline">
            <h2>Timeline, dates and deadlines</h2>
            {canEdit && (
              <details style={{ marginBottom: "1rem" }}>
                <summary className="btn btn-secondary btn-sm">Add an entry</summary>
                <div style={{ marginTop: "1rem" }}><EventForm matterId={matter.id} /></div>
              </details>
            )}
            {matter.events.length === 0 ? <p className="small muted">No entries yet.</p> : (
              <ol className="timeline-admin">
                {matter.events.map((e) => (
                  <li key={e.id} className={e.completedAt ? "done" : e.isDeadline ? "deadline" : undefined}>
                    <div className="row" style={{ gap: "0.4rem" }}>
                      <strong>{e.title}</strong>
                      <span className="badge badge-outline">{MATTER_EVENT_LABELS[e.type]}</span>
                      {e.isDeadline && !e.completedAt && <span className={`badge ${e.occursAt < now ? "badge-danger" : "badge-warn"}`}>{e.occursAt < now ? "Overdue" : "Deadline"}</span>}
                      {e.completedAt && <span className="badge badge-success">Done</span>}
                      {e.clientVisible && <span className="badge badge-info">Client can see</span>}
                    </div>
                    <div className="small muted">{formatDateTime(e.occursAt, tz)}{e.author && ` · ${e.author.name}`}</div>
                    {e.body && <p className="note-body small">{e.body}</p>}
                    {canEdit && (
                      <form action={matterEventOpAction} className="row" style={{ gap: "0.25rem", marginTop: "0.35rem" }}>
                        <input type="hidden" name="eventId" value={e.id} />
                        {e.isDeadline && <SubmitButton className="btn btn-ghost btn-sm" name="op" value="complete" pendingLabel="…">{e.completedAt ? "Reopen" : "Mark done"}</SubmitButton>}
                        <SubmitButton className="btn btn-ghost btn-sm" name="op" value="toggle-client" pendingLabel="…">{e.clientVisible ? "Hide from client" : "Share with client"}</SubmitButton>
                        <ConfirmSubmit className="btn btn-ghost btn-sm" title="Delete this entry?" message="The timeline entry will be permanently removed." confirmLabel="Delete" name="op" value="delete">Delete</ConfirmSubmit>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {canNotes && (
            <NotesPanel notes={notes} timezone={tz} action={addMatterNoteAction} hiddenFields={{ matterId: matter.id }} canWrite />
          )}

          {canDocs && (
            <section className="panel" id="documents">
              <h2>Documents</h2>
              {documents.length === 0 ? <p className="small muted">No documents uploaded.</p> : (
                <div className="table-wrap" style={{ marginBottom: "1rem" }}>
                  <table className="table table-stack">
                    <thead><tr><th>File</th><th>Uploaded</th><th>Client access</th><th><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.id}>
                          <td data-label="File"><a href={`/files/${d.id}`}>{d.originalName}</a>{d.altText && <span className="sub">{d.altText}</span>}</td>
                          <td data-label="Uploaded">{d.uploadedBy?.name ?? (d.uploadedByClient ? `${d.uploadedByClient.characterName} (client)` : "—")}<span className="sub">{formatDateTime(d.createdAt, tz, false)}</span></td>
                          <td data-label="Client access">{d.clientVisible ? <span className="badge badge-info">Shared</span> : <span className="badge badge-muted">Internal</span>}</td>
                          <td data-label="">
                            <form action={matterDocumentOpAction} className="row" style={{ gap: "0.25rem" }}>
                              <input type="hidden" name="uploadId" value={d.id} />
                              <SubmitButton className="btn btn-ghost btn-sm" name="op" value="toggle-client" pendingLabel="…">{d.clientVisible ? "Unshare" : "Share"}</SubmitButton>
                              <ConfirmSubmit className="btn btn-ghost btn-sm" title="Delete this document?" message="The file will be permanently deleted." confirmLabel="Delete" name="op" value="delete">Delete</ConfirmSubmit>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <DocumentForm matterId={matter.id} maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
            </section>
          )}

          <section className="panel">
            <h2>Client messages</h2>
            {!matter.clientAccount ? (
              <p className="small muted">This matter is not linked to a client portal account, so secure messaging is unavailable.</p>
            ) : (
              <>
                {matter.messages.length === 0 ? <p className="small muted">No messages yet.</p> : (
                  <ul className="feed">
                    {matter.messages.map((m) => (
                      <li key={m.id}>
                        <div className="when">{m.senderUser ? `${m.senderUser.name} (firm)` : `${m.senderClient?.characterName ?? "Client"} (client)`} · {formatDateTime(m.createdAt, tz)}</div>
                        <p className="note-body">{m.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && (
                  <form action={staffMessageAction} className="form" style={{ marginTop: "1rem" }}>
                    <input type="hidden" name="matterId" value={matter.id} />
                    <div className="field">
                      <label className="label" htmlFor="msg">Message to {matter.clientAccount.characterName}</label>
                      <textarea id="msg" name="body" className="textarea" rows={3} required maxLength={5000} style={{ minHeight: 90 }} />
                      <p className="help">The client sees this in their portal.</p>
                    </div>
                    <div><SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Sending…">Send message</SubmitButton></div>
                  </form>
                )}
              </>
            )}
          </section>

          <ActivityPanel events={events} timezone={tz} />
        </div>

        <div>
          {canEdit && (
            <section className="panel">
              <details>
                <summary className="btn btn-secondary btn-sm">Edit matter details</summary>
                <div style={{ marginTop: "1rem" }}>
                  <MatterForm
                    action={updateMatterAction}
                    submitLabel="Save matter"
                    areas={areas.map((a) => ({ value: a.id, label: a.name }))}
                    team={team.map((t) => ({ value: t.id, label: `${t.name} (${t.roleName})` }))}
                    canArchive={can(staff, "matters.archive")}
                    values={{
                      id: matter.id,
                      title: matter.title,
                      clientName: matter.clientName,
                      clientContact: matter.clientContact,
                      practiceAreaId: matter.practiceArea?.id ?? "",
                      leadAttorneyId: matter.leadAttorney?.id ?? "",
                      description: matter.description,
                      status: matter.status,
                      priority: matter.priority,
                      isRestricted: matter.isRestricted,
                      followUpAt: toLocalInput(matter.followUpAt, tz),
                      memberIds: matter.members.map((m) => m.user.id),
                    }}
                  />
                </div>
              </details>
            </section>
          )}
          <section className="panel">
            <h2>Related enquiries</h2>
            {matter.enquiries.length === 0 ? <p className="small muted">None.</p> : (
              <ul className="feed">
                {matter.enquiries.map((e) => (
                  <li key={e.id}>
                    {can(staff, "enquiries.view") ? <Link href={`/admin/enquiries/${e.id}`}>{e.reference}</Link> : e.reference} — {e.subject}{" "}
                    <StatusBadge status={e.status} label={ENQUIRY_STATUS_LABELS[e.status]} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel">
            <h2>Appointments</h2>
            {matter.appointments.length === 0 ? <p className="small muted">None linked.</p> : (
              <ul className="feed">
                {matter.appointments.map((a) => (
                  <li key={a.id}>
                    {can(staff, "appointments.view") ? <Link href={`/admin/appointments/${a.id}`}>{a.consultationType}</Link> : a.consultationType}{" "}
                    <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
                    <div className="when">{a.reference} · {formatDateTime(a.scheduledStart ?? a.requestedStart, tz)}</div>
                  </li>
                ))}
              </ul>
            )}
            <p className="small muted" style={{ marginTop: "0.75rem" }}>Link appointments from the appointment page using this matter&apos;s reference.</p>
          </section>
          <section className="panel">
            <h2>Client portal</h2>
            <p className="small">{matter.clientAccount ? <>Shared with <strong>{matter.clientAccount.characterName}</strong> ({matter.clientAccount.email}).</> : "Not shared with any portal account."}</p>
            <p className="small muted">The client sees the status, lead attorney, timeline entries and documents marked as shared, and can message the firm. Private notes are never shown.</p>
            {can(staff, "clients.manage") && <ClientLinkForm matterId={matter.id} current={matter.clientAccount?.email ?? ""} />}
          </section>
          {can(staff, "content.articles") && (
            <section className="panel">
              <h2>Public case announcement</h2>
              {matter.publicPosts.length > 0 && (
                <ul className="feed">
                  {matter.publicPosts.map((p) => <li key={p.id}><Link href={`/admin/content/articles/${p.id}`}>{p.title}</Link> <StatusBadge status={p.status} /></li>)}
                </ul>
              )}
              <p className="small muted">Creates an empty draft article. No client names, notes or documents are copied. Public announcements must not identify the client.</p>
              <form action={draftCaseAnnouncementAction}>
                <input type="hidden" name="matterId" value={matter.id} />
                <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Creating…">Draft announcement</SubmitButton>
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
