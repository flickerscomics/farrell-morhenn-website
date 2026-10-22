"use server";

import type { MatterEventType, MatterStatus, Priority } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { MATTER_EVENT_LABELS, MATTER_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { fromLocalInput } from "@/lib/time";
import { emailSchema, slugify, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { can, requirePermission, type StaffActor } from "@/server/auth";
import { setFlash } from "@/server/flash";
import { createMatter, findAccessibleMatter, updateMatter, type MatterInput } from "@/server/services/matters";
import { getSettings } from "@/server/settings";
import { staffWith } from "@/server/staff-directory";
import { deleteStoredFile, isRealFile, prepareFile, persistFile, UploadError } from "@/server/uploads";

const matterSchema = z.object({
  title: z.string().trim().min(3, "Give the matter a title.").max(160),
  clientName: z.string().trim().min(2, "Enter the client's (character) name.").max(120),
  clientContact: z.string().trim().max(200),
  practiceAreaId: z.string().max(40),
  leadAttorneyId: z.string().max(40),
  description: z.string().trim().max(10000),
  status: z.enum(Object.keys(MATTER_STATUS_LABELS) as [MatterStatus, ...MatterStatus[]]),
  priority: z.enum(Object.keys(PRIORITY_LABELS) as [Priority, ...Priority[]]),
  followUpAt: z.string().max(20),
});

async function parseMatter(staff: StaffActor, formData: FormData): Promise<{ ok: true; input: MatterInput } | { ok: false; state: FormState }> {
  const parsed = matterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, state: { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." } };
  const d = parsed.data;
  if (d.status === "ARCHIVED" && !can(staff, "matters.archive")) {
    return { ok: false, state: { ok: false, errors: { status: "You do not have permission to archive matters." } } };
  }
  const team = await staffWith("matters.view_assigned", "matters.view_all");
  const teamIds = new Set(team.map((t) => t.id));
  if (d.leadAttorneyId && !teamIds.has(d.leadAttorneyId)) {
    return { ok: false, state: { ok: false, errors: { leadAttorneyId: "Choose a staff member who can work on matters." } } };
  }
  const memberIds = formData.getAll("memberIds").map(String).filter((id) => teamIds.has(id));
  if (d.practiceAreaId && !(await prisma.practiceArea.findUnique({ where: { id: d.practiceAreaId } }))) {
    return { ok: false, state: { ok: false, errors: { practiceAreaId: "Unknown practice area." } } };
  }
  const settings = await getSettings();
  return {
    ok: true,
    input: {
      title: d.title,
      clientName: d.clientName,
      clientContact: d.clientContact,
      practiceAreaId: d.practiceAreaId || null,
      leadAttorneyId: d.leadAttorneyId || null,
      description: d.description,
      status: d.status,
      priority: d.priority,
      isRestricted: formData.get("isRestricted") === "on",
      followUpAt: fromLocalInput(d.followUpAt, settings.timezone),
      memberIds,
    },
  };
}

export async function createMatterAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("matters.create");
  const result = await parseMatter(staff, formData);
  if (!result.ok) return result.state;
  const input = result.input;
  // Make sure the creator can see the matter they just opened.
  if (input.leadAttorneyId !== staff.id && !input.memberIds.includes(staff.id) && !can(staff, "matters.view_all")) {
    input.memberIds.push(staff.id);
  }
  const matter = await createMatter(staff, input);
  await setFlash(`Matter ${matter.reference} opened.`);
  redirect(`/admin/matters/${matter.id}`);
}

export async function updateMatterAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("matters.edit");
  const id = String(formData.get("id") ?? "");
  const existing = await findAccessibleMatter(staff, id);
  if (!existing) return { ok: false, message: "Matter not found." };
  const result = await parseMatter(staff, formData);
  if (!result.ok) return result.state;
  if (existing.status === "ARCHIVED" && result.input.status !== "ARCHIVED" && !can(staff, "matters.archive")) {
    return { ok: false, errors: { status: "Only staff who can archive matters can reopen them." } };
  }
  await updateMatter(staff, id, result.input);
  await setFlash("Matter updated.");
  redirect(`/admin/matters/${id}`);
}

/** Loads a matter the actor can access, or redirects away. */
async function accessible(staff: StaffActor, id: string) {
  const matter = await findAccessibleMatter(staff, id);
  if (!matter) redirect("/admin/matters");
  return matter;
}

const eventSchema = z.object({
  matterId: z.string().min(1),
  type: z.enum(Object.keys(MATTER_EVENT_LABELS) as [MatterEventType, ...MatterEventType[]]),
  title: z.string().trim().min(2, "Add a title.").max(160),
  body: z.string().trim().max(5000),
  occursAt: z.string().min(1, "Choose a date and time."),
});

export async function addMatterEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("matters.edit");
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const matter = await accessible(staff, parsed.data.matterId);
  const settings = await getSettings();
  const occursAt = fromLocalInput(parsed.data.occursAt, settings.timezone);
  if (!occursAt) return { ok: false, errors: { occursAt: "Enter a valid date and time." } };
  const isDeadline = formData.get("isDeadline") === "on" || parsed.data.type === "DEADLINE";
  await prisma.$transaction(async (tx) => {
    await tx.matterEvent.create({
      data: {
        matterId: matter.id,
        type: parsed.data.type,
        title: parsed.data.title,
        body: parsed.data.body,
        occursAt,
        isDeadline,
        clientVisible: formData.get("clientVisible") === "on",
        authorId: staff.id,
      },
    });
    await audit(staffActor(staff), { action: "matter.event_added", entityType: "Matter", entityId: matter.id, summary: `${MATTER_EVENT_LABELS[parsed.data.type]} added to ${matter.reference}: ${parsed.data.title}` }, tx);
  });
  await setFlash("Timeline updated.");
  redirect(`/admin/matters/${matter.id}#timeline`);
}

export async function matterEventOpAction(formData: FormData) {
  const staff = await requirePermission("matters.edit");
  const eventId = String(formData.get("eventId") ?? "");
  const op = String(formData.get("op") ?? "");
  const event = await prisma.matterEvent.findUnique({ where: { id: eventId } });
  if (!event) return;
  const matter = await accessible(staff, event.matterId);
  await prisma.$transaction(async (tx) => {
    if (op === "complete") await tx.matterEvent.update({ where: { id: eventId }, data: { completedAt: event.completedAt ? null : new Date() } });
    else if (op === "toggle-client") await tx.matterEvent.update({ where: { id: eventId }, data: { clientVisible: !event.clientVisible } });
    else if (op === "delete") await tx.matterEvent.delete({ where: { id: eventId } });
    else return;
    await audit(staffActor(staff), { action: `matter.event_${op}`, entityType: "Matter", entityId: matter.id, summary: `Timeline entry "${event.title}" on ${matter.reference}: ${op.replace("-", " ")}` }, tx);
  });
  await setFlash("Timeline updated.");
  revalidatePath(`/admin/matters/${matter.id}`);
}

export async function addMatterNoteAction(formData: FormData) {
  const staff = await requirePermission("matters.notes");
  const matter = await accessible(staff, String(formData.get("matterId") ?? ""));
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  if (!body) return;
  await prisma.$transaction(async (tx) => {
    await tx.note.create({ data: { body, matterId: matter.id, authorId: staff.id } });
    await audit(staffActor(staff), { action: "matter.note_added", entityType: "Matter", entityId: matter.id, summary: `Private note added to ${matter.reference}` }, tx);
  });
  await setFlash("Note added.");
  revalidatePath(`/admin/matters/${matter.id}`);
}

const DOC_TYPES = ["application/pdf", "text/plain", "image/jpeg", "image/png", "image/webp"] as const;

export async function uploadMatterDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("matters.documents");
  const matter = await accessible(staff, String(formData.get("matterId") ?? ""));
  const file = formData.get("file");
  if (!isRealFile(file)) return { ok: false, errors: { file: "Choose a file to upload." } };
  try {
    const prepared = await prepareFile(file, DOC_TYPES);
    await prisma.$transaction(async (tx) => {
      const upload = await persistFile(
        prepared,
        {
          visibility: "PRIVATE",
          purpose: "MATTER_DOCUMENT",
          matterId: matter.id,
          uploadedById: staff.id,
          clientVisible: formData.get("clientVisible") === "on",
          altText: String(formData.get("description") ?? "").slice(0, 200),
        },
        tx,
      );
      await audit(staffActor(staff), { action: "matter.document_uploaded", entityType: "Matter", entityId: matter.id, summary: `Uploaded ${upload.originalName} to ${matter.reference}` }, tx);
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, errors: { file: e.message } };
    throw e;
  }
  await setFlash("Document uploaded.");
  redirect(`/admin/matters/${matter.id}#documents`);
}

export async function matterDocumentOpAction(formData: FormData) {
  const staff = await requirePermission("matters.documents");
  const uploadId = String(formData.get("uploadId") ?? "");
  const op = String(formData.get("op") ?? "");
  const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
  if (!upload?.matterId) return;
  const matter = await accessible(staff, upload.matterId);
  if (op === "toggle-client") {
    await prisma.upload.update({ where: { id: uploadId }, data: { clientVisible: !upload.clientVisible } });
    await audit(staffActor(staff), { action: "matter.document_visibility", entityType: "Matter", entityId: matter.id, summary: `${upload.originalName} ${upload.clientVisible ? "hidden from" : "shared with"} the client` });
  } else if (op === "delete") {
    await prisma.upload.delete({ where: { id: uploadId } });
    await deleteStoredFile(upload.storageKey);
    await audit(staffActor(staff), { action: "matter.document_deleted", entityType: "Matter", entityId: matter.id, summary: `Deleted ${upload.originalName} from ${matter.reference}` });
  }
  await setFlash("Documents updated.");
  revalidatePath(`/admin/matters/${matter.id}`);
}

export async function linkClientAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("clients.manage");
  const matter = await findAccessibleMatter(staff, String(formData.get("matterId") ?? ""));
  if (!matter) return { ok: false, message: "Matter not found." };
  const raw = String(formData.get("email") ?? "").trim();
  if (!raw) {
    await prisma.matter.update({ where: { id: matter.id }, data: { clientAccountId: null } });
    await audit(staffActor(staff), { action: "matter.client_unlinked", entityType: "Matter", entityId: matter.id, summary: `Portal access removed from ${matter.reference}` });
    await setFlash("Client portal access removed.");
    redirect(`/admin/matters/${matter.id}`);
  }
  const email = emailSchema.safeParse(raw);
  if (!email.success) return { ok: false, errors: { email: "Enter the client's portal email address." } };
  const account = await prisma.clientAccount.findUnique({ where: { email: email.data } });
  if (!account) return { ok: false, errors: { email: "No portal account uses that email. Ask the client to register first." } };
  await prisma.matter.update({ where: { id: matter.id }, data: { clientAccountId: account.id } });
  await audit(staffActor(staff), { action: "matter.client_linked", entityType: "Matter", entityId: matter.id, summary: `${matter.reference} shared with portal account ${account.email}` });
  await setFlash(`Matter linked to ${account.characterName}'s portal account.`);
  redirect(`/admin/matters/${matter.id}`);
}

export async function staffMessageAction(formData: FormData) {
  const staff = await requirePermission("matters.edit");
  const matter = await accessible(staff, String(formData.get("matterId") ?? ""));
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  if (!body || !matter.clientAccountId) return;
  await prisma.$transaction(async (tx) => {
    await tx.matterMessage.create({ data: { matterId: matter.id, body, senderUserId: staff.id, readByStaffAt: new Date() } });
    await audit(staffActor(staff), { action: "matter.message_sent", entityType: "Matter", entityId: matter.id, summary: `Message sent to the client on ${matter.reference}` }, tx);
  });
  await setFlash("Message sent to the client.");
  revalidatePath(`/admin/matters/${matter.id}`);
}

/** Starts a draft public case announcement. No client details are copied. */
export async function draftCaseAnnouncementAction(formData: FormData) {
  const staff = await requirePermission("content.articles");
  const matter = await accessible(staff, String(formData.get("matterId") ?? ""));
  const base = slugify(`case-note-${matter.reference}`);
  const article = await prisma.article.create({
    data: {
      slug: `${base}-${Date.now().toString(36)}`,
      title: "Untitled case announcement",
      summary: "Write a short, anonymised summary.",
      body: "Describe the outcome without naming the client or revealing confidential information.",
      type: "CASE_ANNOUNCEMENT",
      status: "DRAFT",
      sourceMatterId: matter.id,
      practiceAreas: matter.practiceAreaId ? { connect: [{ id: matter.practiceAreaId }] } : undefined,
    },
  });
  await audit(staffActor(staff), { action: "article.drafted_from_matter", entityType: "Article", entityId: article.id, summary: `Draft case announcement started from ${matter.reference}` });
  await setFlash("Draft created. Remove anything that could identify the client before publishing.", "info");
  redirect(`/admin/content/articles/${article.id}`);
}
