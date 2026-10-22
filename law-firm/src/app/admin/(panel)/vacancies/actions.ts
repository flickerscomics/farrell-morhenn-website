"use server";

import type { VacancyStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { VACANCY_STATUS_LABELS } from "@/lib/labels";
import { fromLocalInput } from "@/lib/time";
import { lines, slugSchema, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { setFlash } from "@/server/flash";
import { getSettings } from "@/server/settings";

const schema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3).max(120),
  slug: slugSchema,
  department: z.string().trim().max(80),
  employmentType: z.string().trim().max(80),
  summary: z.string().trim().min(10, "Write a short summary.").max(300),
  description: z.string().trim().max(8000),
  responsibilities: z.string().max(4000),
  requirements: z.string().max(4000),
  status: z.enum(Object.keys(VACANCY_STATUS_LABELS) as [VacancyStatus, ...VacancyStatus[]]),
  closesAt: z.string().max(20),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export async function saveVacancyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("content.vacancies");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;
  const clash = await prisma.vacancy.findFirst({ where: { slug: d.slug, NOT: d.id ? { id: d.id } : undefined } });
  if (clash) return { ok: false, errors: { slug: "Another vacancy already uses this slug." } };
  const settings = await getSettings();
  const existing = d.id ? await prisma.vacancy.findUnique({ where: { id: d.id } }) : null;
  const data = {
    title: d.title,
    slug: d.slug,
    department: d.department,
    employmentType: d.employmentType,
    summary: d.summary,
    description: d.description,
    responsibilities: lines(d.responsibilities),
    requirements: lines(d.requirements),
    status: d.status,
    closesAt: d.closesAt ? fromLocalInput(d.closesAt, settings.timezone) : null,
    sortOrder: d.sortOrder,
    publishedAt: d.status === "OPEN" ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
  };
  const vacancy = existing ? await prisma.vacancy.update({ where: { id: existing.id }, data }) : await prisma.vacancy.create({ data });
  await audit(staffActor(staff), {
    action: existing ? "vacancy.updated" : "vacancy.created",
    entityType: "Vacancy",
    entityId: vacancy.id,
    summary: `${existing ? "Updated" : "Created"} vacancy "${vacancy.title}" (${VACANCY_STATUS_LABELS[vacancy.status]})`,
  });
  await setFlash("Vacancy saved.");
  redirect("/admin/vacancies");
}

export async function deleteVacancyAction(formData: FormData) {
  const staff = await requirePermission("content.vacancies");
  const id = String(formData.get("id") ?? "");
  const vacancy = await prisma.vacancy.findUnique({ where: { id }, include: { _count: { select: { applications: true } } } });
  if (!vacancy) return redirect("/admin/vacancies");
  if (vacancy._count.applications > 0) {
    await setFlash("Vacancies with applications cannot be deleted. Close it instead.", "error");
    return redirect(`/admin/vacancies/${id}`);
  }
  await prisma.vacancy.delete({ where: { id } });
  await audit(staffActor(staff), { action: "vacancy.deleted", entityType: "Vacancy", entityId: id, summary: `Deleted vacancy "${vacancy.title}"` });
  await setFlash("Vacancy deleted.");
  redirect("/admin/vacancies");
}
