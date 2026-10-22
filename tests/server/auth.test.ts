import { describe, expect, it } from "vitest";
import { ADMIN, SETUP_CODE, invite, site, withAdmin } from "./helpers";

describe("first admin setup", () => {
  it("needs the setup code, and works only once", async () => {
    const s = site();
    const b = s.browser();
    expect((await b.get("session")).json).toMatchObject({ user: null, setupRequired: true });
    expect((await b.post("setup", { ...ADMIN, code: "wrong code entirely" })).status).toBe(403);
    const ok = await b.post("setup", { ...ADMIN, code: SETUP_CODE });
    expect(ok.status).toBe(200);
    expect(ok.setCookie).toMatch(/^__Host-fm_session=[\w-]+; Path=\/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict$/);
    const me = await b.get("session");
    expect(me.json.user).toMatchObject({ name: ADMIN.name, roleName: "Admin", isAdmin: true, personSlug: "marty-farrell" });
    expect((await s.browser().post("setup", { ...ADMIN, username: "Someone Else", code: SETUP_CODE })).status).toBe(404);
    expect((await s.browser().get("session")).json.setupRequired).toBe(false);
  });

  it("is unavailable until a setup code is configured", async () => {
    const s = site({ ADMIN_SETUP_CODE: "" });
    expect((await s.browser().post("setup", { ...ADMIN, code: "" })).status).toBe(503);
  });

  it("rejects weak passwords", async () => {
    const s = site();
    for (const password of ["short", "password1234", "aaaaaaaaaaaaaaa", "marty farrell is me"]) {
      const res = await s.browser().post("setup", { ...ADMIN, password, code: SETUP_CODE });
      expect(res.status, password).toBe(400);
    }
  });
});

describe("cross-site and CSRF protection", () => {
  it("refuses changes from other websites or without the CSRF token", async () => {
    const s = await withAdmin();
    expect((await s.admin.post("roles", { name: "X", permissions: [] }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await s.admin.post("roles", { name: "X", permissions: [] }, { origin: null })).status).toBe(403);
    expect((await s.admin.post("roles", { name: "X", permissions: [] }, { csrf: null })).status).toBe(403);
    expect((await s.admin.post("roles", { name: "X", permissions: [] }, { csrf: "forged" })).status).toBe(403);
    expect((await s.admin.post("roles", { name: "X", permissions: [] })).status).toBe(200);
  });

  it("requires signing in", async () => {
    const s = await withAdmin();
    const stranger = s.browser();
    expect((await stranger.get("users")).status).toBe(401);
    expect((await stranger.get("schema")).status).toBe(401);
    expect((await stranger.post("users", { name: "A", username: "Anyone", roleId: "admin" })).status).toBe(401);
  });
});

describe("signing in", () => {
  it("gives the same answer for unknown emails and wrong passwords, and locks after five wrong passwords", async () => {
    const s = await withAdmin();
    const b = s.browser("192.0.2.50");
    const unknown = await b.post("login", { username: "nobody", password: ADMIN.password });
    const wrong = await b.post("login", { username: ADMIN.username, password: "not the right one at all" });
    expect(unknown.status).toBe(401);
    expect(wrong.json.error).toBe(unknown.json.error);
    for (let i = 0; i < 4; i++) await b.post("login", { username: ADMIN.username, password: "not the right one at all" });
    expect((await b.post("login", { username: ADMIN.username, password: ADMIN.password })).status).toBe(429);
    s.clock.now += 16 * 60_000;
    expect((await b.post("login", { username: ADMIN.username, password: ADMIN.password })).status).toBe(200);
  });

  it("limits attempts from one address", async () => {
    const s = await withAdmin();
    const b = s.browser("192.0.2.99");
    for (let i = 0; i < 20; i++) await b.post("login", { username: `Visitor ${i}`, password: "whatever it might be" });
    expect((await b.post("login", { username: ADMIN.username, password: ADMIN.password })).status).toBe(429);
  });

  it("sessions expire after eight hours and end on sign-out", async () => {
    const s = await withAdmin();
    expect((await s.admin.get("users")).status).toBe(200);
    s.clock.now += 8 * 3600_000 + 1;
    expect((await s.admin.get("users")).status).toBe(401);

    const b = s.browser();
    await b.post("login", { username: ADMIN.username, password: ADMIN.password });
    const cookie = b.cookie;
    expect(cookie).not.toBe("");
    expect((await b.post("logout")).status).toBe(200);
    const replay = s.browser();
    replay.useCookie(cookie);
    expect((await replay.get("users")).status).toBe(401);
  });

  it("changing your password signs out your other sessions", async () => {
    const s = await withAdmin();
    const other = s.browser();
    await other.post("login", { username: ADMIN.username, password: ADMIN.password });
    expect((await s.admin.post("password", { current: "wrong", password: "brand new long secret" })).status).toBe(400);
    expect((await s.admin.post("password", { current: ADMIN.password, password: "brand new long secret" })).status).toBe(200);
    expect((await s.admin.get("users")).status).toBe(200);
    expect((await other.get("users")).status).toBe(401);
  });
});

describe("invitations and resets", () => {
  it("invitation links are single use and expire after 48 hours", async () => {
    const s = await withAdmin();
    const res = await s.admin.post("users", { name: "Nina Bernardi", username: "nina", roleId: "staff", personSlug: "nina-bernardi" });
    expect(res.status).toBe(200);
    const token = String(res.json.link).split("#/accept/")[1];
    expect(String(res.json.link)).toMatch(/^https:\/\/farrell-morhenn\.com\/admin\/#\/accept\/[\w-]{43}$/);

    const b = s.browser();
    expect((await b.post("accept/check", { token })).json).toMatchObject({ kind: "invite", name: "Nina Bernardi" });
    expect((await b.post("accept", { token, password: "short" })).status).toBe(400);
    expect((await b.post("accept", { token, password: "a perfectly fine passphrase" })).status).toBe(200);
    expect((await b.get("session")).json.user).toMatchObject({ roleName: "Staff member", personSlug: "nina-bernardi" });
    expect((await s.browser().post("accept", { token, password: "a perfectly fine passphrase" })).status).toBe(404);

    const late = await s.admin.post("users", { name: "Late Person", username: "late", roleId: "staff" });
    s.clock.now += 48 * 3600_000 + 1;
    const lateToken = String(late.json.link).split("#/accept/")[1];
    expect((await s.browser().post("accept", { token: lateToken, password: "a perfectly fine passphrase" })).status).toBe(404);
  });

  it("a reset link replaces the old password and earlier links", async () => {
    const s = await withAdmin();
    const nina = await invite(s, { name: "Nina Bernardi", username: "nina", roleId: "staff" });
    const first = await s.admin.post(`users/${nina.id}/link`);
    const second = await s.admin.post(`users/${nina.id}/link`);
    expect(second.json.kind).toBe("reset");
    const t1 = String(first.json.link).split("#/accept/")[1];
    const t2 = String(second.json.link).split("#/accept/")[1];
    expect((await s.browser().post("accept", { token: t1, password: "replacement passphrase" })).status).toBe(404);
    expect((await s.browser().post("accept", { token: t2, password: "replacement passphrase" })).status).toBe(200);
    expect((await nina.browser.get("schema")).status).toBe(401);
    expect((await s.browser().post("login", { username: "nina", password: "replacement passphrase" })).status).toBe(200);
  });

  it("disabling an account signs it out and stops it signing in", async () => {
    const s = await withAdmin();
    const nina = await invite(s, { name: "Nina Bernardi", username: "nina", roleId: "staff" });
    expect((await nina.browser.get("schema")).status).toBe(200);
    expect((await s.admin.patch(`users/${nina.id}`, { status: "disabled" })).status).toBe(200);
    expect((await nina.browser.get("schema")).status).toBe(401);
    expect((await s.browser().post("login", { username: "nina", password: "another long passphrase here" })).status).toBe(401);
    expect((await s.admin.post(`users/${nina.id}/link`)).status).toBe(409);
  });
});

describe("password hashing", () => {
  it("uses the configured strength for new passwords, within safe limits, and still accepts older hashes", async () => {
    const { hashPassword, iterationsFrom, verifyPassword } = await import("@/server/crypto");
    expect(iterationsFrom(undefined)).toBe(100_000);
    expect(iterationsFrom("50000")).toBe(50_000);
    expect(iterationsFrom("10")).toBe(10_000);
    expect(iterationsFrom("999999")).toBe(100_000);
    const weaker = await hashPassword("a long and unusual passphrase", 20_000);
    expect(weaker).toMatch(/^pbkdf2-sha256\$20000\$/);
    expect(await verifyPassword("a long and unusual passphrase", weaker)).toBe(true);
    expect(await verifyPassword("a different passphrase", weaker)).toBe(false);

    const s = site({ PASSWORD_HASH_ITERATIONS: "20000" });
    expect((await s.browser().post("setup", { ...ADMIN, code: SETUP_CODE })).status).toBe(200);
    expect((await s.browser().post("login", { username: ADMIN.username, password: ADMIN.password })).status).toBe(200);
  });
});

describe("usernames", () => {
  it("sign in ignoring upper and lower case and extra spaces", async () => {
    const s = await withAdmin();
    expect((await s.browser().post("login", { username: "  marty   FARRELL ", password: ADMIN.password })).status).toBe(200);
  });

  it("default to the person's name, must be unique, and can be changed", async () => {
    const s = await withAdmin();
    const res = await s.admin.post("users", { name: "Richard Sullivan", roleId: "staff" });
    expect(res.status).toBe(200);
    const id = String(res.json.id);
    expect((await s.admin.post("users", { name: "Someone", username: "richard sullivan", roleId: "staff" })).status).toBe(409);
    expect((await s.admin.post("users", { name: "Someone", username: "x", roleId: "staff" })).status).toBe(400);
    expect((await s.admin.post("users", { name: "Someone", username: "<script>", roleId: "staff" })).status).toBe(400);
    const token = String(res.json.link).split("#/accept/")[1];
    expect((await s.browser().post("accept/check", { token })).json).toMatchObject({ username: "Richard Sullivan" });
    expect((await s.admin.patch(`users/${id}`, { username: "Dick Sullivan" })).status).toBe(200);
    expect((await s.admin.patch(`users/${id}`, { username: "Marty Farrell" })).status).toBe(409);
    const b = s.browser();
    expect((await b.post("accept", { token, password: "quiet harbour lantern seven" })).status).toBe(200);
    expect((await s.browser().post("login", { username: "Dick Sullivan", password: "quiet harbour lantern seven" })).status).toBe(200);
    expect((await s.browser().post("login", { username: "Richard Sullivan", password: "quiet harbour lantern seven" })).status).toBe(401);
  });

  it("existing accounts keep signing in with their email address as their username", async () => {
    const { memoryD1 } = await import("./helpers");
    const { MIGRATIONS } = await import("@/server/db");
    const { hashPassword } = await import("@/server/crypto");
    const db = memoryD1();
    // A database from before usernames: only the first set of tables, with an email column.
    await db.prepare("CREATE TABLE schema_version (version INTEGER NOT NULL)").run();
    await db.batch([...MIGRATIONS[0].map((sql) => db.prepare(sql)), db.prepare("INSERT INTO schema_version (version) VALUES (1)")]);
    await db.prepare("INSERT INTO roles (id, name, permissions, built_in, is_admin, created_at) VALUES ('admin', 'Admin', '[]', 1, 1, 0)").run();
    await db
      .prepare("INSERT INTO users (id, email, name, role_id, status, password_hash, created_at, updated_at) VALUES ('u1', 'owner@example.com', 'Richard Sullivan', 'admin', 'active', ?, 0, 0)")
      .bind(await hashPassword(ADMIN.password))
      .run();
    const s = site({ DB: db });
    const b = s.browser();
    expect((await b.post("login", { username: "owner@example.com", password: ADMIN.password })).status).toBe(200);
    expect((await b.patch("users/u1", { username: "Richard Sullivan" })).status).toBe(200);
    expect((await s.browser().post("login", { username: "richard sullivan", password: ADMIN.password })).status).toBe(200);
  });
});
