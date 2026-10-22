// Test doubles for the admin API: D1 on Node's built-in SQLite, and an
// in-memory repository seeded with the sample content.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { handle } from "@/server/api";
import type { D1Database, D1PreparedStatement, D1Result } from "@/server/db";
import { ConflictError, base64ToText, type Repo, type RepoEntry, type RepoFile } from "@/server/github";
import type { Env } from "@/server/http";

type Value = string | number | null;

class Statement implements D1PreparedStatement {
  constructor(
    private db: DatabaseSync,
    private sql: string,
    private params: Value[] = [],
  ) {}
  bind(...values: unknown[]) {
    return new Statement(this.db, this.sql, values.map((v) => (v === undefined ? null : typeof v === "boolean" ? Number(v) : (v as Value))));
  }
  async first<T>() {
    return ((this.db.prepare(this.sql).get(...this.params) as T | undefined) ?? null) as T | null;
  }
  async all<T>(): Promise<D1Result<T>> {
    return { results: this.db.prepare(this.sql).all(...this.params) as T[] };
  }
  async run(): Promise<D1Result> {
    const r = this.db.prepare(this.sql).run(...this.params);
    return { results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export function memoryD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  return {
    prepare: (sql) => new Statement(db, sql),
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

export class MemoryRepo implements Repo {
  files = new Map<string, { text: string; sha: string }>();
  commits: string[] = [];
  private n = 0;

  constructor() {
    const root = process.cwd();
    this.files.set(".pages.yml", { text: fs.readFileSync(path.join(root, ".pages.yml"), "utf8"), sha: this.sha() });
    const fixtures = path.join(root, "tests/fixtures/content");
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else this.files.set(`content/${path.relative(fixtures, full).split(path.sep).join("/")}`, { text: fs.readFileSync(full, "utf8"), sha: this.sha() });
      }
    };
    walk(fixtures);
  }

  private sha() {
    return `sha${++this.n}`;
  }

  async read(p: string): Promise<RepoFile | null> {
    const f = this.files.get(p);
    return f ? { path: p, sha: f.sha, text: f.text } : null;
  }

  async list(dir: string): Promise<RepoEntry[]> {
    const prefix = `${dir}/`;
    return [...this.files.entries()]
      .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
      .map(([p, f]) => ({ name: p.slice(prefix.length), path: p, sha: f.sha, type: "file" as const }));
  }

  async write(p: string, base64: string, message: string, sha?: string) {
    const existing = this.files.get(p);
    if (existing ? existing.sha !== sha : sha) throw new ConflictError(p);
    const next = { text: p.startsWith("content/") || p.endsWith(".yml") ? base64ToText(base64) : `<binary ${base64.length}>`, sha: this.sha() };
    this.files.set(p, next);
    this.commits.push(message);
    return { sha: next.sha };
  }

  async remove(p: string, sha: string, message: string) {
    const existing = this.files.get(p);
    if (!existing || existing.sha !== sha) throw new ConflictError(p);
    this.files.delete(p);
    this.commits.push(message);
  }
}

export const ORIGIN = "https://farrell-morhenn.com";
export const SETUP_CODE = "correct-horse-battery-staple";

/** A test site: one database and repository, and a clock that tests can move. */
export function site(envOverrides: Partial<Env> = {}) {
  const env: Env = { DB: memoryD1(), ADMIN_SETUP_CODE: SETUP_CODE, ...envOverrides };
  const repo = new MemoryRepo();
  const clock = { now: Date.UTC(2026, 9, 22, 12) };

  /** A browser: keeps its own session cookie and CSRF token. */
  function browser(ip = "203.0.113.1") {
    let cookie = "";
    let csrf = "";
    async function call(method: string, p: string, data?: unknown, extra: { origin?: string | null; csrf?: string | null } = {}) {
      const headers: Record<string, string> = { "CF-Connecting-IP": ip };
      if (method !== "GET" && extra.origin !== null) headers.Origin = extra.origin ?? ORIGIN;
      if (cookie) headers.Cookie = cookie;
      if (method !== "GET" && extra.csrf !== null && (extra.csrf ?? csrf)) headers["X-CSRF-Token"] = extra.csrf ?? csrf;
      if (data !== undefined) headers["Content-Type"] = "application/json";
      const res = await handle(new Request(`${ORIGIN}/api/${p}`, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) }), env, { repo, now: clock.now });
      const set = res.headers.get("Set-Cookie");
      if (set) cookie = /Max-Age=0/.test(set) ? "" : set.split(";")[0];
      const json = (await res.json()) as Record<string, unknown> & { error?: string };
      if (typeof json.csrf === "string") csrf = json.csrf;
      return { status: res.status, json, setCookie: set };
    }
    return {
      call,
      get: (p: string) => call("GET", p),
      post: (p: string, d: unknown = {}, extra = {}) => call("POST", p, d, extra),
      put: (p: string, d: unknown) => call("PUT", p, d),
      patch: (p: string, d: unknown) => call("PATCH", p, d),
      del: (p: string) => call("DELETE", p),
      get cookie() {
        return cookie;
      },
      /** Pretends to be another browser by reusing its session cookie (but not its CSRF token). */
      useCookie(c: string) {
        cookie = c;
      },
    };
  }

  return { env, repo, clock, browser };
}

export const ADMIN = { name: "Marty Farrell", email: "marty@example.com", password: "a long and unusual passphrase", personSlug: "marty-farrell" };

/** A site with its first admin signed in. */
export async function withAdmin(envOverrides: Partial<Env> = {}) {
  const s = site(envOverrides);
  const admin = s.browser();
  const res = await admin.post("setup", { code: SETUP_CODE, ...ADMIN });
  if (res.status !== 200) throw new Error(`setup failed: ${JSON.stringify(res.json)}`);
  return { ...s, admin };
}

/** Invites someone with the given role and has them accept, returning their signed-in browser. */
export async function invite(s: Awaited<ReturnType<typeof withAdmin>>, who: { name: string; email: string; roleId: string; personSlug?: string }, ip = "198.51.100.7") {
  const res = await s.admin.post("users", who);
  if (res.status !== 200) throw new Error(`invite failed: ${JSON.stringify(res.json)}`);
  const token = String(res.json.link).split("#/accept/")[1];
  const b = s.browser(ip);
  const ok = await b.post("accept", { token, password: "another long passphrase here" });
  if (ok.status !== 200) throw new Error(`accept failed: ${JSON.stringify(ok.json)}`);
  return { browser: b, id: String(res.json.id), token };
}
