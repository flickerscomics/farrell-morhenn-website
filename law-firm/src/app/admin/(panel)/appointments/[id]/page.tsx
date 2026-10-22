import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityPanel, AdminHead, NotesPanel } from "@/components/admin/panels";
import { StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";
import { activityFor } from "@/server/audit";
import { can, requirePermission } from "@/server/auth";
import { allowedActions } from "@/server/services/appointments";
import { findAccessibleMatter } from "@/server/services/matters";
import { getSettings } from "@/server/settings";
import { addAppointmentNoteAction } from "../actions";
import { LinkRecordForm, TransitionForms } from "./forms";

export const metadata = { title: "Appointment" };

export default async function AppointmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("appointments.view");
  const { id } = await params;
  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      attorney: { select: { fullName: true } },
      enquiry: { select: { id: true, reference: true, subject: true } },
      handledBy: { select: { name: true } },
      internalNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      clientAccount: { select: { email: true } },
    },
  });
  if (!appt) notFound();
  const settings = await getSettings();
  const tz = settings.timezone;
  const canManage = can(staff, "appointments.manage");
  // Only reveal the linked matter to staff who may see it.
  const matter = appt.matterId ? await findAccessibleMatter(staff, appt.matterId) : null;
  const events = await activityFor("Appointment", appt.id);

  return (
    <>
      <AdminHead
        back={{ href: "/admin/appointments", label: "Appointments" }}
        title={`${appt.consultationType}: ${appt.characterName}`}
        description={<><span className="mono">{appt.reference}</span> · requested {formatDateTime(appt.createdAt, tz)}</>}
        actions={<StatusBadge status={appt.status} label={APPOINTMENT_STATUS_LABELS[appt.status]} />}
      />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>Details</h2>
            <dl className="dl-grid">
              <dt>Scheduled</dt><dd>{appt.scheduledStart ? <strong>{formatDateTime(appt.scheduledStart, tz)}</strong> : "Not yet confirmed"}</dd>
              <dt>Requested</dt><dd>{formatDateTime(appt.requestedStart, tz)}</dd>
              <dt>Alternative</dt><dd>{formatDateTime(appt.alternativeStart, tz)}</dd>
              <dt>Duration</dt><dd>{appt.durationMinutes} minutes</dd>
              <dt>Attorney</dt><dd>{appt.attorney?.fullName ?? "General consultation"}</dd>
              <dt>Location</dt><dd>{appt.location || "—"}</dd>
              <dt>Client</dt><dd>{appt.characterName}</dd>
              <dt>Contact details</dt><dd>{appt.contactDetails || "—"}</dd>
              <dt>Preferred contact</dt><dd>{appt.preferredContact || "—"}</dd>
              {appt.clientAccount && (<><dt>Portal account</dt><dd>{appt.clientAccount.email}</dd></>)}
              <dt>Reason</dt><dd>{appt.reason}</dd>
              <dt>Notes from client</dt><dd>{appt.notes || "—"}</dd>
              {appt.statusReason && (<><dt>Status reason</dt><dd>{appt.statusReason}</dd></>)}
              <dt>Last handled by</dt><dd>{appt.handledBy?.name ?? "—"}</dd>
            </dl>
          </section>
          <NotesPanel notes={appt.internalNotes} timezone={tz} action={addAppointmentNoteAction} hiddenFields={{ appointmentId: appt.id }} canWrite={canManage} />
          <ActivityPanel events={events} timezone={tz} />
        </div>
        <div>
          {canManage && allowedActions(appt.status).length > 0 && (
            <section className="panel">
              <h2>Update</h2>
              <TransitionForms
                id={appt.id}
                actions={allowedActions(appt.status)}
                requestedLabel={formatDateTime(appt.requestedStart, tz)}
                alternativeLabel={appt.alternativeStart ? formatDateTime(appt.alternativeStart, tz) : null}
                location={appt.location}
              />
            </section>
          )}
          <section className="panel">
            <h2>Linked records</h2>
            <dl className="dl-grid">
              <dt>Enquiry</dt>
              <dd>{appt.enquiry ? (can(staff, "enquiries.view") ? <Link href={`/admin/enquiries/${appt.enquiry.id}`}>{appt.enquiry.reference}</Link> : appt.enquiry.reference) : "—"}</dd>
              <dt>Matter</dt>
              <dd>{matter ? <Link href={`/admin/matters/${matter.id}`}>{matter.reference}</Link> : appt.matterId ? "Linked (restricted)" : "—"}</dd>
            </dl>
            {canManage && <div style={{ marginTop: "1rem" }}><LinkRecordForm id={appt.id} /></div>}
          </section>
        </div>
      </div>
    </>
  );
}
