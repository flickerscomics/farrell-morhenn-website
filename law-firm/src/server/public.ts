import "server-only";
import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/db";

// Every public query lives here and selects fields explicitly, so internal
// data (notes, matter links, staff accounts) can never leak into a page.

export const publicStaffWhere: Prisma.StaffProfileWhereInput = {
  isPublished: true,
  status: { in: ["ACTIVE", "ON_LEAVE"] },
};

export function publishedArticleWhere(now = new Date()): Prisma.ArticleWhereInput {
  return { status: "PUBLISHED", publishedAt: { lte: now } };
}

export const staffCardSelect = {
  id: true,
  slug: true,
  fullName: true,
  title: true,
  role: true,
  status: true,
  shortBio: true,
  portraitId: true,
  acceptsConsultations: true,
  languages: true,
} satisfies Prisma.StaffProfileSelect;

export const articleCardSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  type: true,
  publishedAt: true,
  featuredImageId: true,
  tags: true,
  category: { select: { slug: true, name: true } },
  author: { select: { fullName: true, slug: true, isPublished: true, status: true } },
} satisfies Prisma.ArticleSelect;

export type ArticleCard = Prisma.ArticleGetPayload<{ select: typeof articleCardSelect }>;
export type StaffCard = Prisma.StaffProfileGetPayload<{ select: typeof staffCardSelect }>;

export const getPage = cache(async (slug: string) => {
  return prisma.page.findFirst({
    where: { slug, isPublished: true },
    select: { slug: true, title: true, summary: true, body: true, sections: true, metaDescription: true, updatedAt: true },
  });
});

export type PageSection = { heading: string; body: string };

export function pageSections(value: unknown): PageSection[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (s): s is PageSection => !!s && typeof s === "object" && typeof s.heading === "string" && typeof s.body === "string",
  );
}

export function publicAuthor(author: ArticleCard["author"]) {
  if (!author) return null;
  const visible = author.isPublished && (author.status === "ACTIVE" || author.status === "ON_LEAVE");
  return { name: author.fullName, slug: visible ? author.slug : null };
}

export function publishedPracticeAreas() {
  return prisma.practiceArea.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, shortDescription: true, isFeatured: true, intakeFields: true },
  });
}

/** Attorneys who can be chosen on enquiry and consultation forms. */
export function bookableAttorneys() {
  return prisma.staffProfile.findMany({
    where: { isPublished: true, status: "ACTIVE", acceptsConsultations: true },
    orderBy: [{ sortOrder: "asc" }],
    select: { id: true, slug: true, fullName: true, title: true, practiceAreas: { select: { id: true } } },
  });
}
