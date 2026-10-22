// Signing in, invitations, password resets, staff accounts and roles.

import { dummyHash, hashPassword, iterationsFrom, passwordProblem, randomId, randomToken, safeEqual, sha256, verifyPassword } from "./crypto";
import {
  CLEAR_COOKIE,
  HttpError,
  INVITE_HOURS,
  RESET_HOURS,
  audit,
  body,
  isEmail,
  json,
  permissionsOf,
  rateLimit,
  requirePerm,
  requireUser,
  startSession,
  str,
  type Ctx,
  type User,
} from "./http";
import { SLUG } from "./schema";
import { isPermission, type Permission } from "./permissions";

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

type RoleRow = { id: string; name: string; description: string; permissions: string; built_in: number; is_admin: number };
type UserRow = { id: string; email: string; name: string; role_id: string; person_slug: string | null; status: string; password_hash: string | null; failed_logins: number; locked_until: number };

function relatedWords(name: string, email: string) {
  return [email.split("@")[0], ...name.split(/\s+/)];
}

function checkPassword(password: unknown, name: string, email: string): string {
  const p = typeof password === "string" ? password : "";
  const problem = passwordProblem(p, relatedWords(name, email));
  if (problem) throw new HttpError(400, problem);
  return p;
}

// ─── Session ───────────────────────────────────────────────────────────────

export async function session(ctx: Ctx) {
  if (ctx.user) return json({ user: ctx.user, csrf: ctx.csrf });
  const any = await ctx.db.prepare("SELECT 1 AS x FROM users LIMIT 1").first();
  return json({ user: null, setupRequired: !any }, 200);
}

export async function setup(ctx: Ctx) {
  if (!(await rateLimit(ctx, `setup:${ctx.ip}`, 10, 15 * 60_000))) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const input = await body(ctx);
  const expected = ctx.env.ADMIN_SETUP_CODE ?? "";
  if (expected.length < 12) throw new HttpError(503, "Setup isn't available. Add an ADMIN_SETUP_CODE secret (at least 12 characters) in Cloudflare first.");
  if (!safeEqual(str(input.code, 300), expected)) {
    await audit(ctx, "setup.failed", "", "Wrong setup code", null);
    throw new HttpError(403, "That setup code is wrong.");
  }
  const name = str(input.name, 100);
  const email = str(input.email, 200).toLowerCase();
  if (!name) throw new HttpError(400, "Enter your name.");
  if (!isEmail(email)) throw new HttpError(400, "Enter a valid email address.");
  const password = checkPassword(input.password, name, email);
  const personSlug = str(input.personSlug, 100);
  if (personSlug && !SLUG.test(personSlug)) throw new HttpError(400, "Choose your profile from the list.");
  const id = randomId();
  const res = await ctx.db
    .prepare(
      `INSERT INTO users (id, email, name, role_id, person_slug, status, password_hash, created_at, updated_at)
       SELECT ?, ?, ?, 'admin', ?, 'active', ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users)`,
    )
    .bind(id, email, name, personSlug || null, await hashPassword(password, iterationsFrom(ctx.env.PASSWORD_HASH_ITERATIONS)), ctx.now, ctx.now)
    .run();
  if (!res.meta?.changes) throw new HttpError(404, "Setup has already been completed.");
  await audit(ctx, "setup.completed", email, "", { id, name });
  const { cookie, csrf } = await startSession(ctx, id);
  return json({ ok: true, csrf }, 200, { "Set-Cookie": cookie });
}

export async function login(ctx: Ctx) {
  if (!(await rateLimit(ctx, `login:${ctx.ip}`, 20, 15 * 60_000))) throw new HttpError(429, "Too many sign-in attempts. Try again in 15 minutes.");
  const input = await body(ctx);
  const email = str(input.email, 200).toLowerCase();
  const password = typeof input.password === "string" ? input.password.slice(0, 256) : "";
  const user = email ? await ctx.db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>() : null;
  const wrong = new HttpError(401, "That email address or password is wrong.");
  if (!user || user.status !== "active" || !user.password_hash) {
    await verifyPassword(password, await dummyHash(iterationsFrom(ctx.env.PASSWORD_HASH_ITERATIONS)));
    throw wrong;
  }
  if (user.locked_until > ctx.now) throw new HttpError(429, `Too many wrong passwords. Try again in ${LOCK_MINUTES} minutes.`);
  if (!(await verifyPassword(password, user.password_hash))) {
    const failures = user.failed_logins + 1;
    if (failures >= LOCK_AFTER) {
      await ctx.db.prepare("UPDATE users SET failed_logins = 0, locked_until = ? WHERE id = ?").bind(ctx.now + LOCK_MINUTES * 60_000, user.id).run();
      await audit(ctx, "login.locked", user.email, `Locked for ${LOCK_MINUTES} minutes after ${LOCK_AFTER} wrong passwords`, null);
    } else {
      await ctx.db.prepare("UPDATE users SET failed_logins = ? WHERE id = ?").bind(failures, user.id).run();
    }
    throw wrong;
  }
  await ctx.db.prepare("UPDATE users SET failed_logins = 0, locked_until = 0 WHERE id = ?").bind(user.id).run();
  const { cookie, csrf } = await startSession(ctx, user.id);
  await audit(ctx, "login", user.email, "", { id: user.id, name: user.name });
  return json({ ok: true, csrf }, 200, { "Set-Cookie": cookie });
}

export async function logout(ctx: Ctx) {
  if (ctx.sessionId) await ctx.db.prepare("DELETE FROM sessions WHERE id = ?").bind(ctx.sessionId).run();
  return json({ ok: true }, 200, { "Set-Cookie": CLEAR_COOKIE });
}

export async function changePassword(ctx: Ctx) {
  const user = requireUser(ctx);
  const input = await body(ctx);
  const row = await ctx.db.prepare("SELECT password_hash FROM users WHERE id = ?").bind(user.id).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(typeof input.current === "string" ? input.current.slice(0, 256) : "", row.password_hash))) {
    throw new HttpError(400, "Your current password is wrong.");
  }
  const password = checkPassword(input.password, user.name, user.email);
  await ctx.db.batch([
    ctx.db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").bind(await hashPassword(password, iterationsFrom(ctx.env.PASSWORD_HASH_ITERATIONS)), ctx.now, user.id),
    ctx.db.prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?").bind(user.id, ctx.sessionId),
  ]);
  await audit(ctx, "password.changed", user.email);
  return json({ ok: true });
}

// ─── Invitations and resets ────────────────────────────────────────────────

async function findToken(ctx: Ctx, token: string) {
  if (!token || token.length > 100) return null;
  return ctx.db
    .prepare(
      `SELECT t.id, t.kind, t.user_id, u.name, u.email, u.status FROM tokens t JOIN users u ON u.id = t.user_id
       WHERE t.id = ? AND t.used_at IS NULL AND t.expires_at > ? AND u.status != 'disabled'`,
    )
    .bind(await sha256(token), ctx.now)
    .first<{ id: string; kind: string; user_id: string; name: string; email: string; status: string }>();
}

export async function checkLink(ctx: Ctx) {
  if (!(await rateLimit(ctx, `accept:${ctx.ip}`, 30, 15 * 60_000))) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const t = await findToken(ctx, str((await body(ctx)).token, 100));
  if (!t) throw new HttpError(404, "This link has expired or has already been used. Ask an admin for a new one.");
  return json({ kind: t.kind, name: t.name, email: t.email });
}

export async function acceptLink(ctx: Ctx) {
  if (!(await rateLimit(ctx, `accept:${ctx.ip}`, 30, 15 * 60_000))) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const input = await body(ctx);
  const t = await findToken(ctx, str(input.token, 100));
  if (!t) throw new HttpError(404, "This link has expired or has already been used. Ask an admin for a new one.");
  const password = checkPassword(input.password, t.name, t.email);
  const used = await ctx.db.prepare("UPDATE tokens SET used_at = ? WHERE id = ? AND used_at IS NULL").bind(ctx.now, t.id).run();
  if (!used.meta?.changes) throw new HttpError(404, "This link has already been used.");
  await ctx.db.batch([
    ctx.db.prepare("UPDATE users SET password_hash = ?, status = 'active', failed_logins = 0, locked_until = 0, updated_at = ? WHERE id = ?").bind(await hashPassword(password, iterationsFrom(ctx.env.PASSWORD_HASH_ITERATIONS)), ctx.now, t.user_id),
    ctx.db.prepare("UPDATE tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(ctx.now, t.user_id),
    ctx.db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(t.user_id),
  ]);
  await audit(ctx, t.kind === "invite" ? "invite.accepted" : "password.reset", t.email, "", { id: t.user_id, name: t.name });
  const { cookie, csrf } = await startSession(ctx, t.user_id);
  return json({ ok: true, csrf }, 200, { "Set-Cookie": cookie });
}

async function issueLink(ctx: Ctx, userId: string, kind: "invite" | "reset") {
  const token = randomToken();
  const hours = kind === "invite" ? INVITE_HOURS : RESET_HOURS;
  await ctx.db.batch([
    ctx.db.prepare("UPDATE tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(ctx.now, userId),
    ctx.db
      .prepare("INSERT INTO tokens (id, user_id, kind, expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(await sha256(token), userId, kind, ctx.now + hours * 3600_000, ctx.user?.id ?? null, ctx.now),
  ]);
  return { link: `${ctx.url.origin}/admin/#/accept/${token}`, expiresAt: ctx.now + hours * 3600_000 };
}

// ─── Staff accounts ────────────────────────────────────────────────────────

async function role(ctx: Ctx, id: string) {
  const r = await ctx.db.prepare("SELECT * FROM roles WHERE id = ?").bind(id).first<RoleRow>();
  if (!r) throw new HttpError(400, "Choose a role from the list.");
  return r;
}

/** You can only hand out, or act on someone holding, permissions you have yourself. */
function within(actor: User, perms: Permission[]) {
  return perms.every((p) => actor.permissions.includes(p));
}

async function otherActiveAdmins(ctx: Ctx, excludingUserId: string) {
  const row = await ctx.db
    .prepare("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE r.is_admin = 1 AND u.status = 'active' AND u.id != ?")
    .bind(excludingUserId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

async function target(ctx: Ctx, actor: User, id: string) {
  const row = await ctx.db
    .prepare("SELECT u.*, r.is_admin, r.permissions FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?")
    .bind(id)
    .first<UserRow & { is_admin: number; permissions: string }>();
  if (!row) throw new HttpError(404, "That account no longer exists.");
  if (!within(actor, permissionsOf(row))) throw new HttpError(403, "That account has permissions you don't have, so you can't change it.");
  return row;
}

export async function listUsers(ctx: Ctx) {
  requirePerm(ctx, "staff.manage");
  const { results } = await ctx.db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role_id AS roleId, r.name AS roleName, u.person_slug AS personSlug, u.status, u.locked_until AS lockedUntil, u.created_at AS createdAt,
        (SELECT MAX(expires_at) FROM tokens t WHERE t.user_id = u.id AND t.used_at IS NULL AND t.expires_at > ?) AS linkExpiresAt
       FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.name COLLATE NOCASE`,
    )
    .bind(ctx.now)
    .all();
  return json({ users: results });
}

export async function createUser(ctx: Ctx) {
  const actor = requirePerm(ctx, "staff.manage");
  const input = await body(ctx);
  const name = str(input.name, 100);
  const email = str(input.email, 200).toLowerCase();
  const personSlug = str(input.personSlug, 100);
  if (!name) throw new HttpError(400, "Enter their name.");
  if (!isEmail(email)) throw new HttpError(400, "Enter a valid email address. It's only used to sign in.");
  if (personSlug && !SLUG.test(personSlug)) throw new HttpError(400, "Choose their profile from the list.");
  const r = await role(ctx, str(input.roleId, 100));
  if (!within(actor, permissionsOf(r))) throw new HttpError(403, "You can't give someone a role with permissions you don't have.");
  if (await ctx.db.prepare("SELECT 1 AS x FROM users WHERE email = ?").bind(email).first()) throw new HttpError(409, "Someone already has an account with that email address.");
  const id = randomId();
  await ctx.db
    .prepare("INSERT INTO users (id, email, name, role_id, person_slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'invited', ?, ?)")
    .bind(id, email, name, r.id, personSlug || null, ctx.now, ctx.now)
    .run();
  const link = await issueLink(ctx, id, "invite");
  await audit(ctx, "user.invited", email, { role: r.name, profile: personSlug || null });
  return json({ id, ...link });
}

export async function updateUser(ctx: Ctx, id: string) {
  const actor = requirePerm(ctx, "staff.manage");
  const row = await target(ctx, actor, id);
  const input = await body(ctx);
  const changes: Record<string, unknown> = {};
  let name = row.name;
  let roleId = row.role_id;
  let personSlug = row.person_slug;
  let status = row.status;

  if (input.name !== undefined) {
    name = str(input.name, 100);
    if (!name) throw new HttpError(400, "Enter their name.");
  }
  if (input.personSlug !== undefined) {
    personSlug = str(input.personSlug, 100) || null;
    if (personSlug && !SLUG.test(personSlug)) throw new HttpError(400, "Choose their profile from the list.");
  }
  if (input.roleId !== undefined && input.roleId !== row.role_id) {
    if (id === actor.id) throw new HttpError(403, "You can't change your own role.");
    const r = await role(ctx, str(input.roleId, 100));
    if (!within(actor, permissionsOf(r))) throw new HttpError(403, "You can't give someone a role with permissions you don't have.");
    if (row.is_admin && !r.is_admin && (await otherActiveAdmins(ctx, id)) === 0) throw new HttpError(409, "There must always be at least one active admin.");
    roleId = r.id;
    changes.role = r.name;
  }
  if (input.status !== undefined) {
    const wanted = input.status === "disabled" ? "disabled" : "enabled";
    if (id === actor.id) throw new HttpError(403, "You can't disable your own account.");
    if (wanted === "disabled" && row.status !== "disabled") {
      if (row.is_admin && (await otherActiveAdmins(ctx, id)) === 0) throw new HttpError(409, "There must always be at least one active admin.");
      status = "disabled";
    } else if (wanted === "enabled" && row.status === "disabled") {
      status = row.password_hash ? "active" : "invited";
    }
    if (status !== row.status) changes.status = status;
  }
  if (name !== row.name) changes.name = name;
  if (personSlug !== row.person_slug) changes.profile = personSlug;

  await ctx.db
    .prepare("UPDATE users SET name = ?, role_id = ?, person_slug = ?, status = ?, updated_at = ? WHERE id = ?")
    .bind(name, roleId, personSlug, status, ctx.now, id)
    .run();
  if (status === "disabled" || roleId !== row.role_id) await ctx.db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
  if (Object.keys(changes).length) await audit(ctx, "user.updated", row.email, changes);
  return json({ ok: true });
}

export async function userLink(ctx: Ctx, id: string) {
  const actor = requirePerm(ctx, "staff.manage");
  const row = await target(ctx, actor, id);
  if (row.status === "disabled") throw new HttpError(409, "Enable the account first.");
  const kind = row.password_hash ? "reset" : "invite";
  const link = await issueLink(ctx, id, kind);
  await audit(ctx, kind === "invite" ? "user.invite_resent" : "user.reset_link", row.email);
  return json({ kind, ...link });
}

export async function deleteUser(ctx: Ctx, id: string) {
  const actor = requirePerm(ctx, "staff.manage");
  if (id === actor.id) throw new HttpError(403, "You can't delete your own account.");
  const row = await target(ctx, actor, id);
  if (row.is_admin && row.status === "active" && (await otherActiveAdmins(ctx, id)) === 0) throw new HttpError(409, "There must always be at least one active admin.");
  await ctx.db.batch([
    ctx.db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
    ctx.db.prepare("DELETE FROM tokens WHERE user_id = ?").bind(id),
    ctx.db.prepare("DELETE FROM pending_edits WHERE submitted_by = ?").bind(id),
    ctx.db.prepare("DELETE FROM users WHERE id = ?").bind(id),
  ]);
  await audit(ctx, "user.deleted", row.email);
  return json({ ok: true });
}

/** Ends the sessions of accounts linked to a profile marked inactive or departed (keeping at least one admin). */
export async function disableAccountsFor(ctx: Ctx, personSlug: string) {
  const { results } = await ctx.db
    .prepare("SELECT u.id, u.email, r.is_admin FROM users u JOIN roles r ON r.id = u.role_id WHERE u.person_slug = ? AND u.status != 'disabled'")
    .bind(personSlug)
    .all<{ id: string; email: string; is_admin: number }>();
  for (const u of results) {
    if (u.is_admin && (await otherActiveAdmins(ctx, u.id)) === 0) continue;
    await ctx.db.batch([
      ctx.db.prepare("UPDATE users SET status = 'disabled', updated_at = ? WHERE id = ?").bind(ctx.now, u.id),
      ctx.db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id),
    ]);
    await audit(ctx, "user.disabled", u.email, "Their profile was marked inactive or departed");
  }
}

// ─── Roles ─────────────────────────────────────────────────────────────────

function roleJson(r: RoleRow & { users?: number }) {
  return { id: r.id, name: r.name, description: r.description, permissions: permissionsOf(r), builtIn: r.built_in === 1, isAdmin: r.is_admin === 1, users: r.users ?? 0 };
}

export async function listRoles(ctx: Ctx) {
  requirePerm(ctx, "roles.manage", "staff.manage");
  const { results } = await ctx.db
    .prepare("SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) AS users FROM roles r ORDER BY r.is_admin DESC, r.built_in DESC, r.name COLLATE NOCASE")
    .all<RoleRow & { users: number }>();
  return json({ roles: results.map(roleJson) });
}

function readPermissions(v: unknown): Permission[] {
  if (!Array.isArray(v)) throw new HttpError(400, "Choose the role's permissions.");
  return [...new Set(v.filter(isPermission))];
}

export async function createRole(ctx: Ctx) {
  const actor = requirePerm(ctx, "roles.manage");
  const input = await body(ctx);
  const name = str(input.name, 60);
  if (!name) throw new HttpError(400, "Give the role a name.");
  const permissions = readPermissions(input.permissions);
  if (!within(actor, permissions)) throw new HttpError(403, "You can't give a role permissions you don't have.");
  if (await ctx.db.prepare("SELECT 1 AS x FROM roles WHERE name = ?").bind(name).first()) throw new HttpError(409, "A role with that name already exists.");
  const id = `role-${randomToken(6).toLowerCase()}`;
  await ctx.db
    .prepare("INSERT INTO roles (id, name, description, permissions, built_in, is_admin, created_at) VALUES (?, ?, ?, ?, 0, 0, ?)")
    .bind(id, name, str(input.description, 300), JSON.stringify(permissions), ctx.now)
    .run();
  await audit(ctx, "role.created", name, { permissions });
  return json({ id });
}

export async function updateRole(ctx: Ctx, id: string) {
  const actor = requirePerm(ctx, "roles.manage");
  const r = await role(ctx, id);
  if (r.is_admin) throw new HttpError(403, "The Admin role always has every permission and can't be changed.");
  if (!within(actor, permissionsOf(r))) throw new HttpError(403, "This role has permissions you don't have, so you can't change it.");
  const input = await body(ctx);
  const name = r.built_in ? r.name : str(input.name, 60) || r.name;
  const permissions = input.permissions === undefined ? permissionsOf(r) : readPermissions(input.permissions);
  if (!within(actor, permissions)) throw new HttpError(403, "You can't give a role permissions you don't have.");
  if (name !== r.name && (await ctx.db.prepare("SELECT 1 AS x FROM roles WHERE name = ? AND id != ?").bind(name, id).first())) throw new HttpError(409, "A role with that name already exists.");
  const description = input.description === undefined ? r.description : str(input.description, 300);
  await ctx.db.prepare("UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?").bind(name, description, JSON.stringify(permissions), id).run();
  await audit(ctx, "role.updated", name, { before: permissionsOf(r), after: permissions });
  return json({ ok: true });
}

export async function deleteRole(ctx: Ctx, id: string) {
  const actor = requirePerm(ctx, "roles.manage");
  const r = await role(ctx, id);
  if (r.built_in) throw new HttpError(403, "Built-in roles can't be deleted.");
  if (!within(actor, permissionsOf(r))) throw new HttpError(403, "This role has permissions you don't have, so you can't delete it.");
  const used = await ctx.db.prepare("SELECT COUNT(*) AS n FROM users WHERE role_id = ?").bind(id).first<{ n: number }>();
  if (used?.n) throw new HttpError(409, "Move everyone off this role before deleting it.");
  await ctx.db.prepare("DELETE FROM roles WHERE id = ?").bind(id).run();
  await audit(ctx, "role.deleted", r.name);
  return json({ ok: true });
}

// ─── Activity log ──────────────────────────────────────────────────────────

export async function auditLog(ctx: Ctx) {
  requirePerm(ctx, "audit.view");
  const before = Number(ctx.url.searchParams.get("before")) || Number.MAX_SAFE_INTEGER;
  const { results } = await ctx.db
    .prepare("SELECT id, at, user_name AS userName, action, target, detail, ip FROM audit_log WHERE id < ? ORDER BY id DESC LIMIT 50")
    .bind(before)
    .all();
  return json({ entries: results });
}
