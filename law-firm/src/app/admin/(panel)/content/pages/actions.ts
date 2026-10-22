"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { setFlash } from "@/server/flash";

const sectionSchema = z.array(z.object({ heading: z.string().trim().max(160), body: z.string().max(20000) })).max(20);

const schema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  summary: z.string().trim().max(600),
  body: z.string().max(60000),
  metaDescription: z.string().trim().max(300),
  sections: z.string().max(200000),
});

export async function savePageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("content.pages");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  let sections: z.infer<typeof sectionSchema>;
  try {
    const result = sectionSchema.safeParse(JSON.parse(parsed.data.sections || "[]"));
    if (!result.success) return { ok: false, message: "Sections are invalid (max 20, headings up to 160 characters)." };
    sections = result.data.filter((s) => s.heading || s.body.trim());
  } catch {
    return { ok: false, message: "Sections could not be read." };
  }
  const page = await prisma.page.findUnique({ where: { id: parsed.data.id } });
  if (!page) return { ok: false, message: "Page not found." };
  // Core pages must stay published so navigation never breaks.
  const core = ["about", "privacy", "terms", "disclaimer", "home", "contact", "careers"].includes(page.slug);
  await prisma.page.update({
    where: { id: page.id },
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary,
      body: parsed.data.body,
      metaDescription: parsed.data.metaDescription,
      sections,
      isPublished: core ? true : formData.get("isPublished") === "on",
    },
  });
  await audit(staffActor(staff), { action: "page.updated", entityType: "Page", entityId: page.id, summary: `Edited page "${parsed.data.title}" (/${page.slug})` });
  await setFlash("Page saved.");
  redirect("/admin/content/pages");
}

const milestoneSchema = z.object({
  year: z.string().trim().min(1).max(20),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(600),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export async function milestoneAction(formData: FormData) {
  const staff = await requirePermission("content.pages");
  const op = String(formData.get("op") ?? "save");
  const id = String(formData.get("id") ?? "");
  if (op === "delete" && id) {
    await prisma.milestone.delete({ where: { id } });
    await audit(staffActor(staff), { action: "milestone.deleted", entityType: "Milestone", entityId: id, summary: "Deleted a milestone" });
    await setFlash("Milestone deleted.");
    redirect("/admin/content/pages");
  }
  const parsed = milestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    await setFlash("Milestones need a year and a title.", "error");
    redirect("/admin/content/pages");
  }
  const data = { ...parsed.data, isPublished: formData.get("isPublished") === "on" };
  if (id) await prisma.milestone.update({ where: { id }, data });
  else await prisma.milestone.create({ data });
  await audit(staffActor(staff), { action: id ? "milestone.updated" : "milestone.created", entityType: "Milestone", entityId: id || null, summary: `Milestone ${parsed.data.year}: ${parsed.data.title}` });
  await setFlash("Milestone saved.");
  redirect("/admin/content/pages");
}
