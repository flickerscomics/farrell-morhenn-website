// Seeds the database with the firm's fictional sample content.
//
// The seed is safe to run repeatedly: it only creates records that do not
// exist yet and never overwrites content edited through the admin area.
//
// Staff login accounts are NOT created by default. Create the first
// administrator with `npm run admin:create`. For local evaluation only, set
// SEED_DEMO_ACCOUNTS=true to create one demo account per role (with random
// passwords printed once to the console) plus a few clearly-marked sample
// enquiries, appointments and a matter.

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROLES } from "../src/lib/permissions";
import { defaultOfficeHours } from "../src/lib/time";
import { hashPassword } from "../src/server/passwords";
import { practiceAreas } from "./seed-data/practice-areas";
import { staff } from "./seed-data/staff";
import { articleCategories, articles, faqCategories, faqs, milestones, pages, vacancies } from "./seed-data/content";

const prisma = new PrismaClient();

async function seedSettings() {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      firmName: "Calder Whitmore LLP",
      shortName: "Calder Whitmore",
      tagline: "Steady counsel for Los Santos.",
      phone: "555-0147",
      email: "reception@calderwhitmore.sa",
      addressLines: ["Arcadius Business Center, Suite 2210", "Pillbox Hill", "Los Santos, San Andreas"],
      locationNote:
        "On the 22nd floor of the Arcadius Business Center. Visitor parking is available in the building garage; check in at the ground-floor security desk.",
      officeHours: defaultOfficeHours(),
      socialLinks: [],
      navigation: [
        { label: "About", href: "/about" },
        { label: "Practice Areas", href: "/practice-areas" },
        { label: "People", href: "/people" },
        { label: "News & Insights", href: "/news" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "/contact" },
      ],
      footerText:
        "Calder Whitmore LLP is a fictional law firm within the GTA World roleplay community. Nothing on this website is real-world legal advice.",
      heroEyebrow: "Attorneys at law · Pillbox Hill, Los Santos",
      heroTitle: "Steady counsel when the stakes are high.",
      heroText:
        "Calder Whitmore represents individuals and businesses across Los Santos and Blaine County in criminal, civil, family and commercial matters. We tell you where you stand, and then we go to work.",
      homeSections: {
        showPracticeAreas: true,
        showAttorneys: true,
        showProcess: true,
        showArticles: true,
        showCareers: true,
        showContact: true,
      },
      contactMethods: [
        "In-character phone call",
        "In-character text message",
        "In-character email",
        "GTA World forum private message",
        "Visit the office in person",
      ],
      consultationTypes: [
        "Initial consultation",
        "Case review",
        "Document review",
        "Follow-up meeting",
        "Court preparation",
      ],
      enquiryNotice:
        "This is an in-character service. Do not submit genuine confidential legal material or real-world personal information.",
      timezone: "America/Los_Angeles",
    },
  });
}

async function seedRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {},
      create: { ...role, isSystem: true },
    });
  }
}

async function seedContent() {
  const areaIds = new Map<string, string>();
  for (const [i, area] of practiceAreas.entries()) {
    const row = await prisma.practiceArea.upsert({
      where: { slug: area.slug },
      update: {},
      create: {
        slug: area.slug,
        name: area.name,
        shortDescription: area.shortDescription,
        overview: area.overview,
        matterTypes: area.matterTypes,
        services: area.services,
        intakeFields: area.intakeFields,
        isFeatured: area.isFeatured ?? false,
        sortOrder: i,
        metaDescription: area.shortDescription,
      },
    });
    areaIds.set(area.slug, row.id);
  }

  const staffIds = new Map<string, string>();
  for (const [i, person] of staff.entries()) {
    const { practiceAreas: areas, ...data } = person;
    const existing = await prisma.staffProfile.findUnique({ where: { slug: person.slug } });
    const row =
      existing ??
      (await prisma.staffProfile.create({
        data: {
          ...data,
          languages: data.languages ?? [],
          sortOrder: i,
          practiceAreas: { connect: areas.map((slug) => ({ id: areaIds.get(slug)! })).filter((c) => c.id) },
        },
      }));
    staffIds.set(person.slug, row.id);
  }

  const categoryIds = new Map<string, string>();
  for (const [i, c] of articleCategories.entries()) {
    const row = await prisma.articleCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i },
    });
    categoryIds.set(c.slug, row.id);
  }

  for (const a of articles) {
    const exists = await prisma.article.findUnique({ where: { slug: a.slug } });
    if (exists) continue;
    await prisma.article.create({
      data: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        body: a.body,
        type: a.type,
        categoryId: categoryIds.get(a.category) ?? null,
        tags: a.tags,
        authorId: a.author ? (staffIds.get(a.author) ?? null) : null,
        status: a.status,
        publishedAt: a.status === "PUBLISHED" ? new Date(Date.now() - a.daysAgo * 86400_000) : null,
        isFeatured: a.isFeatured ?? false,
        metaDescription: a.summary,
        practiceAreas: { connect: a.practiceAreas.map((slug) => ({ id: areaIds.get(slug)! })) },
      },
    });
  }

  const faqCategoryIds = new Map<string, string>();
  for (const [i, c] of faqCategories.entries()) {
    const row = await prisma.faqCategory.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, sortOrder: i } });
    faqCategoryIds.set(c.slug, row.id);
  }
  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({
      data: faqs.map((q, i) => ({
        question: q.question,
        answer: q.answer,
        categoryId: faqCategoryIds.get(q.category) ?? null,
        sortOrder: i,
      })),
    });
    // A few practice-area-specific questions shown on those pages.
    await prisma.faq.createMany({
      data: [
        {
          question: "Should I speak to the police before talking to a lawyer?",
          answer:
            "You are entitled to remain silent and to ask for an attorney before answering questions. In the roleplay setting, it is almost always sensible to speak to defence counsel first.",
          practiceAreaId: areaIds.get("criminal-defence"),
          categoryId: faqCategoryIds.get("services"),
          sortOrder: 100,
        },
        {
          question: "How long do I have to bring a personal injury claim?",
          answer:
            "Time limits apply under the community's legal framework. Contact us as early as possible so evidence can be preserved and deadlines are not missed.",
          practiceAreaId: areaIds.get("personal-injury"),
          categoryId: faqCategoryIds.get("services"),
          sortOrder: 101,
        },
        {
          question: "Can you help if the other side has already filed in court?",
          answer: "Yes. Bring any papers you have been served (in character) to your consultation so we can check the deadlines.",
          practiceAreaId: areaIds.get("civil-litigation"),
          categoryId: faqCategoryIds.get("services"),
          sortOrder: 102,
        },
      ],
    });
  }

  for (const [i, v] of vacancies.entries()) {
    await prisma.vacancy.upsert({
      where: { slug: v.slug },
      update: {},
      create: { ...v, sortOrder: i, publishedAt: v.status === "DRAFT" ? null : new Date(Date.now() - 6 * 86400_000) },
    });
  }

  if ((await prisma.milestone.count()) === 0) {
    await prisma.milestone.createMany({ data: milestones.map((m, i) => ({ ...m, sortOrder: i })) });
  }

  for (const page of pages) {
    await prisma.page.upsert({ where: { slug: page.slug }, update: {}, create: page });
  }

  return { areaIds, staffIds };
}

const DEMO_ACCOUNTS = [
  { email: "admin@calderwhitmore.test", name: "Site Administrator", role: "super_admin", profile: null },
  { email: "eleanor@calderwhitmore.test", name: "Eleanor Calder", role: "managing_partner", profile: "eleanor-calder" },
  { email: "marcus@calderwhitmore.test", name: "Marcus Whitmore", role: "partner", profile: "marcus-whitmore" },
  { email: "theo@calderwhitmore.test", name: "Theo Okafor", role: "attorney", profile: "theo-okafor" },
  { email: "priya@calderwhitmore.test", name: "Priya Raman", role: "paralegal", profile: "priya-raman" },
  { email: "tessa@calderwhitmore.test", name: "Tessa Vaughn", role: "receptionist", profile: "tessa-vaughn" },
  { email: "editor@calderwhitmore.test", name: "Content Editor", role: "content_editor", profile: null },
] as const;

async function seedDemo(areaIds: Map<string, string>, staffIds: Map<string, string>) {
  console.log("\nDemo accounts (local evaluation only — passwords are shown once):");
  const userIds = new Map<string, string>();
  for (const acct of DEMO_ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: acct.email } });
    if (existing) {
      userIds.set(acct.role, existing.id);
      console.log(`  ${acct.email.padEnd(32)} (exists — password unchanged)`);
      continue;
    }
    const password = crypto.randomBytes(9).toString("base64url");
    const role = await prisma.role.findUniqueOrThrow({ where: { key: acct.role } });
    const user = await prisma.user.create({
      data: {
        email: acct.email,
        name: acct.name,
        roleId: role.id,
        passwordHash: await hashPassword(password),
        staffProfileId: acct.profile ? staffIds.get(acct.profile) : null,
      },
    });
    userIds.set(acct.role, user.id);
    console.log(`  ${acct.email.padEnd(32)} ${role.name.padEnd(28)} ${password}`);
  }

  if ((await prisma.enquiry.count()) > 0) return;

  const theo = userIds.get("attorney")!;
  const eleanor = userIds.get("managing_partner")!;
  const priya = userIds.get("paralegal")!;
  const now = Date.now();

  await prisma.enquiry.create({
    data: {
      reference: "ENQ-2026-SAMPL2",
      characterName: "Jordan Hayes",
      contactDetails: "555-0199 (in character)",
      preferredContact: "In-character phone call",
      practiceAreaId: areaIds.get("personal-injury"),
      subject: "Sample record: collision on Del Perro Freeway",
      description:
        "Sample enquiry created by the demo seed. I was rear-ended on the Del Perro Freeway and the other driver's insurer will not respond.",
      intakeData: [
        { key: "incident_type", label: "How did the injury happen?", value: "Vehicle collision" },
        { key: "summary", label: "Brief description of what happened", value: "Rear-ended in slow traffic." },
      ],
      contentHash: "demo-1",
      status: "NEW",
    },
  });
  const enquiry2 = await prisma.enquiry.create({
    data: {
      reference: "ENQ-2026-SAMPL3",
      characterName: "Mara Kowalski",
      contactDetails: "mara.k@eyefind.sa (in character)",
      preferredContact: "In-character email",
      practiceAreaId: areaIds.get("landlord-and-tenant"),
      subject: "Sample record: deposit not returned",
      description: "Sample enquiry created by the demo seed. My landlord in Mirror Park has kept my full deposit without explanation.",
      contentHash: "demo-2",
      status: "UNDER_REVIEW",
      assignedToId: theo,
      priority: "HIGH",
      followUpAt: new Date(now + 2 * 86400_000),
    },
  });
  await prisma.note.create({
    data: { enquiryId: enquiry2.id, authorId: theo, body: "Sample internal note: asked the client for the lease dates." },
  });

  const matter = await prisma.matter.create({
    data: {
      reference: "CW-2026-0001",
      title: "Sample record: State v. Alvarez (traffic stop)",
      clientName: "Luis Alvarez",
      practiceAreaId: areaIds.get("criminal-defence"),
      leadAttorneyId: eleanor,
      description: "Sample matter created by the demo seed.",
      status: "AWAITING_HEARING",
      priority: "HIGH",
      followUpAt: new Date(now + 86400_000),
      members: { create: [{ userId: priya, role: "Paralegal" }] },
      events: {
        create: [
          { type: "MILESTONE", title: "Matter opened", occursAt: new Date(now - 10 * 86400_000), authorId: eleanor },
          {
            type: "HEARING",
            title: "Suppression hearing",
            body: "Mission Row courtroom 2 (in character).",
            occursAt: new Date(now + 5 * 86400_000),
            isDeadline: true,
            clientVisible: true,
            authorId: priya,
          },
        ],
      },
      notes: { create: [{ authorId: eleanor, body: "Sample private note: request the dash-camera footage." }] },
    },
  });
  await prisma.referenceCounter.upsert({
    where: { key: "matter-2026" },
    create: { key: "matter-2026", value: 1 },
    update: {},
  });

  const tomorrow = new Date(now + 2 * 86400_000);
  tomorrow.setUTCHours(18, 0, 0, 0); // 10:00 or 11:00 Pacific
  await prisma.appointment.create({
    data: {
      reference: "APT-2026-SAMPL4",
      characterName: "Jordan Hayes",
      preferredContact: "In-character phone call",
      attorneyId: staffIds.get("theo-okafor"),
      consultationType: "Initial consultation",
      requestedStart: tomorrow,
      reason: "Sample record: discuss the freeway collision claim.",
      contentHash: "demo-3",
    },
  });
  await prisma.appointment.create({
    data: {
      reference: "APT-2026-SAMPL5",
      characterName: "Luis Alvarez",
      attorneyId: staffIds.get("eleanor-calder"),
      consultationType: "Court preparation",
      requestedStart: new Date(tomorrow.getTime() + 86400_000),
      scheduledStart: new Date(tomorrow.getTime() + 86400_000),
      status: "CONFIRMED",
      reason: "Sample record: prepare for the suppression hearing.",
      matterId: matter.id,
      contentHash: "demo-4",
    },
  });
  console.log("\nSample operational records created (marked “Sample record”).");
}

async function main() {
  await seedSettings();
  await seedRoles();
  const { areaIds, staffIds } = await seedContent();
  if (process.env.SEED_DEMO_ACCOUNTS === "true") await seedDemo(areaIds, staffIds);
  console.log("\nSeed complete.");
  if (process.env.SEED_DEMO_ACCOUNTS !== "true" && (await prisma.user.count()) === 0) {
    console.log("No staff accounts exist yet. Create the first administrator with:  npm run admin:create");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
