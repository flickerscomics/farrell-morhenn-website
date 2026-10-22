"use client";

import { useEffect, useState } from "react";
import { BBCode } from "@/components/bbcode";
import { api, when, type Me, type SectionInfo } from "./api";
import { Problem } from "./auth-views";

interface Change {
  id: string;
  section: string;
  path: string;
  label: string;
  submittedBy: string;
  submittedById: string;
  fields: Record<string, unknown>;
  before: Record<string, unknown>;
  status: string;
  reason: string;
  createdAt: number;
  decidedBy: string | null;
  decidedAt: number | null;
}

function Value({ v, bbcode }: { v: unknown; bbcode: boolean }) {
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return <span className="muted">(empty)</span>;
  if (typeof v === "boolean") return <>{v ? "Yes" : "No"}</>;
  if (Array.isArray(v)) return <>{v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ")}</>;
  if (typeof v === "object") return <code className="small">{JSON.stringify(v)}</code>;
  if (bbcode) return <BBCode className="prose bbcode admin-diff-text">{String(v)}</BBCode>;
  return <span style={{ whiteSpace: "pre-wrap" }}>{String(v)}</span>;
}

export function Approvals({ me, sections }: { me: Me; sections: SectionInfo[] }) {
  const [data, setData] = useState<{ canApprove: boolean; pending: Change[]; recent: Change[] } | null>(null);
  const [error, setError] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  const load = () =>
    api<{ canApprove: boolean; pending: Change[]; recent: Change[] }>("GET", "approvals")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);

  async function act(id: string, action: "approve" | "reject" | "withdraw") {
    setBusy(id);
    setError("");
    try {
      await api("POST", `approvals/${id}/${action}`, action === "reject" ? { reason: reasons[id] ?? "" } : {});
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const labelOf = (c: Change, field: string) => (sections.find((s) => s.name === c.section)?.fields.find((f) => f.name === field)?.label ?? field).replace(/\s*\(.*\)$/, "");

  if (!data) return error ? <Problem message={error} /> : <p className="muted">Loading…</p>;
  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{data.canApprove ? "Profile changes waiting for approval" : "My submitted changes"}</h1>
      <Problem message={error} />
      {data.pending.length === 0 && <p className="muted">Nothing is waiting for approval.</p>}
      {data.pending.map((c) => (
        <article key={c.id} className="card stack">
          <div>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>{c.label}</h2>
            <p className="small muted" style={{ margin: 0 }}>
              Sent by {c.submittedBy} on {when(c.createdAt)}
            </p>
          </div>
          <div className="table-wrap">
            <table className="table admin-diff">
              <thead>
                <tr>
                  <th scope="col">Field</th>
                  <th scope="col">Now</th>
                  <th scope="col">Proposed</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(c.fields).map((k) => (
                  <tr key={k}>
                    <th scope="row">{labelOf(c, k)}</th>
                    <td><Value v={c.before[k]} bbcode={k === "body"} /></td>
                    <td><Value v={c.fields[k]} bbcode={k === "body"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.canApprove && c.submittedById !== me.id ? (
            <div className="stack">
              <div className="field">
                <label className="label" htmlFor={`reason-${c.id}`}>Reason, if rejecting (shown to {c.submittedBy})</label>
                <textarea id={`reason-${c.id}`} className="textarea" rows={2} value={reasons[c.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [c.id]: e.target.value })} />
              </div>
              <div className="row">
                <button className="btn btn-primary btn-sm" disabled={busy === c.id} onClick={() => void act(c.id, "approve")}>Approve and publish</button>
                <button className="btn btn-danger-outline btn-sm" disabled={busy === c.id} onClick={() => void act(c.id, "reject")}>Reject</button>
              </div>
            </div>
          ) : c.submittedById === me.id ? (
            <div className="row">
              <span className="small muted">Waiting for an admin.{data.canApprove ? " Someone else must approve your own changes." : ""}</span>
              <button className="btn btn-ghost btn-sm" disabled={busy === c.id} onClick={() => void act(c.id, "withdraw")}>Withdraw</button>
            </div>
          ) : null}
        </article>
      ))}
      {data.recent.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.3rem" }}>Recently decided</h2>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {data.recent.map((c) => (
                  <tr key={c.id}>
                    <td>{c.label}<div className="small muted">by {c.submittedBy}</div></td>
                    <td><span className={`badge ${c.status === "approved" ? "badge-success" : "badge-danger"}`}>{c.status === "approved" ? "Approved" : "Rejected"}</span></td>
                    <td className="small">{c.reason}</td>
                    <td className="small muted">{c.decidedBy ? `${c.decidedBy}, ` : ""}{when(c.decidedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
