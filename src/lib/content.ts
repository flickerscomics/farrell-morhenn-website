// Read-only access to the site content in /content, with the visibility
// rules applied in one place. Pages only ever use these helpers.

import {
  ContentError,
  loadArticleCategories,
  loadArticles,
  loadFaqs,
  loadMilestones,
  loadPages,
  loadPeople,
  loadPracticeAreas,
  loadPressCategories,
  loadPressReleases,
  loadSettings,
  loadVacancies,
} from "./load";
import type { Article, Person, PracticeArea, PressListItem, PressRelease } from "./types";
import { bbcodeToText } from "./bbcode";
import { SITE_URL } from "./env";

export type { Article, Person, PracticeArea, PressRelease };

// Loaded once per build.
export const site = loadSettings();
const allAreas = loadPracticeAreas().sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
const allPeople = loadPeople().sort((a, b) => a.order - b.order || a.fullName.localeCompare(b.fullName));
const allArticles = loadArticles();
const allVacancies = loadVacancies().sort((a, b) => a.order - b.order);
const pages = loadPages();
const faqData = loadFaqs();
export const faqCategories = faqData.categories;
const allFaqs = faqData.questions;
export const articleCategories = loadArticleCategories();
export const milestones = loadMilestones();
const allReleases = loadPressReleases(site.timezone, site.press.defaultLocation);
export const pressCategories = loadPressCategories();

// Cross-references are checked here so a typo fails the build with a clear message.
{
  const areas = new Set(allAreas.map((a) => a.slug));
  const peopleSlugs = new Set(allPeople.map((p) => p.slug));
  const unique = (label: string, slugs: string[]) => {
    const dup = slugs.find((s, i) => slugs.indexOf(s) !== i);
    if (dup) throw new ContentError(`Two ${label} share the slug "${dup}"`);
  };
  unique("practice areas", allAreas.map((a) => a.slug));
  unique("people", allPeople.map((p) => p.slug));
  unique("articles", allArticles.map((a) => a.slug));
  unique("vacancies", allVacancies.map((v) => v.slug));
  for (const p of allPeople) for (const a of p.practiceAreas) if (!areas.has(a)) throw new ContentError(`${p.fullName}: unknown practice area "${a}"`);
  for (const a of allArticles) {
    for (const area of a.practiceAreas) if (!areas.has(area)) throw new ContentError(`Article "${a.title}": unknown practice area "${area}"`);
    if (a.author && !peopleSlugs.has(a.author)) throw new ContentError(`Article "${a.title}": unknown author "${a.author}"`);
    if (!articleCategories.some((c) => c.slug === a.category)) throw new ContentError(`Article "${a.title}": unknown category "${a.category}"`);
  }
  unique("press releases", allReleases.map((r) => r.slug));
  const releaseSlugs = new Set(allReleases.map((r) => r.slug));
  for (const r of allReleases) {
    const where = `Press release "${r.title}"`;
    if (!pressCategories.some((c) => c.slug === r.category)) throw new ContentError(`${where}: unknown category "${r.category}"`);
    for (const area of r.practiceAreas) if (!areas.has(area)) throw new ContentError(`${where}: unknown practice area "${area}"`);
    for (const p of [...r.people, ...(r.mediaContact ? [r.mediaContact] : [])]) if (!peopleSlugs.has(p)) throw new ContentError(`${where}: unknown person "${p}"`);
    for (const other of r.related) if (!releaseSlugs.has(other)) throw new ContentError(`${where}: unknown related release "${other}"`);
  }
  for (const f of allFaqs) {
    if (!faqCategories.some((c) => c.slug === f.category)) throw new ContentError(`FAQ "${f.question}": unknown category "${f.category}"`);
    if (f.practiceArea && !areas.has(f.practiceArea)) throw new ContentError(`FAQ "${f.question}": unknown practice area "${f.practiceArea}"`);
  }
}

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path}`;
}

/** The firm's link-preview image (src/app/opengraph-image.jpg), for pages that set their own preview details. */
export function shareImages(image?: { url: string; alt?: string }) {
  return image ? [{ url: absoluteUrl(image.url), alt: image.alt }] : [{ url: absoluteUrl("/opengraph-image.jpg"), width: 1200, height: 630, alt: `${site.firmName}, attorneys at law` }];
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
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn))
    .map((a) => ({ ...a, authorName: authorOf(a)?.name ?? null }));
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

// ─── Press releases ─────────────────────────────────────────────────────────

/**
 * Every release with a page: not a draft and past its release time (archived
 * ones included, so old links keep working). Newest first.
 */
export function pressReleases(now = new Date()): PressRelease[] {
  const at = now.toISOString();
  return allReleases
    .filter((r) => r.status !== "DRAFT" && r.releaseAt <= at)
    .sort((a, b) => b.releaseAt.localeCompare(a.releaseAt) || a.title.localeCompare(b.title));
}

/** Releases for the press list, homepage and feed: archived ones are left out. */
export function currentPressReleases(now = new Date()) {
  return pressReleases(now).filter((r) => r.status !== "ARCHIVED");
}

export function pressRelease(slug: string) {
  return pressReleases().find((r) => r.slug === slug);
}

export function pressCategoryName(slug: string) {
  return pressCategories.find((c) => c.slug === slug)?.name ?? slug;
}

/** Chosen related releases first, then others sharing a category, tags, people or practice areas. */
export function relatedReleases(r: PressRelease, limit = 3) {
  const pool = currentPressReleases().filter((x) => x.slug !== r.slug);
  const chosen = r.related.map((s) => pool.find((x) => x.slug === s)).filter((x): x is PressRelease => !!x);
  const score = (b: PressRelease) =>
    (b.category === r.category ? 2 : 0) +
    b.tags.filter((t) => r.tags.includes(t)).length +
    b.people.filter((p) => r.people.includes(p)).length +
    b.practiceAreas.filter((p) => r.practiceAreas.includes(p)).length;
  const scored = pool
    .filter((b) => !chosen.includes(b) && score(b) > 0)
    .sort((x, y) => score(y) - score(x) || y.releaseAt.localeCompare(x.releaseAt));
  return [...chosen, ...scored].slice(0, limit);
}

/** The fields the press list sends to the browser. */
export function pressListItem(r: PressRelease): PressListItem {
  return {
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    summary: r.summary,
    category: r.category,
    categoryName: pressCategoryName(r.category),
    tags: r.tags,
    releaseDate: r.releaseDate,
    isFeatured: r.isFeatured,
    searchText: [r.title, r.subtitle, r.summary, r.tags.join(" "), bbcodeToText(r.body)].join(" "),
  };
}

/** Who journalists should contact about a release. */
export function mediaContactFor(r: PressRelease) {
  const p = r.mediaContact ? allPeople.find((x) => x.slug === r.mediaContact) : undefined;
  if (p) {
    return { name: p.fullName, title: p.title, email: p.email || site.press.contactEmail, phone: p.phone || site.press.contactPhone, slug: person(p.slug)?.slug ?? null };
  }
  return pressOffice();
}

/** The firm's press office, from firm settings. */
export function pressOffice(): { name: string; title: string; email: string; phone: string; slug: string | null } {
  const c = site.press;
  return { name: c.contactName, title: c.contactTitle, email: c.contactEmail, phone: c.contactPhone, slug: null };
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
