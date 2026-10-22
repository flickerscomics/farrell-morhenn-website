"use server";

import type { StaffRole, StaffStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { STAFF_ROLE_LABELS, STAFF_STATUS_LABELS } from "@/lib/labels";
import { slugSchema, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { checkboxIds, resolveImage } from "@/server/content-helpers";
import { setFlash } from "@/server/flash";

const optText = (max: number) => z.string().trim().max(max);

const schema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(2).max(120),
  slug: slugSchema,
  title: z.string().trim().min(2).max(120),
  role: z.enum(Object.keys(STAFF_ROLE_LABELS) as [StaffRole, ...StaffRole[]]),
  status: z.enum(Object.keys(STAFF_STATUS_LABELS) as [StaffStatus, ...StaffStatus[]]),
  shortBio: z.string().trim().min(10, "Write a short biography.").max(400),
  biography: optText(10000),
  background: optText(4000),
  qualifications: optText(2000),
  barAdmissions: optText(2000),
  languages: optText(300),
  notableCases: optText(4000),
  achievements: optText(4000),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.").max(200)]),
  phone: optText(60),
  joinedYear: z.union([z.literal(""), z.coerce.number().int().min(1950).max(2100)]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("content.staff");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;
  if (await prisma.staffProfile.findFirst({ where: { slug: d.slug, NOT: d.id ? { id: d.id } : undefined } })) {
    return { ok: false, errors: { slug: "Another profile already uses this slug." } };
  }
  const portrait = await resolveImage(formData, "portrait", { purpose: "PORTRAIT", uploadedById: staff.id, altText: `Portrait of ${d.fullName}`, maxEdge: 1000 });
  if (!portrait.ok) return { ok: false, errors: { portraitFile: portrait.error } };
  const areaIds = checkboxIds(formData, "practiceAreaIds");
  const data = {
    fullName: d.fullName,
    slug: d.slug,
    title: d.title,
    role: d.role,
    status: d.status,
    shortBio: d.shortBio,
    biography: d.biography,
    background: d.background,
    qualifications: d.qualifications,
    barAdmissions: d.barAdmissions,
    languages: d.languages.split(",").map((l) => l.trim()).filter(Boolean).slice(0, 10),
    notableCases: d.notableCases,
    achievements: d.achievements,
    email: d.email,
    phone: d.phone,
    joinedYear: d.joinedYear === "" ? null : d.joinedYear,
    sortOrder: d.sortOrder,
    portraitId: portrait.id,
    isPublished: formData.get("isPublished") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    isLeadership: formData.get("isLeadership") === "on",
    acceptsConsultations: formData.get("acceptsConsultations") === "on",
  };
  const profile = d.id
    ? await prisma.staffProfile.update({ where: { id: d.id }, data: { ...data, practiceAreas: { set: areaIds.map((id) => ({ id })) } } })
    : await prisma.staffProfile.create({ data: { ...data, practiceAreas: { connect: areaIds.map((id) => ({ id })) } } });
  await audit(staffActor(staff), {
    action: d.id ? "profile.updated" : "profile.created",
    entityType: "StaffProfile",
    entityId: profile.id,
    summary: `${d.id ? "Updated" : "Created"} profile for ${profile.fullName} (${STAFF_STATUS_LABELS[profile.status]})`,
  });
  await setFlash("Profile saved.");
  redirect("/admin/content/people");
}

export async function deleteProfileAction(formData: FormData) {
  const staff = await requirePermission("content.staff");
  const id = String(formData.get("id") ?? "");
  const profile = await prisma.staffProfile.findUnique({ where: { id } });
  if (!profile) return redirect("/admin/content/people");
  await prisma.staffProfile.delete({ where: { id } });
  await audit(staffActor(staff), { action: "profile.deleted", entityType: "StaffProfile", entityId: id, summary: `Deleted profile for ${profile.fullName}` });
  await setFlash("Profile deleted.");
  redirect("/admin/content/people");
}
