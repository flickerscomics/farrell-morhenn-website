"use server";

import type { ArticleType } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ARTICLE_TYPE_LABELS } from "@/lib/labels";
import { fromLocalInput } from "@/lib/time";
import { slugify, slugSchema, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { can, requirePermission } from "@/server/auth";
import { checkboxIds, resolveImage } from "@/server/content-helpers";
import { setFlash } from "@/server/flash";
import { getSettings } from "@/server/settings";

const schema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Add a title.").max(200),
  slug: slugSchema,
  summary: z.string().trim().min(10, "Write a short summary.").max(400),
  body: z.string().trim().min(20, "The article body is too short.").max(60000),
  type: z.enum(Object.keys(ARTICLE_TYPE_LABELS) as [ArticleType, ...ArticleType[]]),
  categoryId: z.string().max(40),
  authorId: z.string().max(40),
  tags: z.string().max(400),
  metaDescription: z.string().trim().max(300),
  publishedAt: z.string().max(20).optional(),
});

export async function saveArticleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("content.articles");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;
  const existing = d.id ? await prisma.article.findUnique({ where: { id: d.id } }) : null;
  if (d.id && !existing) return { ok: false, message: "Article not found." };
  if (existing && existing.status !== "DRAFT" && !can(staff, "content.publish")) {
    return { ok: false, message: "Only editors who can publish may change a published or archived article. Ask an editor to unpublish it first." };
  }
  if (await prisma.article.findFirst({ where: { slug: d.slug, NOT: d.id ? { id: d.id } : undefined } })) {
    return { ok: false, errors: { slug: "Another article already uses this slug." } };
  }
  if (d.categoryId && !(await prisma.articleCategory.findUnique({ where: { id: d.categoryId } }))) return { ok: false, errors: { categoryId: "Unknown category." } };
  if (d.authorId && !(await prisma.staffProfile.findUnique({ where: { id: d.authorId } }))) return { ok: false, errors: { authorId: "Unknown author." } };
  const image = await resolveImage(formData, "featuredImage", { purpose: "ARTICLE_IMAGE", uploadedById: staff.id, altText: d.title, maxEdge: 1800 });
  if (!image.ok) return { ok: false, errors: { featuredImageFile: image.error } };

  const settings = await getSettings();
  const tags = [...new Set(d.tags.split(",").map((t) => slugify(t).replace(/-/g, " ").trim()).filter(Boolean))].slice(0, 12);
  const practiceAreaIds = checkboxIds(formData, "practiceAreaIds");
  let publishedAt = existing?.publishedAt ?? null;
  if (can(staff, "content.publish") && d.publishedAt !== undefined) publishedAt = d.publishedAt ? fromLocalInput(d.publishedAt, settings.timezone) : publishedAt;

  const data = {
    title: d.title,
    slug: d.slug,
    summary: d.summary,
    body: d.body,
    type: d.type,
    categoryId: d.categoryId || null,
    authorId: d.authorId || null,
    tags,
    metaDescription: d.metaDescription,
    isFeatured: formData.get("isFeatured") === "on",
    featuredImageId: image.id,
    publishedAt,
    practiceAreas: { set: practiceAreaIds.map((id) => ({ id })) },
  };
  const article = existing
    ? await prisma.article.update({ where: { id: existing.id }, data })
    : await prisma.article.create({ data: { ...data, status: "DRAFT", practiceAreas: { connect: practiceAreaIds.map((id) => ({ id })) } } });
  await audit(staffActor(staff), {
    action: existing ? "article.updated" : "article.created",
    entityType: "Article",
    entityId: article.id,
    summary: `${existing ? "Edited" : "Drafted"} article "${article.title}"`,
  });
  await setFlash("Article saved.");
  redirect(`/admin/content/articles/${article.id}`);
}

export async function articleStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("content.publish");
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return { ok: false, message: "Article not found." };
  if (op === "publish") {
    if (article.type === "CASE_ANNOUNCEMENT" && formData.get("confirmAnonymised") !== "on") {
      return { ok: false, message: "Confirm that the announcement contains no client names or confidential details before publishing." };
    }
    await prisma.article.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: article.publishedAt ?? new Date() } });
  } else if (op === "unpublish") {
    await prisma.article.update({ where: { id }, data: { status: "DRAFT" } });
  } else if (op === "archive") {
    await prisma.article.update({ where: { id }, data: { status: "ARCHIVED" } });
  } else if (op === "delete") {
    await prisma.article.delete({ where: { id } });
    await audit(staffActor(staff), { action: "article.deleted", entityType: "Article", entityId: id, summary: `Deleted article "${article.title}"` });
    await setFlash("Article deleted.");
    redirect("/admin/content/articles");
  } else return { ok: false, message: "Unknown action." };
  await audit(staffActor(staff), { action: `article.${op}`, entityType: "Article", entityId: id, summary: `${({ publish: "Published", unpublish: "Unpublished", archive: "Archived" } as Record<string, string>)[op]} "${article.title}"` });
  await setFlash(op === "publish" ? "Article published." : op === "unpublish" ? "Article returned to draft." : "Article archived.");
  redirect(`/admin/content/articles/${id}`);
}

const categorySchema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(300) });

export async function categoryAction(formData: FormData) {
  const staff = await requirePermission("content.articles");
  const op = String(formData.get("op") ?? "");
  const id = String(formData.get("id") ?? "");
  if (op === "delete") {
    const cat = await prisma.articleCategory.findUnique({ where: { id } });
    if (cat) {
      await prisma.articleCategory.delete({ where: { id } });
      await audit(staffActor(staff), { action: "category.deleted", entityType: "ArticleCategory", entityId: id, summary: `Deleted category "${cat.name}"` });
      await setFlash("Category deleted. Its articles are now uncategorised.");
    }
    redirect("/admin/content/articles/categories");
  }
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    await setFlash("Category names need 2–80 characters.", "error");
    redirect("/admin/content/articles/categories");
  }
  const slug = slugify(parsed.data.name);
  if (await prisma.articleCategory.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) {
    await setFlash("A category with that name already exists.", "error");
    redirect("/admin/content/articles/categories");
  }
  if (id) await prisma.articleCategory.update({ where: { id }, data: { ...parsed.data, slug } });
  else await prisma.articleCategory.create({ data: { ...parsed.data, slug, sortOrder: await prisma.articleCategory.count() } });
  await audit(staffActor(staff), { action: id ? "category.updated" : "category.created", entityType: "ArticleCategory", entityId: id || null, summary: `${id ? "Updated" : "Created"} category "${parsed.data.name}"` });
  await setFlash("Category saved.");
  redirect("/admin/content/articles/categories");
}
