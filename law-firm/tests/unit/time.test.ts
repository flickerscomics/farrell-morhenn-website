import { describe, expect, it } from "vitest";
import { defaultOfficeHours, fromLocalInput, toLocalInput, validateAppointmentTime, zonedTimeToUtc } from "@/lib/time";

const TZ = "America/Los_Angeles";
const rules = { timezone: TZ, officeHours: defaultOfficeHours(), slotMinutes: 30, minNoticeHours: 12, maxAdvanceDays: 60, durationMinutes: 45 };

describe("zonedTimeToUtc", () => {
  it("converts Pacific standard and daylight times", () => {
    expect(zonedTimeToUtc("2026-01-15", "09:00", TZ)?.toISOString()).toBe("2026-01-15T17:00:00.000Z");
    expect(zonedTimeToUtc("2026-07-15", "09:00", TZ)?.toISOString()).toBe("2026-07-15T16:00:00.000Z");
  });
  it("rejects times skipped by the spring-forward transition", () => {
    expect(zonedTimeToUtc("2026-03-08", "02:30", TZ)).toBeNull();
  });
  it("rejects invalid dates and times", () => {
    expect(zonedTimeToUtc("2026-02-30", "10:00", TZ)).toBeNull();
    expect(zonedTimeToUtc("2026-02-10", "25:00", TZ)).toBeNull();
  });
  it("round-trips datetime-local values", () => {
    const d = fromLocalInput("2026-11-03T14:30", TZ)!;
    expect(toLocalInput(d, TZ)).toBe("2026-11-03T14:30");
  });
});

describe("validateAppointmentTime", () => {
  const now = new Date("2026-11-02T16:00:00Z"); // Monday 08:00 Pacific
  it("accepts a slot inside office hours", () => {
    expect(validateAppointmentTime(zonedTimeToUtc("2026-11-04", "10:00", TZ)!, rules, now)).toBeNull();
  });
  it("rejects closed days, off-grid times and slots that overrun closing", () => {
    expect(validateAppointmentTime(zonedTimeToUtc("2026-11-08", "11:00", TZ)!, rules, now)).toMatch(/closed on Sundays/);
    expect(validateAppointmentTime(zonedTimeToUtc("2026-11-04", "10:10", TZ)!, rules, now)).toMatch(/30-minute/);
    expect(validateAppointmentTime(zonedTimeToUtc("2026-11-04", "17:30", TZ)!, rules, now)).toMatch(/ending by closing/);
  });
  it("enforces minimum notice and the booking window", () => {
    expect(validateAppointmentTime(zonedTimeToUtc("2026-11-02", "14:00", TZ)!, rules, now)).toMatch(/notice/);
    expect(validateAppointmentTime(zonedTimeToUtc("2027-02-01", "10:00", TZ)!, rules, now)).toMatch(/60 days/);
  });
});
