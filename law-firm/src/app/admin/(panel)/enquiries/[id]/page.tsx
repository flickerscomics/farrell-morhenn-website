import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { ActivityPanel, AdminHead, NotesPanel } from "@/components/admin/panels";
import { SubmitButton } from "@/components/client-ui";
import { StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { parseIntakeAnswers } from "@/lib/intake";
import { APPOINTMENT_STATUS_LABELS, ENQUIRY_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { formatDateTime, toLocalInput } from "@/lib/time";
import { activityFor } from "@/server/audit";
import { can, requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { staffWith } from "@/server/staff-directory";
import { addEnquiryNoteAction, updateEnquiryAction } from "../actions";
import { ConvertForm } from "./convert-form";
import { LinkAppointmentForm } from "./link-appointment";

export const metadata = { title: "Enquiry" };

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("enquiries.view");
  const { id } = await params;
  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      practiceArea: { select: { name: true } },
      preferredAttorney: { select: { fullName: true } },
      assignedTo: { select: { id: true, name: true } },
      matter: { select: { id: true, reference: true, title: true } },
      appointments: { select: { id: true, reference: true, status: true, requestedStart: true, scheduledStart: true }, orderBy: { requestedStart: "asc" } },
      attachments: { select: { id: true, originalName: true, size: true, mimeType: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      clientAccount: { select: { email: true } },
    },
  });
  if (!enquiry) notFound();
  const settings = await getSettings();
  const tz = settings.timezone;
  const canManage = can(staff, "enquiries.manage");
  const canConvert = can(staff, "matters.create");
  const [assignees, events, lawyers, linkable] = await Promise.all([
    staffWith("enquiries.manage"),
    activityFor("Enquiry", enquiry.id),
    canConvert ? staffWith("matters.edit") : [],
    canManage && can(staff, "appointments.manage")
      ? prisma.appointment.findMany({
          where: { enquiryId: null, status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] } },
          orderBy: { requestedStart: "asc" },
          take: 50,
          select: { id: true, reference: true, characterName: true },
        })
      : [],
  ]);
  const answers = parseIntakeAnswers(enquiry.intakeData);

  return (
    <>
      <AdminHead
        back={{ href: "/admin/enquiries", label: "Enquiries" }}
        title={enquiry.subject}
        description={<><span className="mono">{enquiry.reference}</span> · received {formatDateTime(enquiry.createdAt, tz)}</>}
        actions={
          <>
            <StatusBadge status={enquiry.status} label={ENQUIRY_STATUS_LABELS[enquiry.status]} />
            <StatusBadge status={enquiry.priority} label={`${PRIORITY_LABELS[enquiry.priority]} priority`} />
          </>
        }
      />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>Submission</h2>
            <dl className="dl-grid">
              <dt>Character</dt><dd>{enquiry.characterName}</dd>
              <dt>Contact details</dt><dd>{enquiry.contactDetails || "—"}</dd>
              <dt>Preferred contact</dt><dd>{enquiry.preferredContact || "—"}</dd>
              <dt>Practice area</dt><dd>{enquiry.practiceArea?.name ?? "General enquiry"}</dd>
              <dt>Preferred attorney</dt><dd>{enquiry.preferredAttorney?.fullName ?? "No preference"}</dd>
              <dt>Preferred time</dt><dd>{[enquiry.preferredDate, enquiry.preferredTime].filter(Boolean).join(" at ") || "—"}</dd>
              {enquiry.clientAccount && (<><dt>Portal account</dt><dd>{enquiry.clientAccount.email}</dd></>)}
              <dt>Description</dt><dd>{enquiry.description}</dd>
            </dl>
          </section>
          {answers.length > 0 && (
            <section className="panel">
              <h2>Intake answers</h2>
              <dl className="dl-grid">
                {answers.map((a) => (<Fragment key={a.key}><dt>{a.label}</dt><dd>{a.value}</dd></Fragment>))}
              </dl>
            </section>
          )}
          <section className="panel">
            <h2>Attachments</h2>
            {enquiry.attachments.length === 0 ? <p className="small muted">No files were attached.</p> : (
              <ul className="list-check">
                {enquiry.attachments.map((f) => (
                  <li key={f.id}><a href={`/files/${f.id}`}>{f.originalName}</a> <span className="small muted">({Math.ceil(f.size / 1024)} KB)</span></li>
                ))}
              </ul>
            )}
          </section>
          <NotesPanel notes={enquiry.notes} timezone={tz} action={addEnquiryNoteAction} hiddenFields={{ enquiryId: enquiry.id }} canWrite={canManage} />
          <ActivityPanel events={events} timezone={tz} />
        </div>
        <div>
          {canManage && (
            <section className="panel">
              <h2>Workflow</h2>
              <form action={updateEnquiryAction} className="form">
                <input type="hidden" name="id" value={enquiry.id} />
                <div className="field">
                  <label className="label" htmlFor="status">Status</label>
                  <select id="status" name="status" className="select" defaultValue={enquiry.status}>
                    {Object.entries(ENQUIRY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="priority">Priority</label>
                  <select id="priority" name="priority" className="select" defaultValue={enquiry.priority}>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="assignedToId">Assigned to</label>
                  <select id="assignedToId" name="assignedToId" className="select" defaultValue={enquiry.assignedTo?.id ?? ""}>
                    <option value="">Unassigned</option>
                    {assignees.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.roleName})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="followUpAt">Follow-up</label>
                  <input id="followUpAt" name="followUpAt" type="datetime-local" className="input" defaultValue={toLocalInput(enquiry.followUpAt, tz)} />
                  <p className="help">Office time ({tz}).</p>
                </div>
                <SubmitButton>Save changes</SubmitButton>
              </form>
            </section>
          )}
          <section className="panel">
            <h2>Appointments</h2>
            {enquiry.appointments.length === 0 ? <p className="small muted">No linked appointments.</p> : (
              <ul className="feed">
                {enquiry.appointments.map((a) => (
                  <li key={a.id} className="row row-between">
                    <span><Link href={`/admin/appointments/${a.id}`} className="mono">{a.reference}</Link><br /><span className="when">{formatDateTime(a.scheduledStart ?? a.requestedStart, tz)}</span></span>
                    <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
                  </li>
                ))}
              </ul>
            )}
            {linkable.length > 0 && <LinkAppointmentForm enquiryId={enquiry.id} appointments={linkable} />}
          </section>
          <section className="panel">
            <h2>Matter</h2>
            {enquiry.matter ? (
              <p>Converted into <Link href={`/admin/matters/${enquiry.matter.id}`}>{enquiry.matter.reference}: {enquiry.matter.title}</Link>. The original enquiry and its history are kept here.</p>
            ) : canConvert ? (
              <>
                <p className="small muted">Opening a matter keeps this enquiry and links it to the new matter, along with any linked appointments.</p>
                <ConvertForm enquiryId={enquiry.id} defaultTitle={`${enquiry.characterName} — ${enquiry.subject}`.slice(0, 160)} lawyers={lawyers} currentUserId={staff.id} />
              </>
            ) : (
              <p className="small muted">Not yet converted. An attorney can open a matter from this enquiry.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
