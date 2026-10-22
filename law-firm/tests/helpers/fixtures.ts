import { prisma } from "@/lib/db";
import { DEFAULT_ROLES } from "@/lib/permissions";
import { defaultOfficeHours, type SchedulingRules } from "@/lib/time";
import type { Actor } from "@/server/services/matters";

/** Empties every table so each test file starts from a known state. */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }
}

export const RULES: SchedulingRules = {
  timezone: "America/Los_Angeles",
  officeHours: defaultOfficeHours(),
  slotMinutes: 30,
  minNoticeHours: 12,
  maxAdvanceDays: 60,
  durationMinutes: 45,
};

export async function seedBasics() {
  await prisma.siteSettings.create({
    data: {
      id: 1,
      firmName: "Test Firm LLP",
      shortName: "Test Firm",
      tagline: "Testing",
      phone: "555-0100",
      email: "test@example.test",
      addressLines: ["1 Test Street"],
      officeHours: defaultOfficeHours(),
      socialLinks: [],
      navigation: [],
      heroTitle: "Hero title",
      heroText: "Hero text for testing.",
      homeSections: {},
      contactMethods: ["In-character phone call", "In-character email"],
      consultationTypes: ["Initial consultation", "Case review"],
    },
  });
  for (const role of DEFAULT_ROLES) await prisma.role.create({ data: { ...role, isSystem: true } });

  const area = await prisma.practiceArea.create({
    data: {
      slug: "criminal-defence",
      name: "Criminal Defence",
      shortDescription: "Defence work.",
      matterTypes: [],
      services: [],
      intakeFields: [
        { key: "stage", label: "Current stage", type: "select", required: true, options: ["Arrested", "Charged"], help: "" },
        { key: "court_date", label: "Court date", type: "date", required: false, options: [], help: "" },
      ],
    },
  });
  const hidden = await prisma.practiceArea.create({
    data: { slug: "hidden-area", name: "Hidden", shortDescription: "Not offered.", isPublished: false, matterTypes: [], services: [] },
  });
  const attorney = await prisma.staffProfile.create({
    data: { slug: "jane-counsel", fullName: "Jane Counsel", title: "Partner", role: "PARTNER", acceptsConsultations: true, languages: [] },
  });
  const onLeave = await prisma.staffProfile.create({
    data: { slug: "away-attorney", fullName: "Away Attorney", title: "Associate", role: "ASSOCIATE_ATTORNEY", status: "ON_LEAVE", acceptsConsultations: true, languages: [] },
  });
  return { area, hidden, attorney, onLeave };
}

export async function createUser(roleKey: string, name: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  const user = await prisma.user.create({
    data: { email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.test`, name, roleId: role.id, passwordHash: "x" },
  });
  return { ...user, permissions: role.permissions } satisfies Actor & { email: string };
}

/** A weekday at the given office-local time, at least `daysAhead` days out. */
export function nextWeekday(daysAhead: number, time = "10:00"): { date: string; time: string } {
  const d = new Date(Date.now() + daysAhead * 86400_000);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return { date: d.toISOString().slice(0, 10), time };
}
