// Shared plumbing for the admin API: the request context, JSON responses,
// errors, sessions, rate limits and the activity log.

import { migrate, type D1Database } from "./db";
import { randomToken, sha256 } from "./crypto";
import { GitHubRepo, type Repo } from "./github";
import { ALL_PERMISSIONS, BUILT_IN_ROLES, isPermission, type Permission } from "./permissions";

export interface Env {
  DB: D1Database;
  ADMIN_SETUP_CODE?: string;
  /** Lower this (minimum 10000) only if sign-in hits Cloudflare's CPU limit on the free plan. */
  PASSWORD_HASH_ITERATIONS?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
  GIT_AUTHOR_NAME?: string;
  GIT_AUTHOR_EMAIL?: string;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const SESSION_COOKIE = "__Host-fm_session";
export const SESSION_HOURS = 8;
export const INVITE_HOURS = 48;
export const RESET_HOURS = 24;

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  isAdmin: boolean;
  personSlug: string | null;
  permissions: Permission[];
}

export interface Ctx {
  req: Request;
  url: URL;
  env: Env;
  db: D1Database;
  now: number;
  ip: string;
  repo: () => Repo;
  user: User | null;
  sessionId: string | null;
  csrf: string | null;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
}

export async function body<T = Record<string, unknown>>(ctx: Ctx): Promise<T> {
  const len = Number(ctx.req.headers.get("Content-Length") ?? 0);
  if (len > 8_000_000) throw new HttpError(413, "That's too large to upload.");
  try {
    const data = await ctx.req.json();
    if (!data || typeof data !== "object") throw new Error();
    return data as T;
  } catch {
    throw new HttpError(400, "The request couldn't be read.");
  }
}

export function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function isEmail(s: string) {
  return s.length <= 200 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s);
}

let repoCache: { key: string; repo: Repo } | null = null;

export function repoFor(env: Env): Repo {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_INSTALLATION_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new HttpError(503, "The admin area isn't connected to GitHub yet. Add the GitHub App secrets in Cloudflare.");
  }
  const key = `${env.GITHUB_APP_ID}:${env.GITHUB_APP_INSTALLATION_ID}`;
  if (repoCache?.key !== key) {
    repoCache = {
      key,
      repo: new GitHubRepo({
        appId: env.GITHUB_APP_ID,
        installationId: env.GITHUB_APP_INSTALLATION_ID,
        privateKey: env.GITHUB_APP_PRIVATE_KEY,
        repo: env.GITHUB_REPO || "flickerscomics/farrell-morhenn-website",
        branch: env.GITHUB_BRANCH || "main",
        authorName: env.GIT_AUTHOR_NAME || "daedlus27-arch",
        authorEmail: env.GIT_AUTHOR_EMAIL || "daedlus27@gmail.com",
      }),
    };
  }
  return repoCache.repo;
}

// ─── Roles and sessions ────────────────────────────────────────────────────

export async function ensureReady(db: D1Database, now: number) {
  await migrate(db);
  await db.batch(
    BUILT_IN_ROLES.map((r) =>
      db
        .prepare("INSERT OR IGNORE INTO roles (id, name, description, permissions, built_in, is_admin, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)")
        .bind(r.id, r.name, r.description, JSON.stringify(r.permissions), r.isAdmin ? 1 : 0, now),
    ),
  );
}

export function permissionsOf(role: { is_admin: number; permissions: string }): Permission[] {
  if (role.is_admin) return [...ALL_PERMISSIONS];
  try {
    const list = JSON.parse(role.permissions) as unknown[];
    return ALL_PERMISSIONS.filter((p) => list.includes(p) && isPermission(p));
  } catch {
    return [];
  }
}

export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("Cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

type UserRow = { id: string; email: string; name: string; role_id: string; person_slug: string | null; role_name: string; is_admin: number; permissions: string };

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roleId: row.role_id,
    roleName: row.role_name,
    isAdmin: row.is_admin === 1,
    personSlug: row.person_slug,
    permissions: permissionsOf(row),
  };
}

export async function loadSession(ctx: Ctx) {
  const token = readCookie(ctx.req, SESSION_COOKIE);
  if (!token || token.length > 100) return;
  const id = await sha256(token);
  const row = await ctx.db
    .prepare(
      `SELECT s.id AS sid, s.csrf, u.id, u.email, u.name, u.role_id, u.person_slug, r.name AS role_name, r.is_admin, r.permissions
       FROM sessions s JOIN users u ON u.id = s.user_id JOIN roles r ON r.id = u.role_id
       WHERE s.id = ? AND s.expires_at > ? AND u.status = 'active'`,
    )
    .bind(id, ctx.now)
    .first<UserRow & { sid: string; csrf: string }>();
  if (!row) return;
  ctx.user = toUser(row);
  ctx.sessionId = row.sid;
  ctx.csrf = row.csrf;
}

/** Starts a session and returns the cookie to set. */
export async function startSession(ctx: Ctx, userId: string): Promise<{ cookie: string; csrf: string }> {
  const token = randomToken();
  const csrf = randomToken();
  const expires = ctx.now + SESSION_HOURS * 3600_000;
  await ctx.db.batch([
    ctx.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(ctx.now),
    ctx.db.prepare("DELETE FROM rate_limits WHERE reset_at <= ?").bind(ctx.now),
    ctx.db.prepare("INSERT INTO sessions (id, user_id, csrf, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").bind(await sha256(token), userId, csrf, ctx.now, expires),
  ]);
  return { cookie: `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_HOURS * 3600}; HttpOnly; Secure; SameSite=Strict`, csrf };
}

export const CLEAR_COOKIE = `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

export function requireUser(ctx: Ctx): User {
  if (!ctx.user) throw new HttpError(401, "Please sign in.");
  return ctx.user;
}

export function can(user: User | null, p: Permission) {
  return !!user && user.permissions.includes(p);
}

export function requirePerm(ctx: Ctx, ...any: Permission[]): User {
  const user = requireUser(ctx);
  if (!any.some((p) => user.permissions.includes(p))) throw new HttpError(403, "You don't have permission to do that.");
  return user;
}

// ─── Rate limits and the activity log ──────────────────────────────────────

/** Counts an attempt; returns false once the limit for the window is reached. */
export async function rateLimit(ctx: Ctx, key: string, max: number, windowMs: number): Promise<boolean> {
  const row = await ctx.db
    .prepare(
      `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at <= ? THEN ? ELSE rate_limits.reset_at END
       RETURNING count`,
    )
    .bind(key, ctx.now + windowMs, ctx.now, ctx.now, ctx.now + windowMs)
    .first<{ count: number }>();
  return (row?.count ?? 0) <= max;
}

export async function audit(ctx: Ctx, action: string, target = "", detail: unknown = "", actor: { id: string; name: string } | null = ctx.user) {
  await ctx.db
    .prepare("INSERT INTO audit_log (at, user_id, user_name, action, target, detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(ctx.now, actor?.id ?? null, actor?.name ?? "", action, target, typeof detail === "string" ? detail : JSON.stringify(detail), ctx.ip)
    .run();
}
