import { generateKeyPairSync, createVerify } from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { appJwt } from "@/server/github";
import { parseFile, parseSchema, serializeFile } from "@/server/schema";
import { invite, withAdmin } from "./helpers";

type Item = { values: Record<string, unknown>; sha: string; canEdit: boolean; needsApproval: boolean };

async function load(b: { get: (p: string) => Promise<{ status: number; json: Record<string, unknown> }> }, section: string, file = "") {
  const res = await b.get(`item?section=${section}${file ? `&file=${file}` : ""}`);
  return { status: res.status, item: res.json as unknown as Item & { error?: string } };
}

describe("the editing schema", () => {
  it("reads every section from .pages.yml and round-trips content files", () => {
    const sections = parseSchema(fs.readFileSync(".pages.yml", "utf8"));
    expect(sections.map((s) => s.name)).toEqual(expect.arrayContaining(["settings", "people", "practice-areas", "articles", "press", "careers", "faqs", "page-home", "milestones"]));
    const people = sections.find((s) => s.name === "people")!;
    const text = fs.readFileSync("tests/fixtures/content/people/nina-bernardi.md", "utf8");
    const values = parseFile(people, text);
    expect(values.fullName).toBe("Nina Bernardi");
    expect(parseFile(people, serializeFile(people, values))).toEqual(values);
    const settings = sections.find((s) => s.name === "settings")!;
    const st = parseFile(settings, fs.readFileSync("tests/fixtures/content/settings.yml", "utf8"));
    expect(parseFile(settings, serializeFile(settings, st))).toEqual(st);
  });
});

describe("staff profile changes", () => {
  it("wait for an admin's approval before going live", async () => {
    const s = await withAdmin();
    const nina = await invite(s, { name: "Nina Bernardi", email: "nina@example.com", roleId: "staff", personSlug: "nina-bernardi" });
    const before = s.repo.files.get("content/people/nina-bernardi.md")!.text;

    const { item } = await load(nina.browser, "people", "nina-bernardi.md");
    expect(item.needsApproval).toBe(true);
    const saved = await nina.browser.put("item", {
      section: "people",
      file: "nina-bernardi.md",
      sha: item.sha,
      values: { ...item.values, body: "[b]Updated[/b] biography.", title: "Managing Partner", languages: ["Italian", "English", "French"] },
    });
    expect(saved.json).toMatchObject({ ok: true, pending: true });
    expect(s.repo.files.get("content/people/nina-bernardi.md")!.text).toBe(before);

    // Nina can see her own pending change, but can't approve it.
    const mine = await nina.browser.get("approvals");
    expect(mine.json.canApprove).toBe(false);
    const pending = (mine.json.pending as { id: string; fields: Record<string, unknown> }[])[0];
    expect(Object.keys(pending.fields).sort()).toEqual(["body", "languages"]); // the job title is an admin-only field and was ignored
    expect((await nina.browser.post(`approvals/${pending.id}/approve`)).status).toBe(403);

    const queue = await s.admin.get("approvals");
    expect((queue.json.pending as unknown[]).length).toBe(1);
    expect((await s.admin.post(`approvals/${pending.id}/approve`)).status).toBe(200);
    const after = s.repo.files.get("content/people/nina-bernardi.md")!.text;
    expect(after).toContain("[b]Updated[/b] biography.");
    expect(after).toContain("- French");
    expect(after).toContain("title: Senior Attorney");
    expect(s.repo.commits.at(-1)).toBe("Update content/people/nina-bernardi.md (submitted by Nina Bernardi, approved by Marty Farrell)");
    expect((await s.admin.post(`approvals/${pending.id}/approve`)).status).toBe(404);
  });

  it("can be rejected with a reason, or withdrawn", async () => {
    const s = await withAdmin();
    const nina = await invite(s, { name: "Nina Bernardi", email: "nina@example.com", roleId: "staff", personSlug: "nina-bernardi" });
    const { item } = await load(nina.browser, "people", "nina-bernardi.md");
    const first = await nina.browser.put("item", { section: "people", file: "nina-bernardi.md", sha: item.sha, values: { ...item.values, shortBio: "First try" } });
    expect((await s.admin.post(`approvals/${first.json.id}/reject`, { reason: "Please keep it formal." })).status).toBe(200);
    const mine = await nina.browser.get("approvals");
    expect((mine.json.recent as { status: string; reason: string }[])[0]).toMatchObject({ status: "rejected", reason: "Please keep it formal." });

    const second = await nina.browser.put("item", { section: "people", file: "nina-bernardi.md", sha: item.sha, values: { ...item.values, shortBio: "Second try" } });
    expect((await nina.browser.post(`approvals/${second.json.id}/withdraw`)).status).toBe(200);
    expect(((await s.admin.get("approvals")).json.pending as unknown[]).length).toBe(0);
  });

  it("staff can only edit their own profile", async () => {
    const s = await withAdmin();
    const nina = await invite(s, { name: "Nina Bernardi", email: "nina@example.com", roleId: "staff", personSlug: "nina-bernardi" });
    expect((await load(nina.browser, "people", "gideon-morhenn.md")).status).toBe(403);
    const gideon = await load(s.admin, "people", "gideon-morhenn.md");
    expect((await nina.browser.put("item", { section: "people", file: "gideon-morhenn.md", sha: gideon.item.sha, values: gideon.item.values })).status).toBe(403);
    const list = (await nina.browser.get("items?section=people")).json.items as { file: string }[];
    expect(list.map((i) => i.file)).toEqual(["nina-bernardi.md"]);
    expect((await nina.browser.post("item", { section: "people", values: { fullName: "New", slug: "new-person", title: "X" } })).status).toBe(403);
    expect((await nina.browser.get("item?section=settings")).status).toBe(403);
  });

  it("admins publish their own edits straight away", async () => {
    const s = await withAdmin();
    const { item } = await load(s.admin, "people", "gideon-morhenn.md");
    expect(item.needsApproval).toBe(false);
    const res = await s.admin.put("item", { section: "people", file: "gideon-morhenn.md", sha: item.sha, values: { ...item.values, title: "Senior Partner" } });
    expect(res.json).toMatchObject({ ok: true, file: "gideon-morhenn.md" });
    expect(s.repo.files.get("content/people/gideon-morhenn.md")!.text).toContain("title: Senior Partner");
  });

  it("renaming a profile's web address moves the file and keeps the account linked", async () => {
    const s = await withAdmin();
    const nina = await invite(s, { name: "Nina Bernardi", email: "nina@example.com", roleId: "staff", personSlug: "nina-bernardi" });
    const { item } = await load(s.admin, "people", "nina-bernardi.md");
    const res = await s.admin.put("item", { section: "people", file: "nina-bernardi.md", sha: item.sha, values: { ...item.values, slug: "nina-b" } });
    expect(res.json.file).toBe("nina-b.md");
    expect(s.repo.files.has("content/people/nina-bernardi.md")).toBe(false);
    expect(s.repo.files.has("content/people/nina-b.md")).toBe(true);
    expect((await nina.browser.get("session")).json.user).toMatchObject({ personSlug: "nina-b" });
  });

  it("marking someone as departed disables their account", async () => {
    const s = await withAdmin();
    const nina = await invite(s, { name: "Nina Bernardi", email: "nina@example.com", roleId: "staff", personSlug: "nina-bernardi" });
    const { item } = await load(s.admin, "people", "nina-bernardi.md");
    await s.admin.put("item", { section: "people", file: "nina-bernardi.md", sha: item.sha, values: { ...item.values, status: "DEPARTED" } });
    expect((await nina.browser.get("schema")).status).toBe(401);
  });
});

describe("saving content", () => {
  it("refuses stale edits", async () => {
    const s = await withAdmin();
    const { item } = await load(s.admin, "settings");
    expect((await s.admin.put("item", { section: "settings", sha: item.sha, values: { ...item.values, phone: "1" } })).status).toBe(200);
    expect((await s.admin.put("item", { section: "settings", sha: item.sha, values: { ...item.values, phone: "2" } })).status).toBe(409);
  });

  it("checks values against the schema", async () => {
    const s = await withAdmin();
    const { item } = await load(s.admin, "settings");
    const bad = async (values: Record<string, unknown>) => (await s.admin.put("item", { section: "settings", sha: item.sha, values: { ...item.values, ...values } })).json.error;
    expect(await bad({ firmName: "" })).toMatch(/Firm name is required/);
    expect(await bad({ colorPrimary: "red" })).toMatch(/Colours/);
    expect(await bad({ timezone: "Mars/Olympus" })).toMatch(/Time zone/);
    expect(await bad({ emailLink: "javascript:alert(1)" })).toMatch(/https/);
  });

  it("keeps fields it doesn't know about", async () => {
    const s = await withAdmin();
    s.repo.files.set("content/careers/paralegal.md", { ...s.repo.files.get("content/careers/paralegal.md")!, text: s.repo.files.get("content/careers/paralegal.md")!.text.replace("---\n", "---\nlegacyField: keep me\n") });
    const { item } = await load(s.admin, "careers", "paralegal.md");
    await s.admin.put("item", { section: "careers", file: "paralegal.md", sha: item.sha, values: { ...item.values, department: "Litigation" } });
    expect(s.repo.files.get("content/careers/paralegal.md")!.text).toContain("legacyField: keep me");
  });

  it("press editors without publishing rights can only keep drafts", async () => {
    const s = await withAdmin();
    const role = await s.admin.post("roles", { name: "Press writer", permissions: ["press.write"] });
    const writer = await invite(s, { name: "Wren Writer", email: "wren@example.com", roleId: String(role.json.id) });
    const values = { title: "News", slug: "some-news", status: "PUBLISHED", releaseDate: "2026-10-30", summary: "Summary" };
    expect((await writer.browser.post("item", { section: "press", values })).status).toBe(403);
    expect((await writer.browser.post("item", { section: "press", values: { ...values, status: "DRAFT" } })).status).toBe(200);
    const published = await load(writer.browser, "press", "family-law-team-expands.md");
    expect(published.item.canEdit).toBe(false);
    expect((await writer.browser.put("item", { section: "press", file: "family-law-team-expands.md", sha: published.item.sha, values: published.item.values })).status).toBe(403);
    expect((await writer.browser.post("item/delete", { section: "press", file: "family-law-team-expands.md", sha: published.item.sha })).status).toBe(403);
  });

  it("uploads only real images to the field's folder", async () => {
    const s = await withAdmin();
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a1b20000000049454e44ae426082", "hex").toString("base64");
    const ok = await s.admin.post("upload", { section: "people", field: "portrait", name: "My Photo!.PNG", data: png });
    expect(ok.status).toBe(200);
    expect(String(ok.json.path)).toMatch(/^\/images\/people\/my-photo-[a-z0-9x]+\.png$/);
    const html = Buffer.from("<html><script>alert(1)</script></html>").toString("base64");
    expect((await s.admin.post("upload", { section: "people", field: "portrait", name: "x.png", data: html })).status).toBe(400);
    expect((await s.admin.post("upload", { section: "people", field: "fullName", name: "x.png", data: png })).status).toBe(400);
  });
});

describe("GitHub App sign-in", () => {
  it("signs app tokens with the PKCS#1 key GitHub issues", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    const jwt = await appJwt("12345", privateKey, Date.UTC(2026, 0, 1));
    const [h, p, sig] = jwt.split(".");
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toMatchObject({ iss: "12345" });
    expect(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(sig, "base64url"))).toBe(true);
  });
});
