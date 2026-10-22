"use client";

import { useEffect, useState } from "react";
import { api, can, type Me, type SectionInfo } from "./api";
import { groups } from "./app";

export function Dashboard({ me, sections }: { me: Me; sections: SectionInfo[] }) {
  const [waiting, setWaiting] = useState<{ count: number; approver: boolean } | null>(null);
  useEffect(() => {
    api<{ canApprove: boolean; pending: unknown[] }>("GET", "approvals")
      .then((d) => setWaiting({ count: d.pending.length, approver: d.canApprove }))
      .catch(() => setWaiting(null));
  }, []);

  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.9rem", margin: 0 }}>Welcome, {me.name.split(" ")[0]}</h1>
      <p className="muted">Changes you publish here appear on the website in about two minutes.</p>

      {waiting && waiting.count > 0 && (
        <div className="notice notice-warn">
          <p>
            {waiting.approver ? (
              <>
                <strong>{waiting.count}</strong> profile {waiting.count === 1 ? "change is" : "changes are"} waiting for approval. <a href="#/approvals">Review</a>
              </>
            ) : (
              <>
                You have {waiting.count === 1 ? "a change" : `${waiting.count} changes`} waiting for an admin to approve. <a href="#/approvals">See details</a>
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-3">
        {me.personSlug && can(me, "profile.edit_own") && (
          <a className="card card-link" href="#/profile">
            <h3>My profile</h3>
            <p className="small muted">Update your biography, photo, languages and qualifications.</p>
          </a>
        )}
        {groups(sections).flatMap(([, list]) =>
          list.map((s) => (
            <a key={s.name} className="card card-link" href={`#/section/${s.name}`}>
              <h3>{s.label}</h3>
              <p className="small muted">{s.group || (s.kind === "collection" ? "List" : "Settings")}</p>
            </a>
          )),
        )}
        {can(me, "staff.manage") && (
          <a className="card card-link" href="#/staff">
            <h3>Staff accounts</h3>
            <p className="small muted">Invite people, change roles and send password reset links.</p>
          </a>
        )}
        {can(me, "roles.manage") && (
          <a className="card card-link" href="#/roles">
            <h3>Roles &amp; permissions</h3>
            <p className="small muted">Create roles and choose what each can do.</p>
          </a>
        )}
        {can(me, "audit.view") && (
          <a className="card card-link" href="#/activity">
            <h3>Activity log</h3>
            <p className="small muted">Who signed in and what they changed.</p>
          </a>
        )}
      </div>
      {!me.personSlug && can(me, "profile.edit_own") && <p className="small muted">Your account isn&apos;t linked to a profile on the website yet. An admin can link it under Staff accounts.</p>}
    </div>
  );
}
