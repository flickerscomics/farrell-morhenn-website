import { describe, expect, it } from "vitest";
import { intakeConfigSchema, parseIntakeFields, validateIntakeAnswers } from "@/lib/intake";
import { hasPermission, DEFAULT_ROLES } from "@/lib/permissions";
import { appointmentSchema, enquirySchema, isSafeHref, slugify } from "@/lib/validation";

const validEnquiry = {
  characterName: "Vincent Moreau",
  subject: "Traffic stop",
  description: "I was stopped and searched on Strawberry Avenue.",
  acknowledge: "on",
};

describe("enquiry validation", () => {
  it("accepts a minimal valid enquiry", () => {
    expect(enquirySchema.safeParse(validEnquiry).success).toBe(true);
  });
  it("requires the roleplay acknowledgement and a real description", () => {
    const r = enquirySchema.safeParse({ ...validEnquiry, acknowledge: undefined, description: "short" });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(paths).toContain("acknowledge");
    expect(paths).toContain("description");
  });
  it("rejects markup and digits in character names", () => {
    expect(enquirySchema.safeParse({ ...validEnquiry, characterName: "<script>" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...validEnquiry, characterName: "Agent 47" }).success).toBe(false);
  });
  it("validates optional dates", () => {
    expect(enquirySchema.safeParse({ ...validEnquiry, preferredDate: "2026-13-01" }).success).toBe(false);
  });
  it("requires appointment date and time", () => {
    const r = appointmentSchema.safeParse({ characterName: "Jo Ann", consultationType: "Initial consultation", reason: "Need advice on a lease.", acknowledge: "on" });
    expect(r.success).toBe(false);
  });
});

describe("intake configuration", () => {
  const fields = parseIntakeFields([
    { key: "stage", label: "Stage", type: "select", required: true, options: ["A", "B"], help: "" },
    { key: "when", label: "When", type: "date", required: false, options: [], help: "" },
  ]);
  it("rejects duplicate keys and single-option selects", () => {
    expect(intakeConfigSchema.safeParse([
      { key: "a_b", label: "One", type: "text", required: false, options: [], help: "" },
      { key: "a_b", label: "Two", type: "text", required: false, options: [], help: "" },
    ]).success).toBe(false);
    expect(intakeConfigSchema.safeParse([{ key: "pick", label: "Pick", type: "select", required: false, options: ["Only"], help: "" }]).success).toBe(false);
  });
  it("validates required, option and date answers", () => {
    expect(validateIntakeAnswers(fields, {})).toEqual({ ok: false, errors: { intake_stage: "Stage is required." } });
    expect(validateIntakeAnswers(fields, { stage: "C" }).ok).toBe(false);
    expect(validateIntakeAnswers(fields, { stage: "A", when: "nope" }).ok).toBe(false);
    expect(validateIntakeAnswers(fields, { stage: "A", when: "2026-05-01" })).toEqual({
      ok: true,
      answers: [
        { key: "stage", label: "Stage", value: "A" },
        { key: "when", label: "When", value: "2026-05-01" },
      ],
    });
  });
  it("treats malformed stored configuration as no questions", () => {
    expect(parseIntakeFields("not json")).toEqual([]);
  });
});

describe("helpers and permissions", () => {
  it("slugifies and filters unsafe links", () => {
    expect(slugify("Divorce & Custody — Los Santos")).toBe("divorce-custody-los-santos");
    expect(isSafeHref("/about")).toBe(true);
    expect(isSafeHref("https://example.com")).toBe(true);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("//evil.example")).toBe(false);
  });
  it("gives the receptionist intake access but no matter access", () => {
    const receptionist = DEFAULT_ROLES.find((r) => r.key === "receptionist")!.permissions;
    expect(hasPermission(receptionist, "appointments.manage")).toBe(true);
    expect(hasPermission(receptionist, "matters.view_assigned")).toBe(false);
    expect(hasPermission(receptionist, "matters.notes")).toBe(false);
  });
  it("keeps content editors away from client records", () => {
    const editor = DEFAULT_ROLES.find((r) => r.key === "content_editor")!.permissions;
    expect(hasPermission(editor, "enquiries.view")).toBe(false);
    expect(hasPermission(editor, "content.publish")).toBe(true);
  });
  it("treats the wildcard as every permission", () => {
    expect(hasPermission(["*"], "roles.manage")).toBe(true);
  });
});
