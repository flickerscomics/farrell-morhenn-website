import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createMatter, findAccessibleMatter, updateMatter, type MatterInput } from "@/server/services/matters";
import { createUser, resetDb, seedBasics } from "../helpers/fixtures";

const input = (over: Partial<MatterInput> = {}): MatterInput => ({
  title: "State v. Example",
  clientName: "Luis Alvarez",
  clientContact: "",
  practiceAreaId: null,
  leadAttorneyId: null,
  description: "",
  status: "ACTIVE",
  priority: "NORMAL",
  isRestricted: false,
  followUpAt: null,
  memberIds: [],
  ...over,
});

let partner: Awaited<ReturnType<typeof createUser>>;
let attorney: Awaited<ReturnType<typeof createUser>>;
let paralegal: Awaited<ReturnType<typeof createUser>>;
let receptionist: Awaited<ReturnType<typeof createUser>>;
let admin: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDb();
  await seedBasics();
  partner = await createUser("partner", "Pat Partner");
  attorney = await createUser("attorney", "Alex Attorney");
  paralegal = await createUser("paralegal", "Para Legal");
  receptionist = await createUser("receptionist", "Rita Reception");
  admin = await createUser("super_admin", "Super Admin");
});

describe("matter access control", () => {
  it("limits attorneys and paralegals to matters they work on", async () => {
    const mine = await createMatter(partner, input({ leadAttorneyId: attorney.id, memberIds: [paralegal.id] }));
    const other = await createMatter(partner, input({ leadAttorneyId: partner.id }));
    expect(await findAccessibleMatter(attorney, mine.id)).not.toBeNull();
    expect(await findAccessibleMatter(paralegal, mine.id)).not.toBeNull();
    expect(await findAccessibleMatter(attorney, other.id)).toBeNull();
    expect(await findAccessibleMatter(paralegal, other.id)).toBeNull();
  });

  it("gives receptionists no matter access at all", async () => {
    const m = await createMatter(partner, input({ leadAttorneyId: partner.id }));
    expect(await findAccessibleMatter(receptionist, m.id)).toBeNull();
  });

  it("hides restricted matters from partners outside the team, but not from the super administrator", async () => {
    const restricted = await createMatter(admin, input({ leadAttorneyId: attorney.id, isRestricted: true }));
    const open = await createMatter(admin, input({ leadAttorneyId: attorney.id }));
    expect(await findAccessibleMatter(partner, open.id)).not.toBeNull();
    expect(await findAccessibleMatter(partner, restricted.id)).toBeNull();
    expect(await findAccessibleMatter(attorney, restricted.id)).not.toBeNull();
    expect(await findAccessibleMatter(admin, restricted.id)).not.toBeNull();
  });

  it("refuses updates from staff who cannot see the matter", async () => {
    const m = await createMatter(partner, input({ leadAttorneyId: partner.id, isRestricted: true }));
    await expect(updateMatter(attorney, m.id, input({ title: "Hijacked" }))).rejects.toThrow(/not found/);
    expect((await prisma.matter.findUniqueOrThrow({ where: { id: m.id } })).title).toBe("State v. Example");
  });
});

describe("matter lifecycle", () => {
  it("issues sequential references and records a timeline entry", async () => {
    const a = await createMatter(partner, input());
    const b = await createMatter(partner, input());
    expect(a.reference).toMatch(/^CW-\d{4}-0001$/);
    expect(b.reference).toMatch(/^CW-\d{4}-0002$/);
    expect(await prisma.matterEvent.count({ where: { matterId: a.id } })).toBe(1);
  });

  it("converts an enquiry without losing it, carrying linked appointments across", async () => {
    const enquiry = await prisma.enquiry.create({
      data: { reference: "ENQ-2026-AAAAAA", characterName: "Mara K", subject: "Deposit", description: "Deposit withheld.", contentHash: "h" },
    });
    await prisma.note.create({ data: { enquiryId: enquiry.id, body: "Called client", authorId: attorney.id } });
    const appt = await prisma.appointment.create({
      data: { reference: "APT-2026-AAAAAA", characterName: "Mara K", consultationType: "Initial consultation", requestedStart: new Date(), reason: "x", contentHash: "a", enquiryId: enquiry.id },
    });
    const matter = await createMatter(attorney, input({ leadAttorneyId: attorney.id }), enquiry.id);

    const after = await prisma.enquiry.findUniqueOrThrow({ where: { id: enquiry.id }, include: { notes: true } });
    expect(after.matterId).toBe(matter.id);
    expect(after.status).toBe("ACCEPTED");
    expect(after.notes).toHaveLength(1);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } })).matterId).toBe(matter.id);
    await expect(createMatter(attorney, input(), enquiry.id)).rejects.toThrow(/already been converted/);
    // The failed second conversion must not leave a stray matter behind.
    expect(await prisma.matter.count()).toBe(1);
  });

  it("sets and clears the closing date with the status", async () => {
    const m = await createMatter(partner, input({ leadAttorneyId: partner.id }));
    await updateMatter(partner, m.id, input({ leadAttorneyId: partner.id, status: "CONCLUDED" }));
    expect((await prisma.matter.findUniqueOrThrow({ where: { id: m.id } })).closedAt).not.toBeNull();
    await updateMatter(partner, m.id, input({ leadAttorneyId: partner.id, status: "ACTIVE" }));
    expect((await prisma.matter.findUniqueOrThrow({ where: { id: m.id } })).closedAt).toBeNull();
  });
});
