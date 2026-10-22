import type { MetadataRoute } from "next";
import { absoluteUrl, articles, people, practiceAreas, vacancies } from "@/lib/content";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = ["/", "/about/", "/practice-areas/", "/people/", "/news/", "/faq/", "/careers/", "/contact/", "/privacy/", "/terms/", "/disclaimer/"];
  return [
    ...fixed.map((p) => ({ url: absoluteUrl(p) })),
    ...practiceAreas().map((a) => ({ url: absoluteUrl(`/practice-areas/${a.slug}/`) })),
    ...people().map((p) => ({ url: absoluteUrl(`/people/${p.slug}/`) })),
    ...articles().map((a) => ({ url: absoluteUrl(`/news/${a.slug}/`), lastModified: a.publishedOn })),
    ...vacancies().map((v) => ({ url: absoluteUrl(`/careers/${v.slug}/`) })),
  ];
}
