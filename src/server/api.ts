// The admin API, served by Cloudflare Pages Functions at /api/*
// (functions/api/[[path]].ts). Every request is checked here: same-origin for
// anything that changes data, a signed-in session, and the session's CSRF
// token. Permission checks live in the handlers.

import * as accounts from "./accounts";
import * as content from "./content";
import { safeEqual } from "./crypto";
import { ConflictError, type Repo } from "./github";
import { HttpError, ensureReady, json, loadSession, repoFor, type Ctx, type Env } from "./http";
import { ValidationError } from "./schema";

type Handler = (ctx: Ctx, id: string) => Promise<Response>;

/** Requests that work without signing in (they set up a session themselves). */
const OPEN = new Set(["POST login", "POST setup", "POST accept/check", "POST accept", "GET session"]);

const ROUTES: [string, RegExp, Handler][] = [
  ["GET", /^session$/, (c) => accounts.session(c)],
  ["POST", /^setup$/, (c) => accounts.setup(c)],
  ["POST", /^login$/, (c) => accounts.login(c)],
  ["POST", /^logout$/, (c) => accounts.logout(c)],
  ["POST", /^password$/, (c) => accounts.changePassword(c)],
  ["POST", /^accept\/check$/, (c) => accounts.checkLink(c)],
  ["POST", /^accept$/, (c) => accounts.acceptLink(c)],

  ["GET", /^users$/, (c) => accounts.listUsers(c)],
  ["POST", /^users$/, (c) => accounts.createUser(c)],
  ["PATCH", /^users\/([\w-]+)$/, (c, id) => accounts.updateUser(c, id)],
  ["POST", /^users\/([\w-]+)\/link$/, (c, id) => accounts.userLink(c, id)],
  ["DELETE", /^users\/([\w-]+)$/, (c, id) => accounts.deleteUser(c, id)],

  ["GET", /^roles$/, (c) => accounts.listRoles(c)],
  ["POST", /^roles$/, (c) => accounts.createRole(c)],
  ["PATCH", /^roles\/([\w-]+)$/, (c, id) => accounts.updateRole(c, id)],
  ["DELETE", /^roles\/([\w-]+)$/, (c, id) => accounts.deleteRole(c, id)],

  ["GET", /^audit$/, (c) => accounts.auditLog(c)],

  ["GET", /^schema$/, (c) => content.schema(c)],
  ["GET", /^items$/, (c) => content.items(c)],
  ["GET", /^item$/, (c) => content.item(c)],
  ["PUT", /^item$/, (c) => content.save(c)],
  ["POST", /^item$/, (c) => content.create(c)],
  ["POST", /^item\/delete$/, (c) => content.remove(c)],
  ["GET", /^options$/, (c) => content.options(c)],
  ["POST", /^upload$/, (c) => content.upload(c)],

  ["GET", /^approvals$/, (c) => content.approvals(c)],
  ["POST", /^approvals\/([\w-]+)\/approve$/, (c, id) => content.approve(c, id)],
  ["POST", /^approvals\/([\w-]+)\/reject$/, (c, id) => content.reject(c, id)],
  ["POST", /^approvals\/([\w-]+)\/withdraw$/, (c, id) => content.withdraw(c, id)],
];

export interface Options {
  /** Replaces GitHub in tests. */
  repo?: Repo;
  now?: number;
}

export async function handle(req: Request, env: Env, opts: Options = {}): Promise<Response> {
  try {
    if (!env.DB) throw new HttpError(503, "The admin database isn't connected. Bind a D1 database named DB in Cloudflare.");
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
    const method = req.method.toUpperCase();
    const route = ROUTES.find(([m, re]) => m === method && re.test(path));
    if (!route) throw new HttpError(404, "Not found.");

    if (method !== "GET") {
      const origin = req.headers.get("Origin");
      const sameSite = origin ? origin === url.origin : req.headers.get("Sec-Fetch-Site") === "same-origin";
      if (!sameSite) throw new HttpError(403, "Requests from other websites are refused.");
    }

    const now = opts.now ?? Date.now();
    let repo: Repo | null = opts.repo ?? null;
    const ctx: Ctx = {
      req,
      url,
      env,
      db: env.DB,
      now,
      ip: req.headers.get("CF-Connecting-IP") ?? "unknown",
      repo: () => (repo ??= repoFor(env)),
      user: null,
      sessionId: null,
      csrf: null,
    };
    await ensureReady(env.DB, now);
    await loadSession(ctx);

    const key = `${method} ${path}`;
    if (!OPEN.has(key)) {
      if (!ctx.user) throw new HttpError(401, "Please sign in.");
      if (method !== "GET" && !safeEqual(req.headers.get("X-CSRF-Token") ?? "", ctx.csrf ?? "")) {
        throw new HttpError(403, "Your session has expired. Reload the page and try again.");
      }
    }
    return await route[2](ctx, route[1].exec(path)?.[1] ?? "");
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof ValidationError) return json({ error: e.message }, 400);
    if (e instanceof ConflictError) return json({ error: "Someone else changed this at the same time. Reload the page and try again." }, 409);
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
