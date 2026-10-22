"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { slugify, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { setFlash } from "@/server/flash";

const schema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(5, "Write the question.").max(300),
  answer: z.string().trim().min(5, "Write the answer.").max(5000),
  categoryId: z.string().max(40),
  practiceAreaId: z.string().max(40),
});

export async function saveFaqAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("content.faqs");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;
  const data = {
    question: d.question,
    answer: d.answer,
    categoryId: d.categoryId || null,
    practiceAreaId: d.practiceAreaId || null,
    isPublished: formData.get("isPublished") === "on",
  };
  const faq = d.id
    ? await prisma.faq.update({ where: { id: d.id }, data })
    : await prisma.faq.create({ data: { ...data, sortOrder: ((await prisma.faq.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1 } });
  await audit(staffActor(staff), { action: d.id ? "faq.updated" : "faq.created", entityType: "Faq", entityId: faq.id, summary: `${d.id ? "Updated" : "Added"} FAQ: ${faq.question.slice(0, 80)}` });
  await setFlash("FAQ saved.");
  redirect("/admin/content/faqs");
}

export async function faqOpAction(formData: FormData) {
  const staff = await requirePermission("content.faqs");
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const faq = await prisma.faq.findUnique({ where: { id } });
  if (!faq) return redirect("/admin/content/faqs");
  if (op === "up" || op === "down") {
    const siblings = await prisma.faq.findMany({
      where: { categoryId: faq.categoryId, practiceAreaId: faq.practiceAreaId, archivedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    const i = siblings.findIndex((s) => s.id === id);
    const j = op === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < siblings.length) {
      [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
      await prisma.$transaction(siblings.map((s, idx) => prisma.faq.update({ where: { id: s.id }, data: { sortOrder: idx } })));
    }
  } else if (op === "toggle") {
    await prisma.faq.update({ where: { id }, data: { isPublished: !faq.isPublished } });
    await setFlash(faq.isPublished ? "FAQ hidden." : "FAQ published.");
  } else if (op === "archive") {
    await prisma.faq.update({ where: { id }, data: { archivedAt: faq.archivedAt ? null : new Date() } });
    await setFlash(faq.archivedAt ? "FAQ restored." : "FAQ archived.");
  } else return redirect("/admin/content/faqs");
  await audit(staffActor(staff), { action: `faq.${op}`, entityType: "Faq", entityId: id, summary: `FAQ "${faq.question.slice(0, 60)}": ${op}` });
  redirect(`/admin/content/faqs${faq.archivedAt && op !== "archive" ? "?archived=1" : ""}`);
}

export async function faqCategoryAction(formData: FormData) {
  const staff = await requirePermission("content.faqs");
  const op = String(formData.get("op") ?? "");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (op === "delete" && id) {
    await prisma.faqCategory.delete({ where: { id } });
    await setFlash("Category deleted. Its questions are now uncategorised.");
  } else if (name.length >= 2) {
    const slug = slugify(name);
    if (await prisma.faqCategory.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) {
      await setFlash("A category with that name already exists.", "error");
      redirect("/admin/content/faqs");
    }
    if (id) await prisma.faqCategory.update({ where: { id }, data: { name, slug } });
    else await prisma.faqCategory.create({ data: { name, slug, sortOrder: await prisma.faqCategory.count() } });
    await setFlash("Category saved.");
  }
  await audit(staffActor(staff), { action: `faq_category.${op || "save"}`, entityType: "FaqCategory", entityId: id || null, summary: `FAQ category ${op === "delete" ? "deleted" : `saved: ${name}`}` });
  redirect("/admin/content/faqs");
}
