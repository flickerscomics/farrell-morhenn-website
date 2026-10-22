import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { parseOfficeHours, type OfficeHours } from "@/lib/time";
import { isSafeHref } from "@/lib/validation";

export type NavLink = { label: string; href: string };

export type HomeSections = {
  showPracticeAreas: boolean;
  showAttorneys: boolean;
  showProcess: boolean;
  showArticles: boolean;
  showCareers: boolean;
  showContact: boolean;
};

export const DEFAULT_HOME_SECTIONS: HomeSections = {
  showPracticeAreas: true,
  showAttorneys: true,
  showProcess: true,
  showArticles: true,
  showCareers: true,
  showContact: true,
};

export const DEFAULT_NAVIGATION: NavLink[] = [
  { label: "About", href: "/about" },
  { label: "Practice Areas", href: "/practice-areas" },
  { label: "People", href: "/people" },
  { label: "News & Insights", href: "/news" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

function parseLinks(value: unknown): NavLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (l): l is NavLink =>
        !!l && typeof l === "object" && typeof l.label === "string" && typeof l.href === "string",
    )
    .filter((l) => l.label.trim() && isSafeHref(l.href))
    .slice(0, 12);
}

function parseHomeSections(value: unknown): HomeSections {
  const obj = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_HOME_SECTIONS };
  for (const key of Object.keys(out) as (keyof HomeSections)[]) {
    if (typeof obj[key] === "boolean") out[key] = obj[key] as boolean;
  }
  return out;
}

export type Settings = Awaited<ReturnType<typeof loadSettings>>;

async function loadSettings() {
  const row = await prisma.siteSettings.findUnique({
    where: { id: 1 },
    include: { logo: { select: { id: true, storageKey: true, visibility: true, altText: true } } },
  });
  if (!row) {
    throw new Error("Site settings are missing. Run `npm run db:seed` to initialise the database.");
  }
  const navigation = parseLinks(row.navigation);
  return {
    ...row,
    officeHours: parseOfficeHours(row.officeHours) as OfficeHours,
    navigation: navigation.length ? navigation : DEFAULT_NAVIGATION,
    socialLinks: parseLinks(row.socialLinks),
    homeSections: parseHomeSections(row.homeSections),
    logoUrl: row.logo && row.logo.visibility === "PUBLIC" ? `/media/${row.logo.id}` : null,
  };
}

/** Site configuration, loaded once per request. */
export const getSettings = cache(loadSettings);

export function schedulingRules(s: Settings) {
  return {
    timezone: s.timezone,
    officeHours: s.officeHours,
    slotMinutes: s.slotMinutes,
    minNoticeHours: s.minNoticeHours,
    maxAdvanceDays: s.maxAdvanceDays,
    durationMinutes: s.appointmentMinutes,
  };
}
