"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, can, setCsrf, type Me, type SectionInfo } from "./api";
import { AcceptLink, ChangePassword, LogoContext, Login, Setup } from "./auth-views";
import { Approvals } from "./approvals";
import { Activity } from "./activity";
import { Dashboard } from "./dashboard";
import { Editor, SectionList } from "./editor";
import { Roles } from "./roles";
import { Staff } from "./staff";

/** The part of the address after #, split into parts: #/edit/people/x.md → ["edit", "people", "x.md"]. */
function useRoute(): string[] {
  const read = () => (typeof window === "undefined" ? [] : window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent));
  const [route, setRoute] = useState<string[]>([]);
  useEffect(() => {
    const update = () => setRoute(read());
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

export function go(...parts: string[]) {
  window.location.hash = `#/${parts.map(encodeURIComponent).join("/")}`;
}

export function AdminApp({ logo = null }: { logo?: string | null }) {
  return (
    <LogoContext.Provider value={logo}>
      <AdminScreens />
    </LogoContext.Provider>
  );
}

function AdminScreens() {
  const route = useRoute();
  const [state, setState] = useState<{ loading: boolean; me: Me | null; setupRequired: boolean; error: string }>({ loading: true, me: null, setupRequired: false, error: "" });
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [contentError, setContentError] = useState("");

  const refresh = useCallback(async () => {
    let data: { user: Me | null; csrf?: string; setupRequired?: boolean };
    try {
      data = await api("GET", "session");
    } catch (e) {
      setState({ loading: false, me: null, setupRequired: false, error: (e as Error).message });
      return;
    }
    if (data.csrf) setCsrf(data.csrf);
    setState({ loading: false, me: data.user, setupRequired: !!data.setupRequired, error: "" });
    if (!data.user) return;
    // Content editing needs GitHub; accounts and roles don't, so a problem here only affects content.
    try {
      setSections((await api<{ sections: SectionInfo[] }>("GET", "schema")).sections);
      setContentError("");
    } catch (e) {
      setSections([]);
      setContentError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const { loading, me, setupRequired, error } = state;
  const [first, ...rest] = route;

  if (loading) return <Frame><p className="muted">Loading…</p></Frame>;
  if (first === "accept" && rest[0]) return <Frame><AcceptLink token={rest[0]} onDone={() => { go(); void refresh(); }} /></Frame>;
  if (error && !me) return <Frame><div className="notice notice-error" role="alert"><p>{error}</p></div></Frame>;
  if (!me) {
    if (setupRequired) return <Frame><Setup onDone={() => { go(); void refresh(); }} /></Frame>;
    return <Frame><Login onDone={() => { go(); void refresh(); }} /></Frame>;
  }

  async function signOut() {
    await api("POST", "logout").catch(() => undefined);
    setState({ loading: false, me: null, setupRequired: false, error: "" });
    go();
  }

  let view: ReactNode;
  switch (first) {
    case "section": {
      const s = sections.find((x) => x.name === rest[0]);
      view = !s ? <Missing /> : s.kind === "file" ? <Editor key={s.name} section={s} /> : <SectionList key={s.name} section={s} />;
      break;
    }
    case "edit": {
      const s = sections.find((x) => x.name === rest[0]);
      view = s ? <Editor key={`${rest[0]}/${rest[1]}`} section={s} file={rest[1]} /> : <Missing />;
      break;
    }
    case "new": {
      const s = sections.find((x) => x.name === rest[0]);
      view = s?.canCreate ? <Editor key={`new/${rest[0]}`} section={s} isNew /> : <Missing />;
      break;
    }
    case "profile": {
      const s = sections.find((x) => x.name === "people");
      view = s && me.personSlug ? <Editor key="profile" section={s} file={`${me.personSlug}.md`} /> : <p>Your account isn&apos;t linked to a profile yet. Ask an admin to link it.</p>;
      break;
    }
    case "approvals":
      view = <Approvals me={me} sections={sections} />;
      break;
    case "staff":
      view = can(me, "staff.manage") ? <Staff me={me} /> : <Missing />;
      break;
    case "roles":
      view = can(me, "roles.manage") ? <Roles me={me} /> : <Missing />;
      break;
    case "activity":
      view = can(me, "audit.view") ? <Activity /> : <Missing />;
      break;
    case "password":
      view = <ChangePassword me={me} />;
      break;
    default:
      view = <Dashboard me={me} sections={sections} />;
  }

  return (
    <Frame>
      <div className="admin-shell">
        <nav className="admin-nav" aria-label="Admin">
          <p className="admin-me">
            <strong>{me.name}</strong>
            <span className="small muted">{me.roleName}</span>
          </p>
          <ul>
            <li><a href="#/">Dashboard</a></li>
            {me.personSlug && can(me, "profile.edit_own") && <li><a href="#/profile">My profile</a></li>}
            <li><a href="#/approvals">{can(me, "profile.approve") ? "Approvals" : "My submitted changes"}</a></li>
          </ul>
          {groups(sections).map(([group, list]) => (
            <div key={group}>
              <p className="admin-nav-group">{group}</p>
              <ul>
                {list.map((s) => (
                  <li key={s.name}><a href={`#/section/${s.name}`}>{s.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
          {(can(me, "staff.manage") || can(me, "roles.manage") || can(me, "audit.view")) && (
            <>
              <p className="admin-nav-group">Team</p>
              <ul>
                {can(me, "staff.manage") && <li><a href="#/staff">Staff accounts</a></li>}
                {can(me, "roles.manage") && <li><a href="#/roles">Roles &amp; permissions</a></li>}
                {can(me, "audit.view") && <li><a href="#/activity">Activity log</a></li>}
              </ul>
            </>
          )}
          <ul>
            <li><a href="#/password">Change password</a></li>
            <li><button type="button" className="linkish" onClick={() => void signOut()}>Sign out</button></li>
          </ul>
        </nav>
        <div className="admin-main stack">
          {contentError && (
            <div className="notice notice-warn" role="status">
              <p>Website content can&apos;t be edited right now: {contentError}</p>
            </div>
          )}
          {view}
        </div>
      </div>
    </Frame>
  );
}

export function groups(sections: SectionInfo[]): [string, SectionInfo[]][] {
  const map = new Map<string, SectionInfo[]>();
  for (const s of sections) {
    const g = s.group || "Website";
    map.set(g, [...(map.get(g) ?? []), s]);
  }
  return [...map.entries()];
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <section className="section-tight admin">
      <div className="container">{children}</div>
    </section>
  );
}

function Missing() {
  return <p>This page doesn&apos;t exist, or you don&apos;t have permission to see it. <a href="#/">Back to the dashboard</a></p>;
}
