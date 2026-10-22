"use client";

import { useEffect, useState } from "react";
import { api, when } from "./api";
import { Problem } from "./auth-views";

interface Entry {
  id: number;
  at: number;
  userName: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
}

const ACTIONS: Record<string, string> = {
  "setup.completed": "Created the first admin account",
  "setup.failed": "Setup attempt with a wrong code",
  login: "Signed in",
  "login.locked": "Account locked after wrong passwords",
  "password.changed": "Changed their password",
  "password.reset": "Reset their password with a link",
  "invite.accepted": "Accepted an invitation",
  "user.invited": "Invited",
  "user.invite_resent": "Sent a new invitation link to",
  "user.reset_link": "Created a password reset link for",
  "user.updated": "Changed the account of",
  "user.disabled": "Account disabled",
  "user.deleted": "Deleted the account of",
  "role.created": "Created the role",
  "role.updated": "Changed the role",
  "role.deleted": "Deleted the role",
  "content.updated": "Published a change to",
  "content.created": "Added",
  "content.deleted": "Deleted",
  "file.uploaded": "Uploaded",
  "profile.submitted": "Sent a profile change for approval:",
  "profile.approved": "Approved and published a profile change:",
  "profile.rejected": "Rejected a profile change:",
  "profile.withdrawn": "Withdrew a profile change:",
};

function detailText(detail: string) {
  if (!detail) return "";
  try {
    const d = JSON.parse(detail) as Record<string, unknown>;
    return Object.entries(d)
      .filter(([, v]) => v !== null && v !== "")
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join("; ");
  } catch {
    return detail;
  }
}

export function Activity() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [more, setMore] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(before?: number) {
    setLoading(true);
    try {
      const d = await api<{ entries: Entry[] }>("GET", `audit${before ? `?before=${before}` : ""}`);
      setEntries((old) => (before ? [...old, ...d.entries] : d.entries));
      setMore(d.entries.length === 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Activity log</h1>
      <p className="muted">Every sign-in and change made through the admin area. Changes to the website are also kept in the repository&apos;s history on GitHub.</p>
      <Problem message={error} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">What</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{when(e.at)}</td>
                <td className="small">{e.userName || "—"}</td>
                <td className="small">
                  {ACTIONS[e.action] ?? e.action} {e.target && <strong>{e.target}</strong>}
                  {e.detail && <div className="muted">{detailText(e.detail)}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {!loading && more && entries.length > 0 && (
        <button className="btn btn-secondary btn-sm" onClick={() => void load(entries[entries.length - 1].id)}>
          Show older
        </button>
      )}
    </div>
  );
}
