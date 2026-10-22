import Link from "next/link";
import type { AuditEvent } from "@prisma/client";
import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/time";
import { SubmitButton } from "@/components/client-ui";

export function AdminHead({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="admin-head">
      <div>
        {back && (
          <p className="small" style={{ margin: "0 0 0.4rem" }}>
            <Link href={back.href}>← {back.label}</Link>
          </p>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function ActivityPanel({ events, timezone, title = "Activity history" }: { events: AuditEvent[]; timezone: string; title?: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {events.length === 0 ? (
        <p className="small muted">No activity recorded yet.</p>
      ) : (
        <ul className="feed">
          {events.map((e) => (
            <li key={e.id}>
              <div>{e.summary}</div>
              <div className="when">
                {e.actorLabel || e.actorType.toLowerCase()} · {formatDateTime(e.createdAt, timezone)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type NoteRow = { id: string; body: string; createdAt: Date; author: { name: string } | null };

/** Private internal notes. Rendered only on admin pages behind permission checks. */
export function NotesPanel({
  notes,
  timezone,
  action,
  hiddenFields,
  canWrite,
}: {
  notes: NoteRow[];
  timezone: string;
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  canWrite: boolean;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Internal notes</h2>
        <span className="badge badge-muted">Private</span>
      </div>
      {canWrite && (
        <form action={action} className="form" style={{ marginBottom: "1rem" }}>
          {Object.entries(hiddenFields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <div className="field">
            <label className="label" htmlFor="note-body">Add a note</label>
            <textarea id="note-body" name="body" className="textarea" rows={3} required maxLength={5000} style={{ minHeight: 90 }} />
          </div>
          <div>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Adding…">Add note</SubmitButton>
          </div>
        </form>
      )}
      {notes.length === 0 ? (
        <p className="small muted">No notes yet.</p>
      ) : (
        <ul className="feed">
          {notes.map((n) => (
            <li key={n.id}>
              <div className="when">
                {n.author?.name ?? "Former staff member"} · {formatDateTime(n.createdAt, timezone)}
              </div>
              <p className="note-body">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
