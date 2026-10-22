// Password hashing and random tokens, using only the Web Crypto API (built
// into Cloudflare Workers and Node).
//
// Passwords use PBKDF2-SHA256, 100,000 iterations by default (the most
// Cloudflare Workers allows). Argon2id would need WebAssembly and far more CPU
// time than a Workers request gets. The iteration count is stored with each
// hash, so it can be changed (PASSWORD_HASH_ITERATIONS) without resetting
// anyone's password.

const encoder = new TextEncoder();
export const PBKDF2_ITERATIONS = 100_000;
export const MIN_PBKDF2_ITERATIONS = 10_000;

/** The iteration count to use for new hashes, from the PASSWORD_HASH_ITERATIONS setting if present. */
export function iterationsFrom(setting: string | undefined): number {
  const n = Math.floor(Number(setting));
  return Number.isFinite(n) && n > 0 ? Math.min(PBKDF2_ITERATIONS, Math.max(MIN_PBKDF2_ITERATIONS, n)) : PBKDF2_ITERATIONS;
}

export function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function randomId(): string {
  return crypto.randomUUID();
}

export async function sha256(text: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text))));
}

/** Compares two strings in time that doesn't depend on where they differ. */
export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i % x.length] ?? 0) ^ (y[i % y.length] ?? 0);
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${base64url(salt)}$${base64url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split("$");
  const iterations = Number(iter);
  if (scheme !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS || !salt || !hash) return false;
  const actual = await pbkdf2(password, fromBase64url(salt), iterations);
  return safeEqual(base64url(actual), hash);
}

/** A real hash of a random password, checked when an email isn't recognised so the response takes the same time. */
const dummies = new Map<number, Promise<string>>();
export function dummyHash(iterations = PBKDF2_ITERATIONS): Promise<string> {
  if (!dummies.has(iterations)) dummies.set(iterations, hashPassword(randomToken(), iterations));
  return dummies.get(iterations)!;
}

// Common passwords that pass the length rule. Not exhaustive: the length rule
// and login limits do most of the work.
const COMMON = new Set(
  [
    "password1234", "password12345", "password123456", "passwordpassword", "123456789012", "1234567890123", "12345678901234",
    "qwertyuiopas", "qwertyuiop12", "qwerty123456", "qwertyqwerty", "iloveyou1234", "letmein12345", "welcome12345",
    "administrator", "admin1234567", "adminadmin12", "changeme1234", "abcdefghijkl", "abc123456789", "111111111111",
    "000000000000", "aaaaaaaaaaaa", "trustno11234", "football1234", "baseball1234", "sunshine1234", "princess1234",
    "superman1234", "starwars1234", "monkey123456", "dragon123456", "losSantos123", "lossantos1234", "farrellmorhenn",
    "farrell-morhenn", "farrellmorhenn1", "farrellmorhenn123", "lawfirm12345", "attorney1234",
  ].map((p) => p.toLowerCase()),
);

/** Returns a reason the password is too weak, or null if it's acceptable. */
export function passwordProblem(password: string, related: string[] = []): string | null {
  if (typeof password !== "string" || password.length < 12) return "Use at least 12 characters.";
  if (password.length > 256) return "Use at most 256 characters.";
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "That password is too common. Choose another.";
  if (/^(.)\1+$/.test(password)) return "Don't repeat one character.";
  for (const r of related) {
    const v = r.toLowerCase().trim();
    if (v.length >= 4 && (lower.includes(v) || v.includes(lower))) return "Don't use your name or email address in your password.";
  }
  return null;
}
