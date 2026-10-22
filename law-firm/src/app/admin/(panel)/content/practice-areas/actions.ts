"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { intakeConfigSchema } from "@/lib/intake";
import { lines, slugSchema, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { checkboxIds } from "@/server/content-helpers";
import { setFlash } from "@/server/flash";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  shortDescription: z.string().trim().min(10, "Write a short description.").max(400),
  overview: z.string().trim().max(20000),
  matterTypes: z.string().max(4000),
  services: z.string().max(4000),
  metaDescription: z.string().trim().max(300),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  intakeFields: z.string().max(20000),
});

export async function savePracticeAreaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("content.practice_areas");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;
  if (await prisma.practiceArea.findFirst({ where: { slug: d.slug, NOT: d.id ? { id: d.id } : undefined } })) {
    return { ok: false, errors: { slug: "Another practice area already uses this slug." } };
  }
  let rawFields: unknown;
  try {
    rawFields = JSON.parse(d.intakeFields || "[]");
  } catch {
    return { ok: false, errors: { intakeFields: "The intake questions could not be read." } };
  }
  const cleaned = Array.isArray(rawFields)
    ? rawFields.map((f) => ({ ...f, options: Array.isArray(f?.options) ? f.options.map((o: unknown) => String(o).trim()).filter(Boolean) : [] }))
    : rawFields;
  const intake = intakeConfigSchema.safeParse(cleaned);
  if (!intake.success) {
    return { ok: false, errors: { intakeFields: intake.error.issues[0]?.message ?? "Check the intake questions." }, message: "Check the intake questions." };
  }
  const attorneyIds = checkboxIds(formData, "attorneyIds");
  const data = {
    name: d.name,
    slug: d.slug,
    shortDescription: d.shortDescription,
    overview: d.overview,
    matterTypes: lines(d.matterTypes),
    services: lines(d.services),
    metaDescription: d.metaDescription,
    sortOrder: d.sortOrder,
    intakeFields: intake.data,
    isPublished: formData.get("isPublished") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  };
  const area = d.id
    ? await prisma.practiceArea.update({ where: { id: d.id }, data: { ...data, attorneys: { set: attorneyIds.map((id) => ({ id })) } } })
    : await prisma.practiceArea.create({ data: { ...data, attorneys: { connect: attorneyIds.map((id) => ({ id })) } } });
  await audit(staffActor(staff), {
    action: d.id ? "practice_area.updated" : "practice_area.created",
    entityType: "PracticeArea",
    entityId: area.id,
    summary: `${d.id ? "Updated" : "Created"} practice area "${area.name}"${area.isPublished ? "" : " (hidden)"}`,
  });
  await setFlash("Practice area saved.");
  redirect("/admin/content/practice-areas");
}

export async function practiceAreaOpAction(formData: FormData) {
  const staff = await requirePermission("content.practice_areas");
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const area = await prisma.practiceArea.findUnique({ where: { id } });
  if (!area) return redirect("/admin/content/practice-areas");
  if (op === "toggle") {
    await prisma.practiceArea.update({ where: { id }, data: { isPublished: !area.isPublished } });
    await audit(staffActor(staff), { action: "practice_area.visibility", entityType: "PracticeArea", entityId: id, summary: `${area.isPublished ? "Hid" : "Published"} "${area.name}"` });
    await setFlash(area.isPublished ? "Practice area hidden from the website." : "Practice area published.");
  } else if (op === "up" || op === "down") {
    const all = await prisma.practiceArea.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
    const i = all.findIndex((a) => a.id === id);
    const j = op === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < all.length) {
      [all[i], all[j]] = [all[j], all[i]];
      await prisma.$transaction(all.map((a, idx) => prisma.practiceArea.update({ where: { id: a.id }, data: { sortOrder: idx } })));
    }
  } else if (op === "delete") {
    const used = await prisma.practiceArea.findUnique({ where: { id }, select: { _count: { select: { enquiries: true, matters: true } } } });
    if (used && used._count.enquiries + used._count.matters > 0) {
      await setFlash("This practice area is referenced by enquiries or matters. Hide it instead of deleting it.", "error");
    } else {
      await prisma.practiceArea.delete({ where: { id } });
      await audit(staffActor(staff), { action: "practice_area.deleted", entityType: "PracticeArea", entityId: id, summary: `Deleted practice area "${area.name}"` });
      await setFlash("Practice area deleted.");
    }
  }
  redirect("/admin/content/practice-areas");
}
