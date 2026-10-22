"use client";

import { useEffect, useState } from "react";
import { PERMISSIONS, type Permission } from "@/server/permissions";
import { api, type Me } from "./api";
import { Done, Problem, TextField } from "./auth-views";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  builtIn: boolean;
  isAdmin: boolean;
  users: number;
}

function RoleForm({ me, role, onSave, onDelete, busy }: { me: Me; role: Partial<Role>; onSave: (r: { name: string; description: string; permissions: Permission[] }) => void; onDelete?: () => void; busy: boolean }) {
  const [name, setName] = useState(role.name ?? "");
  const [description, setDescription] = useState(role.description ?? "");
  const [perms, setPerms] = useState<Permission[]>(role.permissions ?? []);
  const locked = !!role.isAdmin;
  const outOfReach = (role.permissions ?? []).some((p) => !me.permissions.includes(p));
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, description, permissions: perms });
      }}
    >
      {locked && <p className="small muted">The Admin role always has every permission.</p>}
      {outOfReach && !locked && <p className="small muted">This role has permissions you don&apos;t have, so you can&apos;t change it.</p>}
      <div className="form-grid">
        <TextField label="Name" name={`name-${role.id ?? "new"}`} required value={name} disabled={locked || role.builtIn} onChange={(e) => setName(e.target.value)} />
        <TextField label="Description" name={`desc-${role.id ?? "new"}`} value={description} disabled={locked || outOfReach} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <fieldset className="admin-perms">
        <legend className="label">Permissions</legend>
        {PERMISSIONS.map((p) => {
          const mine = me.permissions.includes(p.id);
          return (
            <label key={p.id} className="admin-check">
              <input
                type="checkbox"
                checked={locked || perms.includes(p.id)}
                disabled={locked || outOfReach || !mine}
                onChange={(e) => setPerms(e.target.checked ? [...perms, p.id] : perms.filter((x) => x !== p.id))}
              />
              <span>
                {p.label}
                {p.help && <span className="small muted"> {p.help}</span>}
                {!mine && <span className="small muted"> (you don&apos;t have this)</span>}
              </span>
            </label>
          );
        })}
      </fieldset>
      {!locked && !outOfReach && (
        <div className="row row-between">
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
            {role.id ? "Save role" : "Create role"}
          </button>
          {onDelete && (
            <button className="btn btn-danger-outline btn-sm" type="button" disabled={busy} onClick={onDelete}>
              Delete role
            </button>
          )}
        </div>
      )}
    </form>
  );
}

export function Roles({ me }: { me: Me }) {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string>("");
  const [formKey, setFormKey] = useState(0);

  const load = () => api<{ roles: Role[] }>("GET", "roles").then((d) => setRoles(d.roles));
  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, []);

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setDone("");
    try {
      await fn();
      setDone(success);
      await load();
      setFormKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Roles &amp; permissions</h1>
      <p className="muted">A role is a set of permissions. Everyone with the role gets them. Changing someone&apos;s role signs them out so the change takes effect straight away.</p>
      <Problem message={error} />
      <Done message={done} />
      {!roles && !error && <p className="muted">Loading…</p>}
      {roles?.map((r) => (
        <details key={`${r.id}-${formKey}`} className="card" open={open === r.id} onToggle={(e) => (e.currentTarget.open ? setOpen(r.id) : open === r.id && setOpen(""))}>
          <summary>
            <strong>{r.name}</strong> <span className="small muted">· {r.users} {r.users === 1 ? "person" : "people"}{r.builtIn ? " · built in" : ""}</span>
            {r.description && <div className="small muted">{r.description}</div>}
          </summary>
          <RoleForm
            me={me}
            role={r}
            busy={busy}
            onSave={(v) => void run(() => api("PATCH", `roles/${r.id}`, v), `${r.name} was saved.`)}
            onDelete={r.builtIn ? undefined : () => window.confirm(`Delete the ${r.name} role?`) && void run(() => api("DELETE", `roles/${r.id}`), `${r.name} was deleted.`)}
          />
        </details>
      ))}
      <div className="card stack" key={`new-${formKey}`}>
        <h2 style={{ fontSize: "1.3rem", margin: 0 }}>Create a role</h2>
        <RoleForm me={me} role={{}} busy={busy} onSave={(v) => void run(() => api("POST", "roles", v), `${v.name} was created.`)} />
      </div>
    </div>
  );
}
