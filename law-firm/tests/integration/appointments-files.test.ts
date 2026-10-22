import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { StaffActor } from "@/server/auth";
import { canAccessUpload } from "@/server/file-access";
import { allowedActions, AppointmentError, transitionAppointment } from "@/server/services/appointments";
import { createMatter } from "@/server/services/matters";
import { zonedTimeToUtc } from "@/lib/time";
import { createUser, nextWeekday, resetDb, RULES, seedBasics } from "../helpers/fixtures";

let fx: Awaited<ReturnType<typeof seedBasics>>;
let reception: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDb();
  fx = await seedBasics();
  reception = await createUser("receptionist", "Rita Reception");
});

function slot(daysAhead: number, time: string) {
  const s = nextWeekday(daysAhead, time);
  return zonedTimeToUtc(s.date, s.time, RULES.timezone)!;
}

async function request(start: Date, ref: string) {
  return prisma.appointment.create({
    data: { reference: ref, characterName: "Jo Ann", consultationType: "Initial consultation", requestedStart: start, reason: "x", contentHash: ref, attorneyId: fx.attorney.id },
  });
}

describe("appointment workflow", () => {
  it("confirms, reschedules and completes with an audit trail", async () => {
    const a = await request(slot(3, "10:00"), "APT-2026-AAAAA2");
    expect(allowedActions("REQUESTED")).toEqual(["confirm", "decline", "reschedule", "cancel"]);
    await transitionAppointment(reception, a.id, "confirm", { rules: RULES });
    let row = await prisma.appointment.findUniqueOrThrow({ where: { id: a.id } });
    expect(row.status).toBe("CONFIRMED");
    expect(row.scheduledStart?.getTime()).toBe(a.requestedStart.getTime());

    await transitionAppointment(reception, a.id, "reschedule", { scheduledStart: slot(4, "11:00"), rules: RULES });
    row = await prisma.appointment.findUniqueOrThrow({ where: { id: a.id } });
    expect(row.status).toBe("RESCHEDULED");

    await expect(transitionAppointment(reception, a.id, "decline", { rules: RULES })).rejects.toBeInstanceOf(AppointmentError);
    await transitionAppointment(reception, a.id, "complete", { rules: RULES });
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("COMPLETED");
    expect(await prisma.auditEvent.count({ where: { entityId: a.id } })).toBe(3);
  });

  it("prevents double-booking the same attorney", async () => {
    const first = await request(slot(3, "10:00"), "APT-2026-AAAAA3");
    const second = await request(slot(3, "10:30"), "APT-2026-AAAAA4");
    await transitionAppointment(reception, first.id, "confirm", { rules: RULES });
    await expect(transitionAppointment(reception, second.id, "confirm", { rules: RULES })).rejects.toThrow(/overlaps/);
  });

  it("rejects confirmations outside office hours unless explicitly allowed", async () => {
    const a = await request(slot(3, "10:00"), "APT-2026-AAAAA5");
    await expect(transitionAppointment(reception, a.id, "confirm", { scheduledStart: slot(3, "20:00"), rules: RULES })).rejects.toThrow();
    await transitionAppointment(reception, a.id, "confirm", { scheduledStart: slot(3, "20:00"), rules: RULES, allowOutsideHours: true });
  });
});

describe("private file access", () => {
  async function upload(data: { matterId?: string; enquiryId?: string; purpose: "MATTER_DOCUMENT" | "ENQUIRY_ATTACHMENT" | "CLIENT_UPLOAD"; clientVisible?: boolean; uploadedByClientId?: string }) {
    return prisma.upload.create({
      data: { storageKey: `private/${crypto.randomUUID().replace(/-/g, "")}.pdf`, originalName: "f.pdf", mimeType: "application/pdf", size: 1, visibility: "PRIVATE", ...data },
    });
  }

  it("applies role, team and client ownership rules", async () => {
    const lead = await createUser("attorney", "Lead Attorney");
    const outsider = await createUser("attorney", "Other Attorney");
    const editor = await createUser("content_editor", "Ed Itor");
    const owner = await prisma.clientAccount.create({ data: { email: "owner@x.test", characterName: "Owner", passwordHash: "x" } });
    const stranger = await prisma.clientAccount.create({ data: { email: "stranger@x.test", characterName: "Stranger", passwordHash: "x" } });
    const matter = await createMatter(lead, {
      title: "M", clientName: "Owner", clientContact: "", practiceAreaId: null, leadAttorneyId: lead.id, description: "",
      status: "ACTIVE", priority: "NORMAL", isRestricted: false, followUpAt: null, memberIds: [],
    });
    await prisma.matter.update({ where: { id: matter.id }, data: { clientAccountId: owner.id } });

    const internal = await upload({ matterId: matter.id, purpose: "MATTER_DOCUMENT" });
    const shared = await upload({ matterId: matter.id, purpose: "MATTER_DOCUMENT", clientVisible: true });
    const enquiryFile = await upload({ purpose: "ENQUIRY_ATTACHMENT" });
    const asStaff = (u: typeof lead) => u as unknown as StaffActor;

    expect(await canAccessUpload(internal, asStaff(lead), null)).toBe(true);
    expect(await canAccessUpload(internal, asStaff(outsider), null)).toBe(false);
    expect(await canAccessUpload(internal, asStaff(reception), null)).toBe(false);
    expect(await canAccessUpload(enquiryFile, asStaff(reception), null)).toBe(true);
    expect(await canAccessUpload(enquiryFile, asStaff(editor), null)).toBe(false);
    expect(await canAccessUpload(internal, null, owner)).toBe(false);
    expect(await canAccessUpload(shared, null, owner)).toBe(true);
    expect(await canAccessUpload(shared, null, stranger)).toBe(false);
    expect(await canAccessUpload(enquiryFile, null, null)).toBe(false);
  });
});
