"use server";

import type { EnquiryStatus, Priority } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ENQUIRY_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { fromLocalInput } from "@/lib/time";
import { zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requireAllPermissions, requirePermission } from "@/server/auth";
import { setFlash } from "@/server/flash";
import { createMatter } from "@/server/services/matters";
import { getSettings } from "@/server/settings";
import { staffWith } from "@/server/staff-directory";

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(Object.keys(ENQUIRY_STATUS_LABELS) as [EnquiryStatus, ...EnquiryStatus[]]),
  priority: z.enum(Object.keys(PRIORITY_LABELS) as [Priority, ...Priority[]]),
  assignedToId: z.string().max(40),
  followUpAt: z.string().max(20),
});

export async function updateEnquiryAction(formData: FormData) {
  const staff = await requirePermission("enquiries.manage");
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    await setFlash("The enquiry could not be updated: invalid values.", "error");
    return;
  }
  const { id, status, priority, assignedToId, followUpAt } = parsed.data;
  const before = await prisma.enquiry.findUnique({ where: { id }, include: { assignedTo: { select: { name: true } } } });
  if (!before) return redirect("/admin/enquiries");

  let assignee: { id: string; name: string } | null = null;
  if (assignedToId) {
    assignee = (await staffWith("enquiries.manage")).find((u) => u.id === assignedToId) ?? null;
    if (!assignee) {
      await setFlash("That staff member cannot be assigned enquiries.", "error");
      return;
    }
  }
  const settings = await getSettings();
  const follow = followUpAt ? fromLocalInput(followUpAt, settings.timezone) : null;

  const changes: string[] = [];
  if (before.status !== status) changes.push(`status: ${ENQUIRY_STATUS_LABELS[before.status]} → ${ENQUIRY_STATUS_LABELS[status]}`);
  if (before.priority !== priority) changes.push(`priority: ${PRIORITY_LABELS[before.priority]} → ${PRIORITY_LABELS[priority]}`);
  if (before.assignedToId !== (assignee?.id ?? null)) changes.push(`assigned to ${assignee?.name ?? "nobody"}`);
  if ((before.followUpAt?.getTime() ?? null) !== (follow?.getTime() ?? null)) changes.push(follow ? "follow-up date set" : "follow-up cleared");

  if (!changes.length) {
    await setFlash("No changes to save.", "info");
    return;
  }
  const closing = status === "CLOSED" || status === "DECLINED";
  await prisma.$transaction(async (tx) => {
    await tx.enquiry.update({
      where: { id },
      data: { status, priority, assignedToId: assignee?.id ?? null, followUpAt: follow, closedAt: closing ? (before.closedAt ?? new Date()) : null },
    });
    await audit(staffActor(staff), { action: "enquiry.updated", entityType: "Enquiry", entityId: id, summary: `${before.reference}: ${changes.join("; ")}` }, tx);
  });
  await setFlash("Enquiry updated.");
  revalidatePath(`/admin/enquiries/${id}`);
}

export async function addEnquiryNoteAction(formData: FormData) {
  const staff = await requirePermission("enquiries.manage");
  const id = String(formData.get("enquiryId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  const enquiry = await prisma.enquiry.findUnique({ where: { id }, select: { id: true, reference: true } });
  if (!enquiry || !body) {
    await setFlash("Write a note before saving.", "error");
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.note.create({ data: { body, enquiryId: id, authorId: staff.id } });
    await audit(staffActor(staff), { action: "enquiry.note_added", entityType: "Enquiry", entityId: id, summary: `Note added to ${enquiry.reference}` }, tx);
  });
  await setFlash("Note added.");
  revalidatePath(`/admin/enquiries/${id}`);
}

const convertSchema = z.object({
  enquiryId: z.string().min(1),
  title: z.string().trim().min(3, "Give the matter a title.").max(160),
  leadAttorneyId: z.string().max(40),
  isRestricted: z.string().optional(),
});

export async function convertEnquiryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("matters.create");
  const parsed = convertSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const enquiry = await prisma.enquiry.findUnique({ where: { id: parsed.data.enquiryId } });
  if (!enquiry) return { ok: false, message: "Enquiry not found." };
  if (enquiry.matterId) return { ok: false, message: "This enquiry has already been converted." };
  const lawyers = await staffWith("matters.edit");
  const lead = parsed.data.leadAttorneyId ? lawyers.find((l) => l.id === parsed.data.leadAttorneyId) : null;
  if (parsed.data.leadAttorneyId && !lead) return { ok: false, errors: { leadAttorneyId: "Choose a staff member who can work on matters." } };

  const matter = await createMatter(
    staff,
    {
      title: parsed.data.title,
      clientName: enquiry.characterName,
      clientContact: enquiry.contactDetails,
      practiceAreaId: enquiry.practiceAreaId,
      leadAttorneyId: lead?.id ?? staff.id,
      description: `${enquiry.subject}\n\n${enquiry.description}`,
      status: "CONFLICT_CHECK_PENDING",
      priority: enquiry.priority,
      isRestricted: parsed.data.isRestricted === "on",
      followUpAt: enquiry.followUpAt,
      memberIds: [],
    },
    enquiry.id,
  );
  await setFlash(`Matter ${matter.reference} opened from ${enquiry.reference}.`);
  redirect(`/admin/matters/${matter.id}`);
}

export async function linkAppointmentAction(formData: FormData) {
  const staff = await requireAllPermissions("enquiries.manage", "appointments.manage");
  const enquiryId = String(formData.get("enquiryId") ?? "");
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const [enquiry, appointment] = await Promise.all([
    prisma.enquiry.findUnique({ where: { id: enquiryId }, select: { id: true, reference: true, matterId: true } }),
    prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, reference: true, enquiryId: true } }),
  ]);
  if (!enquiry || !appointment || appointment.enquiryId) {
    await setFlash("That appointment cannot be linked.", "error");
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id: appointment.id }, data: { enquiryId: enquiry.id, matterId: enquiry.matterId ?? undefined } });
    await audit(staffActor(staff), { action: "enquiry.appointment_linked", entityType: "Enquiry", entityId: enquiry.id, summary: `Linked ${appointment.reference} to ${enquiry.reference}` }, tx);
    await audit(staffActor(staff), { action: "appointment.linked", entityType: "Appointment", entityId: appointment.id, summary: `Linked to enquiry ${enquiry.reference}` }, tx);
  });
  await setFlash("Appointment linked.");
  revalidatePath(`/admin/enquiries/${enquiry.id}`);
}
