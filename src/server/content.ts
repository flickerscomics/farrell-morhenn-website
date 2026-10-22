// Editing the site's content files, uploads, and the approval queue for
// profile changes.

import { randomId, randomToken } from "./crypto";
import { base64ToBytes, bytesToBase64, textToBase64, type Repo } from "./github";
import { HttpError, audit, body, can, json, rateLimit, requirePerm, requireUser, str, type Ctx, type User } from "./http";
import { disableAccountsFor } from "./accounts";
import { PROFILE_DETAIL_FIELDS } from "./permissions";
import { changedFields, checkSpecialFields, normalizeFields, parseFile, parseSchema, serializeFile, type Field, type Section } from "./schema";

type Raw = Record<string, unknown>;

// ─── Schema and access ─────────────────────────────────────────────────────

const schemaCache = new WeakMap<Repo, { at: number; sections: Section[] }>();

async function sections(ctx: Ctx): Promise<Section[]> {
  const repo = ctx.repo();
  const hit = schemaCache.get(repo);
  if (hit && ctx.now - hit.at < 60_000) return hit.sections;
  const file = await repo.read(".pages.yml");
  if (!file) throw new HttpError(500, "The editing configuration (.pages.yml) is missing.");
  const list = parseSchema(file.text);
  schemaCache.set(repo, { at: ctx.now, sections: list });
  return list;
}

async function section(ctx: Ctx, name: unknown): Promise<Section> {
  const s = (await sections(ctx)).find((x) => x.name === name);
  if (!s) throw new HttpError(404, "That section doesn't exist.");
  return s;
}

interface Access {
  view: boolean;
  create: boolean;
  /** Fields this person can see but not change. */
  restricted: string[];
}

function access(user: User, s: Section): Access {
  if (s.access === "profile") {
    const view = can(user, "profile.edit_own") || can(user, "profile.edit_any") || can(user, "staff.manage");
    return { view, create: can(user, "staff.manage") && can(user, "profile.edit_details"), restricted: can(user, "profile.edit_details") ? [] : PROFILE_DETAIL_FIELDS };
  }
  if (s.access === "press") {
    const view = can(user, "press.write") || can(user, "press.publish");
    return { view, create: can(user, "press.write"), restricted: [] };
  }
  const ok = can(user, s.access);
  return { view: ok, create: ok && s.kind === "collection", restricted: [] };
}

function canEditPerson(user: User, slug: string) {
  return can(user, "profile.edit_any") || (can(user, "profile.edit_own") && !!user.personSlug && user.personSlug === slug);
}

function slugOfFile(file: string) {
  return file.replace(/\.md$/, "");
}

function pathFor(s: Section, file: unknown): { path: string; file: string } {
  if (s.kind === "file") return { path: s.path, file: "" };
  const f = typeof file === "string" ? file : "";
  if (!/^[a-z0-9][a-z0-9._-]*\.md$/i.test(f) || f.includes("..")) throw new HttpError(400, "That entry doesn't exist.");
  return { path: `${s.path}/${f}`, file: f };
}

/** Whether this person may change this entry, and why not. */
function editProblem(user: User, s: Section, file: string, current: Raw): string | null {
  const a = access(user, s);
  if (!a.view) return "You don't have permission to edit this.";
  if (s.access === "profile" && !canEditPerson(user, String(current.slug ?? slugOfFile(file)))) return "You can only edit your own profile.";
  if (s.access === "press" && !can(user, "press.publish") && current.status !== "DRAFT") return "This release is live or archived. Only someone who can publish press releases can change it.";
  if (s.access === "press" && !can(user, "press.write") && !can(user, "press.publish")) return "You don't have permission to edit press releases.";
  return null;
}

// ─── Reading ───────────────────────────────────────────────────────────────

export async function schema(ctx: Ctx) {
  const user = requireUser(ctx);
  const visible = (await sections(ctx))
    .map((s) => ({ s, a: access(user, s) }))
    .filter(({ a }) => a.view)
    .map(({ s, a }) => ({
      name: s.name,
      label: s.label,
      group: s.group,
      kind: s.kind,
      primary: s.primary,
      fields: s.fields,
      canCreate: a.create,
      restricted: a.restricted,
    }));
  return json({ sections: visible });
}

async function readAll(repo: Repo, s: Section) {
  const entries = (await repo.list(s.path)).filter((e) => e.type === "file" && e.name.endsWith(".md"));
  const files = await Promise.all(entries.map((e) => repo.read(e.path)));
  return files.flatMap((f, i) => (f ? [{ file: entries[i].name, sha: f.sha, values: parseFile(s, f.text) }] : []));
}

const SUMMARY_FIELDS = ["title", "status", "releaseDate", "publishedOn", "draft", "published", "order"];

export async function items(ctx: Ctx) {
  const user = requireUser(ctx);
  const s = await section(ctx, ctx.url.searchParams.get("section"));
  if (!access(user, s).view || s.kind !== "collection") throw new HttpError(403, "You don't have permission to see this.");
  const all = await readAll(ctx.repo(), s);
  const list = all
    .filter(({ file, values }) => s.access !== "profile" || can(user, "profile.edit_any") || can(user, "staff.manage") || canEditPerson(user, String(values.slug ?? slugOfFile(file))))
    .map(({ file, values }) => ({
      file,
      label: String(values[s.primary] ?? file),
      summary: Object.fromEntries(SUMMARY_FIELDS.filter((k) => k in values && k !== s.primary).map((k) => [k, values[k]])),
      canEdit: !editProblem(user, s, file, values),
    }));
  return json({ items: list });
}

async function ownPending(ctx: Ctx, path: string) {
  return ctx.db
    .prepare("SELECT id, changes, created_at AS createdAt FROM pending_edits WHERE path = ? AND submitted_by = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1")
    .bind(path, ctx.user?.id ?? "")
    .first<{ id: string; changes: string; createdAt: number }>();
}

export async function item(ctx: Ctx) {
  const user = requireUser(ctx);
  const s = await section(ctx, ctx.url.searchParams.get("section"));
  const { path, file } = pathFor(s, ctx.url.searchParams.get("file"));
  const found = await ctx.repo().read(path);
  if (!found) throw new HttpError(404, "That entry doesn't exist any more.");
  const values = parseFile(s, found.text);
  const problem = editProblem(user, s, file, values);
  const canView = access(user, s).view && (s.access !== "profile" || !problem || can(user, "staff.manage"));
  if (!canView) throw new HttpError(403, problem ?? "You don't have permission to see this.");
  const pending = s.access === "profile" ? await ownPending(ctx, path) : null;
  return json({
    values,
    sha: found.sha,
    file,
    canEdit: !problem,
    restricted: access(user, s).restricted,
    needsApproval: s.access === "profile" && !can(user, "profile.publish"),
    pending: pending ? { id: pending.id, createdAt: pending.createdAt, fields: (JSON.parse(pending.changes) as { fields: Raw }).fields } : null,
  });
}

export async function options(ctx: Ctx) {
  requireUser(ctx);
  const s = await section(ctx, ctx.url.searchParams.get("collection"));
  if (s.kind !== "collection") throw new HttpError(400, "That isn't a list.");
  const all = await readAll(ctx.repo(), s);
  return json({
    options: all
      .map(({ file, values }) => ({ value: String(values.slug ?? slugOfFile(file)), label: String(values[s.primary] ?? file) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  });
}

// ─── Saving ────────────────────────────────────────────────────────────────

function editableFields(s: Section, restricted: string[]): Field[] {
  return s.fields.filter((f) => !restricted.includes(f.name));
}

/** Writes the entry, renaming the file when a collection entry's web address changed. Returns the final path. */
async function commit(ctx: Ctx, s: Section, path: string, sha: string | undefined, values: Raw, message: string): Promise<string> {
  const repo = ctx.repo();
  let target = path;
  if (s.kind === "collection") {
    const wanted = `${s.path}/${values.slug}.md`;
    if (wanted !== path) {
      if (await repo.read(wanted)) throw new HttpError(409, "Another entry already uses that web address.");
      target = wanted;
    }
  }
  const content = textToBase64(serializeFile(s, values));
  if (target === path) {
    await repo.write(path, content, message, sha);
  } else {
    await repo.write(target, content, message);
    if (sha) await repo.remove(path, sha, message);
  }
  return target;
}

/** Follow-up for profile changes: renamed web addresses and people who have left. */
async function afterProfileChange(ctx: Ctx, before: Raw, after: Raw) {
  if (before.slug && after.slug && before.slug !== after.slug) {
    await ctx.db.prepare("UPDATE users SET person_slug = ? WHERE person_slug = ?").bind(after.slug, before.slug).run();
    await ctx.db.prepare("UPDATE pending_edits SET path = ? WHERE path = ? AND status = 'pending'").bind(`content/people/${after.slug}.md`, `content/people/${before.slug}.md`).run();
  }
  if ((after.status === "DEPARTED" || after.status === "INACTIVE") && before.status !== after.status) {
    await disableAccountsFor(ctx, String(after.slug));
  }
}

export async function save(ctx: Ctx) {
  const user = requireUser(ctx);
  const input = await body(ctx);
  const s = await section(ctx, input.section);
  const { path, file } = pathFor(s, input.file);
  const found = await ctx.repo().read(path);
  if (!found) throw new HttpError(404, "That entry doesn't exist any more.");
  if (str(input.sha, 100) !== found.sha) throw new HttpError(409, "Someone else changed this since you opened it. Reload the page to see the latest version, then make your changes again.");
  const current = parseFile(s, found.text);
  const problem = editProblem(user, s, file, current);
  if (problem) throw new HttpError(403, problem);
  const a = access(user, s);
  const submitted = input.values && typeof input.values === "object" ? (input.values as Raw) : {};
  const next = normalizeFields(editableFields(s, a.restricted), submitted, current);
  checkSpecialFields(s, next);
  if (s.access === "press" && !can(user, "press.publish") && next.status !== "DRAFT") {
    throw new HttpError(403, "You can save press releases as drafts. Someone who can publish will need to set the status.");
  }
  const changed = changedFields(current, next);
  if (changed.length === 0) return json({ ok: true, unchanged: true, file });

  if (s.access === "profile" && !can(user, "profile.publish")) {
    const changes = { fields: Object.fromEntries(changed.map((k) => [k, next[k] ?? null])), before: Object.fromEntries(changed.map((k) => [k, current[k] ?? null])) };
    await ctx.db.prepare("UPDATE pending_edits SET status = 'replaced', decided_at = ? WHERE path = ? AND submitted_by = ? AND status = 'pending'").bind(ctx.now, path, user.id).run();
    const id = randomId();
    await ctx.db
      .prepare("INSERT INTO pending_edits (id, section, path, label, submitted_by, changes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)")
      .bind(id, s.name, path, String(current.fullName ?? current[s.primary] ?? file), user.id, JSON.stringify(changes), ctx.now)
      .run();
    await audit(ctx, "profile.submitted", path, { fields: changed });
    return json({ ok: true, pending: true, id, file });
  }

  const target = await commit(ctx, s, path, found.sha, next, `Update ${path} (${user.name}, admin area)`);
  if (s.access === "profile") await afterProfileChange(ctx, current, next);
  await audit(ctx, "content.updated", target, { fields: changed });
  return json({ ok: true, file: target.split("/").pop() ?? "" });
}

export async function create(ctx: Ctx) {
  const user = requireUser(ctx);
  const input = await body(ctx);
  const s = await section(ctx, input.section);
  if (s.kind !== "collection" || !access(user, s).create) throw new HttpError(403, "You don't have permission to add entries here.");
  const next = normalizeFields(s.fields, input.values && typeof input.values === "object" ? (input.values as Raw) : {}, {});
  checkSpecialFields(s, next);
  if (s.access === "press" && !can(user, "press.publish") && next.status !== "DRAFT") {
    throw new HttpError(403, "You can save press releases as drafts. Someone who can publish will need to set the status.");
  }
  const path = `${s.path}/${next.slug}.md`;
  if (await ctx.repo().read(path)) throw new HttpError(409, "Another entry already uses that web address.");
  await ctx.repo().write(path, textToBase64(serializeFile(s, next)), `Add ${path} (${user.name}, admin area)`);
  await audit(ctx, "content.created", path);
  return json({ ok: true, file: `${next.slug}.md` });
}

export async function remove(ctx: Ctx) {
  const user = requireUser(ctx);
  const input = await body(ctx);
  const s = await section(ctx, input.section);
  if (s.kind !== "collection") throw new HttpError(403, "This can't be deleted.");
  const { path, file } = pathFor(s, input.file);
  const found = await ctx.repo().read(path);
  if (!found) throw new HttpError(404, "That entry doesn't exist any more.");
  const current = parseFile(s, found.text);
  const allowed =
    s.access === "profile"
      ? can(user, "staff.manage")
      : s.access === "press"
        ? can(user, "press.publish") || (can(user, "press.write") && current.status === "DRAFT")
        : can(user, s.access);
  if (!allowed) throw new HttpError(403, "You don't have permission to delete this.");
  if (str(input.sha, 100) !== found.sha) throw new HttpError(409, "Someone else changed this since you opened it. Reload and try again.");
  await ctx.repo().remove(path, found.sha, `Delete ${path} (${user.name}, admin area)`);
  await ctx.db.prepare("UPDATE pending_edits SET status = 'withdrawn', decided_at = ? WHERE path = ? AND status = 'pending'").bind(ctx.now, path).run();
  if (s.access === "profile") await ctx.db.prepare("UPDATE users SET person_slug = NULL WHERE person_slug = ?").bind(String(current.slug ?? slugOfFile(file))).run();
  await audit(ctx, "content.deleted", path);
  return json({ ok: true });
}

// ─── Uploads ───────────────────────────────────────────────────────────────

function findField(fields: Field[], dotted: string): Field | undefined {
  const [head, ...rest] = dotted.split(".");
  const f = fields.find((x) => x.name === head);
  if (!f || rest.length === 0) return f;
  return findField(f.fields ?? [], rest.join("."));
}

function sniff(bytes: Uint8Array): string | null {
  const at = (i: number, ...b: number[]) => b.every((x, j) => bytes[i + j] === x);
  if (at(0, 0xff, 0xd8, 0xff)) return "jpg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "gif";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return "pdf";
  return null;
}

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export async function upload(ctx: Ctx) {
  const user = requireUser(ctx);
  const input = await body(ctx);
  const s = await section(ctx, input.section);
  if (!access(user, s).view) throw new HttpError(403, "You don't have permission to upload here.");
  const field = findField(s.fields, str(input.field, 100));
  if (!field || (field.type !== "image" && field.type !== "file")) throw new HttpError(400, "That field doesn't take files.");
  const data = typeof input.data === "string" ? input.data : "";
  if (data.length > Math.ceil(MAX_UPLOAD_BYTES / 3) * 4 + 8) throw new HttpError(413, "Files can be up to 3 MB.");
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(data);
  } catch {
    throw new HttpError(400, "The file couldn't be read.");
  }
  if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) throw new HttpError(413, "Files can be up to 3 MB.");
  const kind = sniff(bytes);
  const allowed = field.type === "image" ? ["jpg", "png", "gif", "webp"] : (field.options?.extensions ?? ["pdf", "jpg", "jpeg", "png", "webp"]).map((e) => (e === "jpeg" ? "jpg" : e));
  if (!kind || !allowed.includes(kind)) throw new HttpError(400, `Upload a ${allowed.map((e) => e.toUpperCase()).join(", ")} file.`);
  const dir = (field.options?.path ?? "public/images").replace(/\/+$/, "");
  if (!/^public\/images(\/[a-z0-9_-]+)*$/.test(dir)) throw new HttpError(500, "The upload folder for this field isn't allowed.");
  if (!(await rateLimit(ctx, `upload:${user.id}`, 60, 3600_000))) throw new HttpError(429, "Too many uploads. Try again later.");
  const base =
    str(input.name, 120)
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "upload";
  const path = `${dir}/${base}-${randomToken(4).toLowerCase().replace(/[^a-z0-9]/g, "x")}.${kind}`;
  await ctx.repo().write(path, bytesToBase64(bytes), `Upload ${path} (${user.name}, admin area)`);
  await audit(ctx, "file.uploaded", path);
  return json({ path: path.replace(/^public/, "") });
}

// ─── Approvals ─────────────────────────────────────────────────────────────

type PendingRow = {
  id: string;
  section: string;
  path: string;
  label: string;
  submitted_by: string;
  submitter: string | null;
  changes: string;
  status: string;
  reason: string;
  created_at: number;
  decider: string | null;
  decided_at: number | null;
};

function pendingJson(r: PendingRow) {
  const c = JSON.parse(r.changes) as { fields: Raw; before: Raw };
  return {
    id: r.id,
    section: r.section,
    path: r.path,
    label: r.label,
    submittedBy: r.submitter ?? "Removed account",
    submittedById: r.submitted_by,
    fields: c.fields,
    before: c.before,
    status: r.status,
    reason: r.reason,
    createdAt: r.created_at,
    decidedBy: r.decider,
    decidedAt: r.decided_at,
  };
}

const PENDING_SELECT = `SELECT p.*, u.name AS submitter, d.name AS decider FROM pending_edits p
  LEFT JOIN users u ON u.id = p.submitted_by LEFT JOIN users d ON d.id = p.decided_by`;

export async function approvals(ctx: Ctx) {
  const user = requireUser(ctx);
  const approver = can(user, "profile.approve");
  const pending = await ctx.db
    .prepare(`${PENDING_SELECT} WHERE p.status = 'pending' ${approver ? "" : "AND p.submitted_by = ?"} ORDER BY p.created_at`)
    .bind(...(approver ? [] : [user.id]))
    .all<PendingRow>();
  const recent = await ctx.db
    .prepare(`${PENDING_SELECT} WHERE p.status IN ('approved', 'rejected') ${approver ? "" : "AND p.submitted_by = ?"} ORDER BY p.decided_at DESC LIMIT 20`)
    .bind(...(approver ? [] : [user.id]))
    .all<PendingRow>();
  return json({ canApprove: approver, pending: pending.results.map(pendingJson), recent: recent.results.map(pendingJson) });
}

async function pendingRow(ctx: Ctx, id: string) {
  const row = await ctx.db.prepare(`${PENDING_SELECT} WHERE p.id = ?`).bind(id).first<PendingRow>();
  if (!row || row.status !== "pending") throw new HttpError(404, "That change has already been dealt with.");
  return row;
}

export async function approve(ctx: Ctx, id: string) {
  const user = requirePerm(ctx, "profile.approve");
  const row = await pendingRow(ctx, id);
  if (row.submitted_by === user.id) throw new HttpError(403, "You can't approve your own changes. Ask another admin.");
  const s = await section(ctx, row.section);
  const found = await ctx.repo().read(row.path);
  if (!found) throw new HttpError(409, "That profile no longer exists. Reject the change instead.");
  const current = parseFile(s, found.text);
  const next = { ...current, ...(JSON.parse(row.changes) as { fields: Raw }).fields };
  for (const [k, v] of Object.entries(next)) if (v === null) delete next[k];
  checkSpecialFields(s, next);
  const claimed = await ctx.db.prepare("UPDATE pending_edits SET status = 'approved', decided_by = ?, decided_at = ? WHERE id = ? AND status = 'pending'").bind(user.id, ctx.now, id).run();
  if (!claimed.meta?.changes) throw new HttpError(404, "That change has already been dealt with.");
  try {
    await commit(ctx, s, row.path, found.sha, next, `Update ${row.path} (submitted by ${row.submitter ?? "a former staff member"}, approved by ${user.name})`);
  } catch (e) {
    await ctx.db.prepare("UPDATE pending_edits SET status = 'pending', decided_by = NULL, decided_at = NULL WHERE id = ?").bind(id).run();
    throw e;
  }
  await afterProfileChange(ctx, current, next);
  await audit(ctx, "profile.approved", row.path, { submittedBy: row.submitter, fields: Object.keys((JSON.parse(row.changes) as { fields: Raw }).fields) });
  return json({ ok: true });
}

export async function reject(ctx: Ctx, id: string) {
  const user = requirePerm(ctx, "profile.approve");
  const row = await pendingRow(ctx, id);
  const reason = str((await body(ctx)).reason, 1000);
  await ctx.db.prepare("UPDATE pending_edits SET status = 'rejected', reason = ?, decided_by = ?, decided_at = ? WHERE id = ? AND status = 'pending'").bind(reason, user.id, ctx.now, id).run();
  await audit(ctx, "profile.rejected", row.path, { submittedBy: row.submitter, reason });
  return json({ ok: true });
}

export async function withdraw(ctx: Ctx, id: string) {
  const user = requireUser(ctx);
  const row = await pendingRow(ctx, id);
  if (row.submitted_by !== user.id) throw new HttpError(403, "Only the person who made a change can withdraw it.");
  await ctx.db.prepare("UPDATE pending_edits SET status = 'withdrawn', decided_at = ? WHERE id = ? AND status = 'pending'").bind(ctx.now, id).run();
  await audit(ctx, "profile.withdrawn", row.path);
  return json({ ok: true });
}
