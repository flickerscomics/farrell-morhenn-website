import type { MetadataRoute } from "next";
import { absoluteUrl, articles, currentPressReleases, people, practiceAreas, vacancies } from "@/lib/content";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = ["/", "/about/", "/practice-areas/", "/people/", "/news/", "/press/", "/faq/", "/careers/", "/contact/", "/privacy/", "/terms/", "/disclaimer/"];
  return [
    ...fixed.map((p) => ({ url: absoluteUrl(p) })),
    ...practiceAreas().map((a) => ({ url: absoluteUrl(`/practice-areas/${a.slug}/`) })),
    ...people().map((p) => ({ url: absoluteUrl(`/people/${p.slug}/`) })),
    ...articles().map((a) => ({ url: absoluteUrl(`/news/${a.slug}/`), lastModified: a.publishedOn })),
    ...currentPressReleases().map((r) => ({ url: absoluteUrl(`/press/${r.slug}/`), lastModified: r.updatedOn ?? r.releaseDate })),
    ...vacancies().map((v) => ({ url: absoluteUrl(`/careers/${v.slug}/`) })),
  ];
}
