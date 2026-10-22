import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  articleCategories,
  articles,
  faqCategories,
  generalFaqs,
  isBookable,
  milestones,
  page,
  people,
  practiceAreas,
  relatedArticles,
  site,
  vacancies,
} from "@/lib/content";

// Loading @/lib/content already validates every file and cross-reference;
// these tests pin down the rules and catch wording that breaks immersion.

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? filesUnder(full) : [full];
  });
}

describe("content", () => {
  it("loads every section", () => {
    expect(site.firmName).toBe("Farrell-Morhenn");
    expect(practiceAreas().length).toBeGreaterThan(0);
    expect(people().length).toBeGreaterThan(0);
    expect(articles().length).toBeGreaterThan(0);
    expect(generalFaqs().length).toBeGreaterThan(0);
    expect(milestones.length).toBeGreaterThan(0);
    expect(articleCategories.length).toBeGreaterThan(0);
    expect(faqCategories.length).toBeGreaterThan(0);
    for (const slug of ["home", "about", "careers", "contact", "privacy", "terms", "disclaimer"]) expect(page(slug).title).toBeTruthy();
  });

  it("lists the partners", () => {
    const partners = people().filter((p) => p.role === "MANAGING_PARTNER" || p.role === "PARTNER");
    expect(partners.map((p) => `${p.fullName}, ${p.title}`)).toEqual(["Marty Farrell, Managing Partner", "Gideon Morhenn, Partner"]);
  });

  it("reads like a real firm's website (no out-of-character wording)", () => {
    const banned = /in[- ]character|out[- ]of[- ]character|\bOOC\b|roleplay|role-play|fictional|GTA|real[- ]world|in-game|forum private message|Calder|Whitmore/i;
    for (const file of filesUnder(path.join(process.cwd(), "content"))) {
      const text = fs.readFileSync(file, "utf8");
      expect(text.match(banned)?.[0], path.relative(process.cwd(), file)).toBeUndefined();
    }
  });

  it("keeps internal Markdown links pointing at real pages", () => {
    const routes = new Set(["/", "/about", "/practice-areas", "/people", "/news", "/faq", "/careers", "/contact", "/privacy", "/terms", "/disclaimer"]);
    const texts = filesUnder(path.join(process.cwd(), "content")).map((f) => fs.readFileSync(f, "utf8"));
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
    expect(isBookable(people().find((p) => p.slug === "daniela-reyes")!)).toBe(true);
  });

  it("excludes drafts and future-dated articles", () => {
    const slugs = articles(new Date("2026-10-22T12:00:00Z")).map((a) => a.slug);
    expect(slugs).not.toContain("updated-office-hours-autumn");
    expect(articles(new Date("2026-09-20T12:00:00Z")).map((a) => a.slug)).toEqual(["dismissal-in-vehicle-search-matter"]);
  });

  it("hides draft vacancies", () => {
    expect(vacancies().map((v) => v.slug)).not.toContain("investigator");
  });

  it("finds related articles", () => {
    const a = articles().find((x) => x.slug === "traffic-stops-in-los-santos-what-to-expect")!;
    expect(relatedArticles(a).map((r) => r.slug)).toContain("dismissal-in-vehicle-search-matter");
  });
});
