"use server";

import type { ApplicationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { APPLICATION_STATUS_LABELS } from "@/lib/labels";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { setFlash } from "@/server/flash";

const schema = z.object({
  id: z.string().min(1),
  status: z.enum(Object.keys(APPLICATION_STATUS_LABELS) as [ApplicationStatus, ...ApplicationStatus[]]),
  decision: z.string().trim().max(2000),
});

const DECIDED: ApplicationStatus[] = ["OFFERED", "HIRED", "UNSUCCESSFUL", "WITHDRAWN"];

export async function updateApplicationAction(formData: FormData) {
  const staff = await requirePermission("recruitment.manage");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    await setFlash("Invalid values.", "error");
    return;
  }
  const { id, status, decision } = parsed.data;
  const before = await prisma.application.findUnique({ where: { id } });
  if (!before) return;
  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id },
      data: { status, decision, decidedAt: DECIDED.includes(status) ? (before.decidedAt ?? new Date()) : null },
    });
    const parts = [];
    if (before.status !== status) parts.push(`status ${APPLICATION_STATUS_LABELS[before.status]} → ${APPLICATION_STATUS_LABELS[status]}`);
    if (before.decision !== decision) parts.push("decision recorded");
    await audit(staffActor(staff), { action: "application.updated", entityType: "Application", entityId: id, summary: `${before.reference}: ${parts.join("; ") || "saved"}` }, tx);
  });
  await setFlash("Application updated.");
  revalidatePath(`/admin/recruitment/${id}`);
}

export async function archiveApplicationAction(formData: FormData) {
  const staff = await requirePermission("recruitment.manage");
  const id = String(formData.get("id") ?? "");
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return;
  const archive = !app.archivedAt;
  await prisma.$transaction(async (tx) => {
    await tx.application.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
    await audit(staffActor(staff), { action: archive ? "application.archived" : "application.restored", entityType: "Application", entityId: id, summary: `${app.reference} ${archive ? "archived" : "restored"}` }, tx);
  });
  await setFlash(archive ? "Application archived." : "Application restored.");
  revalidatePath(`/admin/recruitment/${id}`);
}

export async function addApplicationNoteAction(formData: FormData) {
  const staff = await requirePermission("recruitment.manage");
  const id = String(formData.get("applicationId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  const app = await prisma.application.findUnique({ where: { id }, select: { reference: true } });
  if (!app || !body) return;
  await prisma.$transaction(async (tx) => {
    await tx.note.create({ data: { body, applicationId: id, authorId: staff.id } });
    await audit(staffActor(staff), { action: "application.note_added", entityType: "Application", entityId: id, summary: `Note added to ${app.reference}` }, tx);
  });
  await setFlash("Note added.");
  revalidatePath(`/admin/recruitment/${id}`);
}
