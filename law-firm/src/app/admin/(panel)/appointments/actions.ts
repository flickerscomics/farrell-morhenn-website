"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fromLocalInput } from "@/lib/time";
import { characterNameSchema, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { can, requirePermission } from "@/server/auth";
import { setFlash } from "@/server/flash";
import { randomReference } from "@/server/references";
import { contentFingerprint } from "@/server/security";
import { AppointmentError, findConflict, transitionAppointment, type AppointmentAction } from "@/server/services/appointments";
import { findAccessibleMatter } from "@/server/services/matters";
import { getSettings, schedulingRules } from "@/server/settings";

const ACTIONS: AppointmentAction[] = ["confirm", "decline", "reschedule", "cancel", "complete", "no_show"];
const MESSAGES: Record<AppointmentAction, string> = {
  confirm: "Appointment confirmed.",
  decline: "Request declined.",
  reschedule: "Appointment rescheduled.",
  cancel: "Appointment cancelled.",
  complete: "Marked as completed.",
  no_show: "Marked as a no-show.",
};

export async function appointmentTransitionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("appointments.manage");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("op") ?? "") as AppointmentAction;
  if (!ACTIONS.includes(action)) return { ok: false, message: "Unknown action." };
  const settings = await getSettings();
  const appt = await prisma.appointment.findUnique({ where: { id }, select: { requestedStart: true, alternativeStart: true } });
  if (!appt) return { ok: false, message: "Appointment not found." };

  let scheduledStart: Date | null = null;
  if (action === "confirm") {
    const choice = String(formData.get("slot") ?? "requested");
    if (choice === "alternative") scheduledStart = appt.alternativeStart;
    else if (choice === "custom") {
      scheduledStart = fromLocalInput(String(formData.get("customStart") ?? ""), settings.timezone);
      if (!scheduledStart) return { ok: false, errors: { customStart: "Enter a valid date and time." } };
    } else scheduledStart = appt.requestedStart;
  }
  if (action === "reschedule") {
    scheduledStart = fromLocalInput(String(formData.get("newStart") ?? ""), settings.timezone);
    if (!scheduledStart) return { ok: false, errors: { newStart: "Enter the new date and time." } };
  }
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if ((action === "decline" || action === "cancel") && !reason) {
    return { ok: false, errors: { reason: "Record a short reason." }, message: "A reason is required." };
  }
  try {
    await transitionAppointment(staff, id, action, {
      scheduledStart,
      reason: reason || undefined,
      location: formData.has("location") ? String(formData.get("location") ?? "") : undefined,
      rules: schedulingRules(settings),
      allowOutsideHours: formData.get("allowOutsideHours") === "on",
    });
  } catch (e) {
    if (e instanceof AppointmentError) return { ok: false, message: e.message };
    throw e;
  }
  await setFlash(MESSAGES[action]);
  redirect(`/admin/appointments/${id}`);
}

export async function linkAppointmentRecordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("appointments.manage");
  const id = String(formData.get("id") ?? "");
  const ref = String(formData.get("reference") ?? "").trim().toUpperCase();
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return { ok: false, message: "Appointment not found." };
  if (ref.startsWith("ENQ-")) {
    if (!can(staff, "enquiries.view")) return { ok: false, message: "You cannot link enquiries." };
    const enquiry = await prisma.enquiry.findUnique({ where: { reference: ref } });
    if (!enquiry) return { ok: false, errors: { reference: "No enquiry has that reference." } };
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id }, data: { enquiryId: enquiry.id, matterId: appt.matterId ?? enquiry.matterId } });
      await audit(staffActor(staff), { action: "appointment.linked", entityType: "Appointment", entityId: id, summary: `Linked to enquiry ${ref}` }, tx);
    });
  } else if (ref.startsWith("CW-")) {
    const matterRow = await prisma.matter.findUnique({ where: { reference: ref }, select: { id: true } });
    const matter = matterRow ? await findAccessibleMatter(staff, matterRow.id) : null;
    if (!matter) return { ok: false, errors: { reference: "No matter you can access has that reference." } };
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id }, data: { matterId: matter.id } });
      await audit(staffActor(staff), { action: "appointment.linked", entityType: "Appointment", entityId: id, summary: `Linked to matter ${ref}` }, tx);
    });
  } else {
    return { ok: false, errors: { reference: "Enter an enquiry (ENQ-…) or matter (CW-…) reference." } };
  }
  await setFlash("Appointment linked.");
  redirect(`/admin/appointments/${id}`);
}

export async function addAppointmentNoteAction(formData: FormData) {
  const staff = await requirePermission("appointments.manage");
  const id = String(formData.get("appointmentId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  const appt = await prisma.appointment.findUnique({ where: { id }, select: { reference: true } });
  if (!appt || !body) return;
  await prisma.$transaction(async (tx) => {
    await tx.note.create({ data: { body, appointmentId: id, authorId: staff.id } });
    await audit(staffActor(staff), { action: "appointment.note_added", entityType: "Appointment", entityId: id, summary: `Note added to ${appt.reference}` }, tx);
  });
  await setFlash("Note added.");
  revalidatePath(`/admin/appointments/${id}`);
}

const createSchema = z.object({
  characterName: characterNameSchema,
  contactDetails: z.string().trim().max(200),
  preferredContact: z.string().trim().max(60),
  attorneyId: z.string().max(40),
  consultationType: z.string().trim().min(1).max(80),
  start: z.string().min(1, "Choose a date and time."),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  location: z.string().trim().max(200),
  reason: z.string().trim().min(3, "Add a short reason.").max(2000),
});

/** Staff booking (for example, taken over the phone). Created as confirmed. */
export async function createAppointmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("appointments.manage");
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;
  const settings = await getSettings();
  const start = fromLocalInput(d.start, settings.timezone);
  if (!start || start.getTime() < Date.now()) return { ok: false, errors: { start: "Choose a future date and time." } };
  const attorneyId = d.attorneyId || null;
  if (attorneyId && !(await prisma.staffProfile.findUnique({ where: { id: attorneyId } }))) {
    return { ok: false, errors: { attorneyId: "Unknown attorney." } };
  }
  const conflict = await findConflict(attorneyId, start, d.durationMinutes);
  if (conflict) return { ok: false, errors: { start: `Overlaps ${conflict.reference} for the same attorney.` } };

  const appt = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        reference: randomReference("APT"),
        characterName: d.characterName,
        contactDetails: d.contactDetails,
        preferredContact: d.preferredContact,
        attorneyId,
        consultationType: d.consultationType,
        requestedStart: start,
        scheduledStart: start,
        durationMinutes: d.durationMinutes,
        location: d.location,
        reason: d.reason,
        status: "CONFIRMED",
        handledById: staff.id,
        contentHash: contentFingerprint([d.characterName, start.toISOString(), d.reason, "staff"]),
      },
    });
    await audit(staffActor(staff), { action: "appointment.created", entityType: "Appointment", entityId: created.id, summary: `Booked ${created.reference} for ${d.characterName}` }, tx);
    return created;
  });
  await setFlash(`Appointment ${appt.reference} booked.`);
  redirect(`/admin/appointments/${appt.id}`);
}
