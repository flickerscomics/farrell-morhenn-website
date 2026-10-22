import { describe, expect, it } from "vitest";
import { invite, withAdmin } from "./helpers";

describe("roles and permissions", () => {
  it("starts with Admin, Press editor and Staff member", async () => {
    const s = await withAdmin();
    const res = await s.admin.get("roles");
    expect((res.json.roles as { name: string }[]).map((r) => r.name)).toEqual(["Admin", "Press editor", "Staff member"]);
  });

  it("admins can create custom roles and change their permissions", async () => {
    const s = await withAdmin();
    const created = await s.admin.post("roles", { name: "Office manager", description: "Runs the office", permissions: ["staff.manage", "audit.view", "not-a-permission"] });
    expect(created.status).toBe(200);
    const id = String(created.json.id);
    let roles = (await s.admin.get("roles")).json.roles as { id: string; permissions: string[] }[];
    expect(roles.find((r) => r.id === id)?.permissions).toEqual(["staff.manage", "audit.view"]);
    expect((await s.admin.patch(`roles/${id}`, { permissions: ["audit.view"] })).status).toBe(200);
    roles = (await s.admin.get("roles")).json.roles as { id: string; permissions: string[] }[];
    expect(roles.find((r) => r.id === id)?.permissions).toEqual(["audit.view"]);
    expect((await s.admin.post("roles", { name: "office MANAGER", permissions: [] })).status).toBe(409);
  });

  it("protects the Admin role and built-in roles", async () => {
    const s = await withAdmin();
    expect((await s.admin.patch("roles/admin", { permissions: [] })).status).toBe(403);
    expect((await s.admin.del("roles/admin")).status).toBe(403);
    expect((await s.admin.del("roles/staff")).status).toBe(403);
    expect((await s.admin.patch("roles/staff", { name: "Renamed", permissions: ["profile.edit_own", "audit.view"] })).status).toBe(200);
    const staff = ((await s.admin.get("roles")).json.roles as { id: string; name: string }[]).find((r) => r.id === "staff");
    expect(staff?.name).toBe("Staff member");
  });

  it("nobody can hand out permissions they don't have", async () => {
    const s = await withAdmin();
    const role = await s.admin.post("roles", { name: "Role manager", permissions: ["roles.manage", "staff.manage", "audit.view"] });
    const rm = await invite(s, { name: "Rolf Manning", username: "rolf", roleId: String(role.json.id) });
    expect((await rm.browser.post("roles", { name: "Sneaky", permissions: ["settings.edit"] })).status).toBe(403);
    expect((await rm.browser.post("roles", { name: "Auditors", permissions: ["audit.view"] })).status).toBe(200);
    expect((await rm.browser.patch("roles/press-editor", { permissions: ["press.write"] })).status).toBe(403);
    expect((await rm.browser.post("users", { name: "New Admin", username: "New Admin", roleId: "admin" })).status).toBe(403);
    const admins = (await rm.browser.get("users")).json.users as { id: string; roleId: string }[];
    const adminId = admins.find((u) => u.roleId === "admin")!.id;
    expect((await rm.browser.patch(`users/${adminId}`, { status: "disabled" })).status).toBe(403);
    expect((await rm.browser.del(`users/${adminId}`)).status).toBe(403);
    expect((await rm.browser.patch(`users/${rm.id}`, { roleId: "admin" })).status).toBe(403);
  });

  it("always keeps at least one active admin", async () => {
    const s = await withAdmin();
    const me = (await s.admin.get("session")).json.user as { id: string };
    expect((await s.admin.patch(`users/${me.id}`, { roleId: "staff" })).status).toBe(403);
    expect((await s.admin.patch(`users/${me.id}`, { status: "disabled" })).status).toBe(403);
    expect((await s.admin.del(`users/${me.id}`)).status).toBe(403);

    const second = await invite(s, { name: "Gideon Morhenn", username: "gideon", roleId: "admin" });
    expect((await second.browser.patch(`users/${me.id}`, { roleId: "staff" })).status).toBe(200);
    expect((await s.admin.get("users")).status).toBe(401); // role changes end the person's sessions
    const meNow = (await second.browser.get("users")).json.users as { id: string; roleId: string }[];
    expect(meNow.find((u) => u.id === me.id)?.roleId).toBe("staff");
  });

  it("roles in use can't be deleted", async () => {
    const s = await withAdmin();
    const role = await s.admin.post("roles", { name: "Interns", permissions: ["profile.edit_own"] });
    const id = String(role.json.id);
    const intern = await invite(s, { name: "Ida Intern", username: "ida", roleId: id });
    expect((await s.admin.del(`roles/${id}`)).status).toBe(409);
    await s.admin.patch(`users/${intern.id}`, { roleId: "staff" });
    expect((await s.admin.del(`roles/${id}`)).status).toBe(200);
  });

  it("staff only see what their role allows", async () => {
    const s = await withAdmin();
    const nina = await invite(s, { name: "Nina Bernardi", username: "nina", roleId: "staff", personSlug: "nina-bernardi" });
    expect((await nina.browser.get("users")).status).toBe(403);
    expect((await nina.browser.get("roles")).status).toBe(403);
    expect((await nina.browser.get("audit")).status).toBe(403);
    const schema = (await nina.browser.get("schema")).json.sections as { name: string; restricted: string[] }[];
    expect(schema.map((x) => x.name)).toEqual(["people"]);
    expect(schema[0].restricted).toContain("title");
  });

  it("records changes in the activity log", async () => {
    const s = await withAdmin();
    await s.admin.post("roles", { name: "Auditors", permissions: ["audit.view"] });
    const entries = (await s.admin.get("audit")).json.entries as { action: string; userName: string }[];
    expect(entries.map((e) => e.action)).toEqual(["role.created", "setup.completed"]);
    expect(entries[0].userName).toBe("Marty Farrell");
  });
});
