import { notFound } from "next/navigation";
import { ConfirmSubmit, SubmitButton } from "@/components/client-ui";
import { ActivityPanel, AdminHead, NotesPanel } from "@/components/admin/panels";
import { StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { APPLICATION_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";
import { activityFor } from "@/server/audit";
import { can, requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { addApplicationNoteAction, archiveApplicationAction, updateApplicationAction } from "../actions";

export const metadata = { title: "Application" };

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("recruitment.view");
  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      vacancy: { select: { title: true } },
      attachments: { select: { id: true, originalName: true, size: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!app) notFound();
  const settings = await getSettings();
  const tz = settings.timezone;
  const canManage = can(staff, "recruitment.manage");
  const events = await activityFor("Application", app.id);

  return (
    <>
      <AdminHead
        back={{ href: "/admin/recruitment", label: "Applications" }}
        title={app.characterName}
        description={<><span className="mono">{app.reference}</span> · {app.desiredRole} · received {formatDateTime(app.createdAt, tz)}</>}
        actions={<>
          <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status]} />
          {app.archivedAt && <span className="badge badge-muted">Archived</span>}
        </>}
      />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>Application</h2>
            <dl className="dl-grid">
              <dt>Vacancy</dt><dd>{app.vacancy?.title ?? "General application"}</dd>
              <dt>Desired role</dt><dd>{app.desiredRole}</dd>
              <dt>Contact details</dt><dd>{app.contactDetails}</dd>
              <dt>Preferred contact</dt><dd>{app.preferredContact || "—"}</dd>
              <dt>Availability</dt><dd>{app.availability}</dd>
              <dt>Experience</dt><dd>{app.experience}</dd>
              <dt>Statement</dt><dd>{app.statement}</dd>
              <dt>Attachment</dt>
              <dd>{app.attachments.length ? app.attachments.map((f) => <a key={f.id} href={`/files/${f.id}`}>{f.originalName}</a>) : "—"}</dd>
            </dl>
          </section>
          <NotesPanel notes={app.notes} timezone={tz} action={addApplicationNoteAction} hiddenFields={{ applicationId: app.id }} canWrite={canManage} />
          <ActivityPanel events={events} timezone={tz} />
        </div>
        <div>
          {canManage && (
            <section className="panel">
              <h2>Decision</h2>
              <form action={updateApplicationAction} className="form">
                <input type="hidden" name="id" value={app.id} />
                <div className="field">
                  <label className="label" htmlFor="status">Status</label>
                  <select id="status" name="status" className="select" defaultValue={app.status}>
                    {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="decision">Decision notes</label>
                  <textarea id="decision" name="decision" className="textarea" rows={4} defaultValue={app.decision} maxLength={2000} />
                  {app.decidedAt && <p className="help">Decision recorded {formatDateTime(app.decidedAt, tz)}.</p>}
                </div>
                <SubmitButton>Save</SubmitButton>
              </form>
              <hr />
              <form action={archiveApplicationAction}>
                <input type="hidden" name="id" value={app.id} />
                {app.archivedAt ? (
                  <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Restoring…">Restore application</SubmitButton>
                ) : (
                  <ConfirmSubmit title="Archive this application?" message="Archived applications are hidden from the main list but kept on record." confirmLabel="Archive" tone="primary">
                    Archive application
                  </ConfirmSubmit>
                )}
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
