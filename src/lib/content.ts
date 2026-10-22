// Read-only access to the site content in /content, with the visibility
// rules applied in one place. Pages only ever use these helpers.

import { articleCategories, articles as allArticles } from "../../content/articles";
import { faqCategories, faqs as allFaqs } from "../../content/faqs";
import { milestones } from "../../content/milestones";
import { pages } from "../../content/pages";
import { people as allPeople } from "../../content/people";
import { practiceAreas as allAreas } from "../../content/practice-areas";
import { site } from "../../content/site";
import { vacancies as allVacancies } from "../../content/careers";
import type { Article, Person, PracticeArea } from "../../content/types";
import { SITE_URL } from "./env";

export { articleCategories, faqCategories, milestones, site };
export type { Article, Person, PracticeArea };

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path}`;
}

// ─── Practice areas ─────────────────────────────────────────────────────────

export function practiceAreas(): PracticeArea[] {
  return allAreas.filter((a) => a.published !== false);
}

export function featuredPracticeAreas(limit = 6) {
  const areas = practiceAreas();
  return [...areas.filter((a) => a.isFeatured), ...areas.filter((a) => !a.isFeatured)].slice(0, limit);
}

export function practiceArea(slug: string) {
  return practiceAreas().find((a) => a.slug === slug);
}

// ─── People ─────────────────────────────────────────────────────────────────

/** Published people who are active or on leave. Inactive and departed staff are hidden. */
export function people(): Person[] {
  return allPeople.filter((p) => p.published !== false && (p.status ?? "ACTIVE") !== "INACTIVE" && p.status !== "DEPARTED");
}

export function person(slug: string) {
  return people().find((p) => p.slug === slug);
}

export function peopleInArea(slug: string) {
  return people().filter((p) => p.practiceAreas.includes(slug));
}

export function isBookable(p: Person) {
  return (p.status ?? "ACTIVE") === "ACTIVE" && !!p.acceptsConsultations;
}

// ─── Articles ───────────────────────────────────────────────────────────────

/** Non-draft articles dated on or before the build date, newest first. */
export function articles(now = new Date()): Article[] {
  const today = now.toISOString().slice(0, 10);
  return allArticles
    .filter((a) => !a.draft && a.publishedOn <= today)
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
}

export function article(slug: string) {
  return articles().find((a) => a.slug === slug);
}

export function categoryName(slug: string) {
  return articleCategories.find((c) => c.slug === slug)?.name ?? slug;
}

export function relatedArticles(a: Article, limit = 3) {
  const score = (b: Article) =>
    (b.category === a.category ? 2 : 0) +
    b.tags.filter((t) => a.tags.includes(t)).length +
    b.practiceAreas.filter((p) => a.practiceAreas.includes(p)).length +
    (b.type === a.type ? 1 : 0);
  return articles()
    .filter((b) => b.slug !== a.slug && score(b) > 0)
    .sort((x, y) => score(y) - score(x) || y.publishedOn.localeCompare(x.publishedOn))
    .slice(0, limit);
}

export function authorOf(a: Article) {
  if (!a.author) return null;
  const visible = person(a.author);
  const any = allPeople.find((p) => p.slug === a.author);
  return any ? { name: any.fullName, slug: visible ? visible.slug : null } : null;
}

// ─── FAQs, pages, careers ───────────────────────────────────────────────────

export function generalFaqs() {
  return allFaqs.filter((f) => !f.practiceArea);
}

export function faqsForArea(slug: string) {
  return allFaqs.filter((f) => f.practiceArea === slug);
}

export function page(slug: string) {
  const p = pages.find((x) => x.slug === slug);
  if (!p) throw new Error(`Missing page content: ${slug}`);
  return p;
}

export function vacancies() {
  return allVacancies.filter((v) => v.status !== "DRAFT");
}

export function openVacancies(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return vacancies().filter((v) => v.status === "OPEN" && (!v.closesOn || v.closesOn >= today));
}

export function vacancy(slug: string) {
  return vacancies().find((v) => v.slug === slug);
}
