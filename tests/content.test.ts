import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  articleCategories,
  articles,
  currentPressReleases,
  faqCategories,
  generalFaqs,
  isBookable,
  milestones,
  page,
  people,
  practiceAreas,
  pressCategories,
  pressRelease,
  pressReleases,
  relatedArticles,
  relatedReleases,
  site,
  vacancies,
} from "@/lib/content";

// These tests load the sample content in tests/fixtures/content (see
// vitest.config.ts), so the rules stay covered whatever the live site holds.
// The wording checks scan the real /content folder. The real content itself is
// validated by the build.

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
    expect(pressReleases().length).toBeGreaterThan(0);
    expect(pressCategories.length).toBeGreaterThan(0);
    expect(site.press.boilerplate).toContain("About Farrell-Morhenn");
    for (const slug of ["home", "about", "careers", "contact", "privacy", "terms", "disclaimer"]) expect(page(slug).title).toBeTruthy();
  });

  it("lists the partners", () => {
    const partners = people().filter((p) => p.role === "MANAGING_PARTNER" || p.role === "PARTNER");
    expect(partners.map((p) => `${p.fullName}, ${p.title}`)).toEqual(["Marty Farrell, Managing Partner", "Gideon Morhenn, Partner"]);
  });

  it("reads like a real firm's website (no out-of-character wording)", () => {
    const banned = /in[- ]character|out[- ]of[- ]character|\bOOC\b|roleplay|role-play|fictional|GTA|real[- ]world|in-game|forum private message|Calder|Whitmore/i;
    for (const file of filesUnder(path.join(process.cwd(), "content"))) {
      // Web addresses (with or without https://) aren't wording, so they may contain anything.
      const text = fs.readFileSync(file, "utf8").replace(/https?:\/\/\S+/g, "").replace(/\b[\w-]+(?:\.[\w-]+)+\/[^\s\]]*/g, "");
      expect(text.match(banned)?.[0], path.relative(process.cwd(), file)).toBeUndefined();
    }
  });

  it("keeps internal Markdown links pointing at real pages", () => {
    const routes = new Set(["/", "/about", "/practice-areas", "/people", "/news", "/faq", "/careers", "/contact", "/privacy", "/terms", "/disclaimer"]);
    const texts = filesUnder(path.join(process.cwd(), "content")).map((f) => fs.readFileSync(f, "utf8"));
    for (const t of texts) for (const m of t.matchAll(/\]\((\/[^)\s]*)\)/g)) expect(routes.has(m[1].replace(/\/$/, "") || "/"), m[1]).toBe(true);
  });

  it("keeps BBCode links to this site pointing at real pages", () => {
    const routes = new Set([
      "/", "/about", "/practice-areas", "/people", "/news", "/press", "/faq", "/careers", "/contact", "/privacy", "/terms", "/disclaimer",
      ...practiceAreas().map((a) => `/practice-areas/${a.slug}`),
      ...people().map((p) => `/people/${p.slug}`),
      ...articles().map((a) => `/news/${a.slug}`),
      ...pressReleases().map((r) => `/press/${r.slug}`),
    ]);
    const texts = filesUnder(path.resolve(process.env.CONTENT_DIR ?? "content")).map((f) => [f, fs.readFileSync(f, "utf8")] as const);
    for (const [f, t] of texts) {
      for (const m of t.matchAll(/\[url=(\/[^\]\s]*)\]/gi)) {
        expect(routes.has(m[1].replace(/[?#].*$/, "").replace(/\/$/, "") || "/"), `${path.relative(process.cwd(), f)} links to ${m[1]}`).toBe(true);
      }
    }
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
    expect(isBookable(people().find((p) => p.slug === "nina-bernardi")!)).toBe(true);
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

describe("press releases", () => {
  it("hides drafts and keeps archived releases out of the list but online", () => {
    expect(pressRelease("winter-community-fund")).toBeUndefined();
    expect(pressRelease("office-closure-independence-day")?.status).toBe("ARCHIVED");
    expect(currentPressReleases().map((r) => r.slug)).not.toContain("office-closure-independence-day");
  });

  it("publishes a release at its release time in the firm's time zone", () => {
    // 09:00 Pacific Daylight Time on 20 October 2026 is 16:00 UTC.
    expect(pressReleases().find((r) => r.slug === "family-law-team-expands")?.releaseAt).toBe("2026-10-20T16:00:00.000Z");
    const slugs = (iso: string) => pressReleases(new Date(iso)).map((r) => r.slug);
    expect(slugs("2026-10-20T15:59:00Z")).not.toContain("family-law-team-expands");
    expect(slugs("2026-10-20T16:00:00Z")).toContain("family-law-team-expands");
  });

  it("lists the newest first", () => {
    const dates = currentPressReleases().map((r) => r.releaseAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("puts chosen related releases first", () => {
    const r = pressRelease("paleto-bay-legal-clinics")!;
    expect(relatedReleases(r)[0]?.slug).toBe("family-law-team-expands");
  });
});
