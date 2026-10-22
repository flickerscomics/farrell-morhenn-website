"use client";

import { useEffect, useState } from "react";
import { api, when, type Me } from "./api";
import { Done, Problem, TextField, USERNAME_HELP } from "./auth-views";

interface Account {
  id: string;
  username: string;
  name: string;
  roleId: string;
  roleName: string;
  personSlug: string | null;
  status: "invited" | "active" | "disabled";
  lockedUntil: number;
  linkExpiresAt: number | null;
}
interface Role {
  id: string;
  name: string;
  permissions: string[];
}

const STATUS = { invited: ["Invited", "badge-warn"], active: ["Active", "badge-success"], disabled: ["Disabled", "badge-muted"] } as const;

function LinkBox({ link, kind, onClose }: { link: string; kind: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="notice notice-success stack" role="status">
      <p>
        <strong>{kind === "invite" ? "Invitation link" : "Password reset link"}</strong>. Send it to them privately. It works once and expires in {kind === "invite" ? "48" : "24"} hours. It won&apos;t be shown again.
      </p>
      <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link" />
      <div className="row">
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true))}>
          {copied ? "Copied" : "Copy link"}
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export function Staff({ me }: { me: Me }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [people, setPeople] = useState<{ value: string; label: string }[]>([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [link, setLink] = useState<{ link: string; kind: string } | null>(null);
  const [form, setForm] = useState({ name: "", username: "", roleId: "staff", personSlug: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const [u, r, p] = await Promise.all([
      api<{ users: Account[] }>("GET", "users"),
      api<{ roles: Role[] }>("GET", "roles"),
      api<{ options: { value: string; label: string }[] }>("GET", "options?collection=people").catch(() => ({ options: [] })),
    ]);
    setAccounts(u.users);
    setRoles(r.roles);
    setPeople(p.options);
  }
  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, []);

  const assignable = roles.filter((r) => r.permissions.every((p) => me.permissions.includes(p as Me["permissions"][number])));

  async function run(fn: () => Promise<void>, success = "") {
    setBusy(true);
    setError("");
    setDone("");
    try {
      await fn();
      if (success) setDone(success);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const personName = (slug: string | null) => people.find((p) => p.value === slug)?.label ?? slug ?? "";

  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Staff accounts</h1>
      <p className="muted">Accounts are for signing in to this admin area. Profiles on the website are edited under People; link each account to its profile so staff can edit their own.</p>
      <Problem message={error} />
      <Done message={done} />
      {link && <LinkBox {...link} onClose={() => setLink(null)} />}
      {!accounts && !error && <p className="muted">Loading…</p>}
      {accounts && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Role</th>
                <th scope="col">Profile</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const self = a.id === me.id;
                return (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      <div className="small muted">Username: {a.username}</div>
                      <button
                        className="btn btn-ghost btn-sm admin-inline-btn"
                        disabled={busy}
                        onClick={() => {
                          const next = window.prompt(`New username for ${a.name}. Spaces are fine.`, a.username);
                          if (next !== null && next.trim() && next !== a.username) void run(() => api("PATCH", `users/${a.id}`, { username: next }), `${a.name} now signs in as "${next.replace(/\s+/g, " ").trim()}".`);
                        }}
                      >
                        Change username
                      </button>
                    </td>
                    <td>
                      <select className="select select-sm" aria-label={`Role for ${a.name}`} value={a.roleId} disabled={busy || self} onChange={(e) => void run(() => api("PATCH", `users/${a.id}`, { roleId: e.target.value }), `${a.name}'s role was changed.`)}>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id} disabled={!assignable.includes(r)}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select className="select select-sm" aria-label={`Profile for ${a.name}`} value={a.personSlug ?? ""} disabled={busy} onChange={(e) => void run(() => api("PATCH", `users/${a.id}`, { personSlug: e.target.value }), `${a.name}'s profile link was changed.`)}>
                        <option value="">Not linked</option>
                        {people.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                        {a.personSlug && !people.some((p) => p.value === a.personSlug) && <option value={a.personSlug}>{personName(a.personSlug)}</option>}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${STATUS[a.status][1]}`}>{STATUS[a.status][0]}</span>
                      {a.lockedUntil > Date.now() && <div className="small muted">Locked after wrong passwords until {when(a.lockedUntil)}</div>}
                      {a.status === "invited" && a.linkExpiresAt && <div className="small muted">Link valid until {when(a.linkExpiresAt)}</div>}
                    </td>
                    <td>
                      <div className="row">
                        {a.status !== "disabled" && (
                          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void run(async () => setLink(await api<{ link: string; kind: string }>("POST", `users/${a.id}/link`)))}>
                            {a.status === "invited" ? "New invitation link" : "Password reset link"}
                          </button>
                        )}
                        {!self && (
                          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void run(() => api("PATCH", `users/${a.id}`, { status: a.status === "disabled" ? "enabled" : "disabled" }), a.status === "disabled" ? `${a.name} can sign in again.` : `${a.name} has been signed out and can't sign in.`)}>
                            {a.status === "disabled" ? "Enable" : "Disable"}
                          </button>
                        )}
                        {!self && (
                          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => window.confirm(`Delete ${a.name}'s account? Their profile on the website stays.`) && void run(() => api("DELETE", `users/${a.id}`), `${a.name}'s account was deleted.`)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const r = await api<{ link: string }>("POST", "users", form);
            setLink({ link: r.link, kind: "invite" });
            setForm({ name: "", username: "", roleId: "staff", personSlug: "" });
          });
        }}
      >
        <h2 style={{ fontSize: "1.3rem", margin: 0 }}>Invite someone</h2>
        <p className="small muted" style={{ margin: 0 }}>
          You&apos;ll get a link to send them. They use it to choose their own password. To add someone to the website, first add their profile under People.
        </p>
        <div className="form-grid">
          <TextField label="Name" name="invite-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Username (for signing in)" name="invite-username" autoComplete="off" placeholder={form.name || "Same as their name"} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} help={USERNAME_HELP} />
          <div className="field">
            <label className="label" htmlFor="invite-role">Role</label>
            <select id="invite-role" className="select" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              {assignable.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="invite-person">Their profile on the website</label>
            <select id="invite-person" className="select" value={form.personSlug} onChange={(e) => setForm({ ...form, personSlug: e.target.value })}>
              <option value="">Not linked</option>
              {people.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <button className="btn btn-primary" type="submit" disabled={busy}>Create invitation</button>
        </div>
      </form>
    </div>
  );
}
