import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hmac(value: string) {
  return crypto.createHmac("sha256", env.appSecret).update(value).digest("base64url");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Best-effort client IP. Only the first X-Forwarded-For hop is used. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/** IPs are never stored in clear; a keyed hash is enough for abuse controls. */
export async function hashedClientIp() {
  return hmac(`ip:${await clientIp()}`).slice(0, 32);
}

export async function userAgent() {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}

// ─── Form tokens ────────────────────────────────────────────────────────────
// Every public form carries a signed token issued when the page rendered.
// It gives each render a unique idempotency key (so a double-submit or a
// resubmitted browser form maps to the same record) and lets the server
// reject submissions sent implausibly fast, which filters most bots.

const MIN_FORM_AGE_MS = 2500;
const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 24;

export function issueFormToken(form: string) {
  const payload = `${form}.${Date.now()}.${randomToken(12)}`;
  return `${payload}.${hmac(payload)}`;
}

export type FormTokenCheck =
  | { ok: true; idempotencyKey: string }
  | { ok: false; reason: "invalid" | "too_fast" | "expired" };

export function verifyFormToken(token: string | undefined, form: string, now = Date.now()): FormTokenCheck {
  if (!token || token.length > 200) return { ok: false, reason: "invalid" };
  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false, reason: "invalid" };
  const [name, issued, nonce, signature] = parts;
  const payload = `${name}.${issued}.${nonce}`;
  if (name !== form || !safeEqual(signature, hmac(payload))) return { ok: false, reason: "invalid" };
  const age = now - Number(issued);
  if (!Number.isFinite(age) || age < 0 || age > MAX_FORM_AGE_MS) return { ok: false, reason: "expired" };
  if (age < MIN_FORM_AGE_MS) return { ok: false, reason: "too_fast" };
  return { ok: true, idempotencyKey: sha256(payload) };
}

// ─── Rate limiting ──────────────────────────────────────────────────────────
// Database-backed so limits survive restarts and apply across instances.

export async function checkRateLimit(bucket: string, key: string, limit: number, windowMs: number) {
  const keyHash = sha256(`${bucket}:${key}`);
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.rateLimitHit.count({
    where: { bucket, keyHash, createdAt: { gte: since } },
  });
  if (count >= limit) return false;
  await prisma.rateLimitHit.create({ data: { bucket, keyHash } });
  if (Math.random() < 0.02) {
    await prisma.rateLimitHit.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24) } },
    });
  }
  return true;
}

export async function clearRateLimit(bucket: string, key: string) {
  await prisma.rateLimitHit.deleteMany({ where: { bucket, keyHash: sha256(`${bucket}:${key}`) } });
}

/** Stable fingerprint of a submission's content, used to catch resubmissions. */
export function contentFingerprint(parts: (string | undefined | null)[]) {
  return sha256(parts.map((p) => (p ?? "").trim().toLowerCase().replace(/\s+/g, " ")).join("\u0000"));
}
