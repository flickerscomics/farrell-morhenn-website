import { describe, expect, it } from "vitest";
import { articles as allArticles, articleCategories } from "../content/articles";
import { faqCategories, faqs } from "../content/faqs";
import { pages } from "../content/pages";
import { people as allPeople } from "../content/people";
import { practiceAreas as allAreas } from "../content/practice-areas";
import { site } from "../content/site";
import { vacancies as allVacancies } from "../content/careers";
import { articles, isBookable, people, practiceAreas, relatedArticles, vacancies } from "@/lib/content";

// These checks catch broken references when the content files are edited.

const unique = (xs: string[]) => new Set(xs).size === xs.length;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const areaSlugs = new Set(allAreas.map((a) => a.slug));
const personSlugs = new Set(allPeople.map((p) => p.slug));

describe("content integrity", () => {
  it("uses unique, URL-safe slugs", () => {
    for (const list of [allAreas, allPeople, allArticles, allVacancies, pages]) {
      const slugs = list.map((x) => x.slug);
      expect(unique(slugs)).toBe(true);
      for (const s of slugs) expect(s).toMatch(SLUG);
    }
  });

  it("only references practice areas, people and categories that exist", () => {
    for (const p of allPeople) for (const a of p.practiceAreas) expect(areaSlugs.has(a), `${p.slug} → ${a}`).toBe(true);
    for (const a of allArticles) {
      for (const area of a.practiceAreas) expect(areaSlugs.has(area), `${a.slug} → ${area}`).toBe(true);
      if (a.author) expect(personSlugs.has(a.author), `${a.slug} author`).toBe(true);
      expect(articleCategories.some((c) => c.slug === a.category), `${a.slug} category`).toBe(true);
      expect(a.publishedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const f of faqs) {
      expect(faqCategories.some((c) => c.slug === f.category), f.question).toBe(true);
      if (f.practiceArea) expect(areaSlugs.has(f.practiceArea)).toBe(true);
    }
  });

  it("has every page the site renders", () => {
    for (const slug of ["home", "about", "careers", "contact", "privacy", "terms", "disclaimer"]) {
      expect(pages.some((p) => p.slug === slug), slug).toBe(true);
    }
  });

  it("has valid office hours and brand colours", () => {
    expect(site.officeHours).toHaveLength(7);
    for (const d of site.officeHours) if (!d.closed) expect(d.open < d.close).toBe(true);
    expect(site.colorPrimary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(site.colorAccent).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("keeps internal Markdown links pointing at real pages", () => {
    const routes = new Set(["/", "/about", "/practice-areas", "/people", "/news", "/faq", "/careers", "/contact", "/privacy", "/terms", "/disclaimer"]);
    const texts = [...allArticles.map((a) => a.body), ...faqs.map((f) => f.answer), ...pages.flatMap((p) => [p.body, ...p.sections.map((s) => s.body)])];
    for (const t of texts) for (const m of t.matchAll(/\]\((\/[^)\s]*)\)/g)) expect(routes.has(m[1].replace(/\/$/, "") || "/"), m[1]).toBe(true);
  });
});

describe("visibility rules", () => {
  it("hides departed, inactive and unpublished people", () => {
    const shown = people().map((p) => p.slug);
    expect(shown).toContain("samuel-brandt"); // on leave: still shown
    expect(shown).not.toContain("robert-hale"); // departed and unpublished
  });

  it("does not let on-leave staff be booked", () => {
    expect(isBookable(people().find((p) => p.slug === "samuel-brandt")!)).toBe(false);
    expect(isBookable(people().find((p) => p.slug === "eleanor-calder")!)).toBe(true);
  });

  it("excludes drafts and future-dated articles", () => {
    const slugs = articles(new Date("2026-10-22T12:00:00Z")).map((a) => a.slug);
    expect(slugs).not.toContain("updated-office-hours-autumn");
    expect(articles(new Date("2026-09-20T12:00:00Z")).map((a) => a.slug)).toEqual(["dismissal-in-vehicle-search-matter"]);
  });

  it("hides draft vacancies and unpublished practice areas", () => {
    expect(vacancies().map((v) => v.slug)).not.toContain("investigator");
    expect(practiceAreas().every((a) => a.published !== false)).toBe(true);
  });

  it("finds related articles", () => {
    const a = articles().find((x) => x.slug === "traffic-stops-in-los-santos-what-to-expect")!;
    expect(relatedArticles(a).map((r) => r.slug)).toContain("dismissal-in-vehicle-search-matter");
  });
});
