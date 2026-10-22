import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { AppointmentInput, ApplicationInput, EnquiryInput } from "@/lib/validation";
import { submitApplication, submitAppointment, submitEnquiry } from "@/server/services/submissions";
import { nextWeekday, resetDb, RULES, seedBasics } from "../helpers/fixtures";

let fx: Awaited<ReturnType<typeof seedBasics>>;
let n = 0;
const ctx = () => ({ idempotencyKey: `key-${++n}-${Date.now()}`, ipHash: "iphash" });

const enquiry = (over: Partial<EnquiryInput> = {}): EnquiryInput => ({
  characterName: "Vincent Moreau",
  contactDetails: "555-0199",
  preferredContact: "In-character phone call",
  practiceAreaId: "",
  subject: "Traffic stop",
  description: "I was stopped and searched on Strawberry Avenue.",
  preferredAttorneyId: "",
  preferredDate: "",
  preferredTime: "",
  acknowledge: "on" as const,
  ...over,
});

beforeEach(async () => {
  await resetDb();
  fx = await seedBasics();
});

describe("enquiries", () => {
  it("saves a general enquiry with a reference and an audit entry", async () => {
    const r = await submitEnquiry(enquiry(), {}, ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const saved = await prisma.enquiry.findUniqueOrThrow({ where: { reference: r.reference } });
    expect(saved.status).toBe("NEW");
    expect(saved.sourceIpHash).toBe("iphash");
    expect(await prisma.auditEvent.count({ where: { entityId: saved.id, action: "enquiry.submitted" } })).toBe(1);
  });

  it("validates practice-area intake questions on the server", async () => {
    const bad = await submitEnquiry(enquiry({ practiceAreaId: fx.area.id }), {}, ctx());
    expect(bad).toMatchObject({ ok: false, errors: { intake_stage: "Current stage is required." } });
    const good = await submitEnquiry(enquiry({ practiceAreaId: fx.area.id }), { stage: "Charged", court_date: "2026-12-01" }, ctx());
    expect(good.ok).toBe(true);
    if (!good.ok) return;
    const saved = await prisma.enquiry.findUniqueOrThrow({ where: { reference: good.reference } });
    expect(saved.intakeData).toEqual([
      { key: "stage", label: "Current stage", value: "Charged" },
      { key: "court_date", label: "Court date", value: "2026-12-01" },
    ]);
  });

  it("rejects hidden practice areas, unknown contact methods and unavailable attorneys", async () => {
    const r = await submitEnquiry(
      enquiry({ practiceAreaId: fx.hidden.id, preferredContact: "Carrier pigeon", preferredAttorneyId: fx.onLeave.id }),
      {},
      ctx(),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors ?? {}).sort()).toEqual(["practiceAreaId", "preferredAttorneyId", "preferredContact"]);
    expect(await prisma.enquiry.count()).toBe(0);
  });

  it("returns the original reference for a repeated submission of the same form", async () => {
    const c = ctx();
    const first = await submitEnquiry(enquiry(), {}, c);
    const again = await submitEnquiry(enquiry(), {}, c);
    expect(again).toEqual({ ok: true, reference: first.ok ? first.reference : "", duplicate: true });
    expect(await prisma.enquiry.count()).toBe(1);
  });

  it("catches identical content resubmitted from a fresh form", async () => {
    const first = await submitEnquiry(enquiry(), {}, ctx());
    const second = await submitEnquiry(enquiry({ subject: "  TRAFFIC   stop " }), {}, ctx());
    expect(second).toMatchObject({ ok: true, duplicate: true, reference: first.ok ? first.reference : "" });
    expect(await prisma.enquiry.count()).toBe(1);
  });

  it("handles concurrent double-clicks without creating two records", async () => {
    const c = ctx();
    const results = await Promise.all([submitEnquiry(enquiry(), {}, c), submitEnquiry(enquiry(), {}, c)]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await prisma.enquiry.count()).toBe(1);
  });

  it("refuses enquiries when the firm has paused intake", async () => {
    await prisma.siteSettings.update({ where: { id: 1 }, data: { acceptingEnquiries: false } });
    expect((await submitEnquiry(enquiry(), {}, ctx())).ok).toBe(false);
  });
});

describe("consultation requests", () => {
  const base: Omit<AppointmentInput, "requestedDate" | "requestedTime"> = { characterName: "Jo Ann", contactDetails: "", preferredContact: "", attorneyId: "", consultationType: "Initial consultation", alternativeDate: "", alternativeTime: "", reason: "Advice about a lease dispute.", notes: "", acknowledge: "on" as const };

  it("stores a valid request in UTC as REQUESTED", async () => {
    const slot = nextWeekday(3, "10:00");
    const r = await submitAppointment({ ...base, requestedDate: slot.date, requestedTime: slot.time, attorneyId: fx.attorney.id }, RULES, ctx());
    expect(r.ok).toBe(true);
    const appt = await prisma.appointment.findFirstOrThrow();
    expect(appt.status).toBe("REQUESTED");
    expect(appt.scheduledStart).toBeNull();
    expect(appt.requestedStart.toISOString().slice(11, 16)).toMatch(/^1[78]:00$/); // 10:00 Pacific (PST or PDT)
  });

  it("rejects times outside office hours, weekends and unknown consultation types", async () => {
    const late = nextWeekday(3, "19:00");
    const r1 = await submitAppointment({ ...base, requestedDate: late.date, requestedTime: late.time }, RULES, ctx());
    expect(r1.ok ? null : r1.errors?.requestedTime).toMatch(/run between/);
    const r2 = await submitAppointment({ ...base, consultationType: "Spa day", requestedDate: nextWeekday(3).date, requestedTime: "10:00" }, RULES, ctx());
    expect(r2.ok ? null : r2.errors?.consultationType).toBeTruthy();
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("requires both parts of an alternative time", async () => {
    const slot = nextWeekday(3);
    const r = await submitAppointment({ ...base, requestedDate: slot.date, requestedTime: "10:00", alternativeDate: slot.date }, RULES, ctx());
    expect(r.ok ? null : r.errors?.alternativeTime).toMatch(/both a date and a time/);
  });
});

describe("recruitment applications", () => {
  const app: ApplicationInput = { vacancyId: "", desiredRole: "Paralegal", characterName: "Sam Tran", contactDetails: "555-0111", preferredContact: "", experience: "Two years as a legal secretary in character.", availability: "Weekday evenings", statement: "I would like to join because I enjoy careful, detailed work and helping clients.", acknowledge: "on" as const };

  it("accepts applications for open vacancies and rejects closed ones", async () => {
    const open = await prisma.vacancy.create({ data: { slug: "open", title: "Paralegal", summary: "Open role", status: "OPEN", responsibilities: [], requirements: [] } });
    const closed = await prisma.vacancy.create({ data: { slug: "closed", title: "Clerk", summary: "Closed role", status: "CLOSED", responsibilities: [], requirements: [] } });
    const ok = await submitApplication({ ...app, vacancyId: open.id }, ctx());
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.reference).toMatch(/^APP-\d{4}-/);
    const bad = await submitApplication({ ...app, vacancyId: closed.id, statement: app.statement + " Different." }, ctx());
    expect(bad.ok ? null : bad.errors?.vacancyId).toMatch(/no longer accepting/);
  });
});
