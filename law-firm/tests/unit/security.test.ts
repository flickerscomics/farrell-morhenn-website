import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/passwords";
import { randomReference, REFERENCE_PATTERN } from "@/server/references";
import { contentFingerprint, issueFormToken, verifyFormToken } from "@/server/security";

describe("form tokens", () => {
  it("accepts a genuine token after the minimum delay", () => {
    const token = issueFormToken("enquiry");
    const later = Date.now() + 5000;
    const check = verifyFormToken(token, "enquiry", later);
    expect(check.ok).toBe(true);
    // Same token always maps to the same idempotency key.
    expect(verifyFormToken(token, "enquiry", later)).toEqual(check);
  });
  it("rejects bots that submit instantly", () => {
    expect(verifyFormToken(issueFormToken("enquiry"), "enquiry")).toEqual({ ok: false, reason: "too_fast" });
  });
  it("rejects tampered, misused and expired tokens", () => {
    const token = issueFormToken("enquiry");
    const [form, issued, nonce, sig] = token.split(".");
    expect(verifyFormToken(`${form}.${Number(issued) - 10000}.${nonce}.${sig}`, "enquiry").ok).toBe(false);
    expect(verifyFormToken(token, "application", Date.now() + 5000).ok).toBe(false);
    expect(verifyFormToken(token, "enquiry", Date.now() + 2 * 86400_000)).toEqual({ ok: false, reason: "expired" });
    expect(verifyFormToken(undefined, "enquiry").ok).toBe(false);
  });
});

describe("passwords", () => {
  it("hashes with a salt and verifies", async () => {
    const a = await hashPassword("correct horse battery 9");
    const b = await hashPassword("correct horse battery 9");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery 9", a)).toBe(true);
    expect(await verifyPassword("wrong password 123", a)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });
});

describe("references and fingerprints", () => {
  it("generates unguessable references in the expected format", () => {
    const refs = new Set(Array.from({ length: 200 }, () => randomReference("ENQ")));
    expect(refs.size).toBe(200);
    for (const r of refs) expect(r).toMatch(REFERENCE_PATTERN);
  });
  it("ignores case and whitespace differences when fingerprinting", () => {
    expect(contentFingerprint(["Jo  Ann", "Help"])).toBe(contentFingerprint(["jo ann", " help "]));
  });
});
