import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { publicStaffWhere, publishedArticleWhere } from "@/server/public";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const [areas, people, articles, vacancies] = await Promise.all([
    prisma.practiceArea.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    prisma.staffProfile.findMany({ where: publicStaffWhere, select: { slug: true, updatedAt: true } }),
    prisma.article.findMany({ where: publishedArticleWhere(), select: { slug: true, updatedAt: true } }),
    prisma.vacancy.findMany({ where: { status: "OPEN" }, select: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = ["", "/about", "/practice-areas", "/people", "/news", "/faq", "/careers", "/contact", "/enquiry", "/consultation", "/privacy", "/terms", "/disclaimer"];
  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const })),
    ...areas.map((a) => ({ url: `${base}/practice-areas/${a.slug}`, lastModified: a.updatedAt })),
    ...people.map((p) => ({ url: `${base}/people/${p.slug}`, lastModified: p.updatedAt })),
    ...articles.map((a) => ({ url: `${base}/news/${a.slug}`, lastModified: a.updatedAt })),
    ...vacancies.map((v) => ({ url: `${base}/careers/${v.slug}`, lastModified: v.updatedAt })),
  ];
}
