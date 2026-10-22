"use client";

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, type Me } from "./api";

export function Problem({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="notice notice-error" role="alert">
      <p>{message}</p>
    </div>
  );
}

export function Done({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="notice notice-success" role="status">
      <p>{message}</p>
    </div>
  );
}

export function TextField({ label, help, ...props }: { label: string; help?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name;
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input className="input" id={id} {...props} />
      {help && <p className="help">{help}</p>}
    </div>
  );
}

export const USERNAME_HELP = "What you'll type to sign in. Spaces are fine, e.g. Richard Sullivan. Leave blank to use the name above.";
const PASSWORD_HELP = "At least 12 characters. A short sentence you'll remember works well.";

/** Runs a form submission, showing a problem message on failure. */
function useSubmit(action: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, onSubmit };
}

/** The firm's logo, shown on the sign-in screens. */
export const LogoContext = createContext<string | null>(null);

function Narrow({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  const logo = useContext(LogoContext);
  return (
    <div className="admin-narrow card">
      {logo && <img src={logo} alt="" className="admin-seal" width={96} height={96} />}
      <h1 style={{ fontSize: "1.8rem" }}>{title}</h1>
      {lead && <p className="muted">{lead}</p>}
      {children}
    </div>
  );
}

export function Login({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, onSubmit } = useSubmit(async () => {
    await api("POST", "login", { username, password });
    onDone();
  });
  return (
    <Narrow title="Staff sign-in" lead="For Farrell-Morhenn staff. Ask an admin if you need an account.">
      <form className="stack" onSubmit={onSubmit}>
        <Problem message={error} />
        <TextField label="Username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={(e) => setUsername(e.target.value)} />
        <TextField label="Password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="small muted">Forgotten your password or username? Ask an admin to help.</p>
      </form>
    </Narrow>
  );
}

export function Setup({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState({ code: "", name: "", username: "", password: "", confirm: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const { busy, error, onSubmit } = useSubmit(async () => {
    if (v.password !== v.confirm) throw new Error("The two passwords don't match.");
    await api("POST", "setup", { code: v.code, name: v.name, username: v.username, password: v.password });
    onDone();
  });
  return (
    <Narrow title="Create the first admin account" lead="This only works once. Enter the setup code saved in Cloudflare as ADMIN_SETUP_CODE.">
      <form className="stack" onSubmit={onSubmit}>
        <Problem message={error} />
        <TextField label="Setup code" name="code" type="password" autoComplete="off" required value={v.code} onChange={set("code")} />
        <TextField label="Your name" name="name" autoComplete="name" required value={v.name} onChange={set("name")} />
        <TextField label="Username" name="username" autoComplete="username" value={v.username} onChange={set("username")} help={USERNAME_HELP} />
        <TextField label="Password" name="password" type="password" autoComplete="new-password" required value={v.password} onChange={set("password")} help={PASSWORD_HELP} />
        <TextField label="Password again" name="confirm" type="password" autoComplete="new-password" required value={v.confirm} onChange={set("confirm")} />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create admin account"}
        </button>
      </form>
    </Narrow>
  );
}

export function AcceptLink({ token, onDone }: { token: string; onDone: () => void }) {
  const [info, setInfo] = useState<{ kind: string; name: string; username: string } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  useEffect(() => {
    api<{ kind: string; name: string; username: string }>("POST", "accept/check", { token })
      .then(setInfo)
      .catch((e: Error) => setLoadError(e.message));
  }, [token]);
  const { busy, error, onSubmit } = useSubmit(async () => {
    if (password !== confirm) throw new Error("The two passwords don't match.");
    await api("POST", "accept", { token, password });
    window.history.replaceState(null, "", window.location.pathname);
    onDone();
  });
  if (loadError) return <Narrow title="This link doesn't work"><Problem message={loadError} /></Narrow>;
  if (!info) return <p className="muted">Checking your link…</p>;
  const invite = info.kind === "invite";
  return (
    <Narrow title={invite ? `Welcome, ${info.name}` : "Choose a new password"} lead={invite ? "Choose a password to finish setting up your account." : `For ${info.username}.`}>
      <form className="stack" onSubmit={onSubmit}>
        <Problem message={error} />
        <TextField label="Your username" name="username" autoComplete="username" value={info.username} readOnly help="You'll use this to sign in." />
        <TextField label="New password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} help={PASSWORD_HELP} />
        <TextField label="New password again" name="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : invite ? "Create my account" : "Save password"}
        </button>
      </form>
    </Narrow>
  );
}

export function ChangePassword({ me }: { me: Me }) {
  const [v, setV] = useState({ current: "", password: "", confirm: "" });
  const [done, setDone] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const { busy, error, onSubmit } = useSubmit(async () => {
    setDone("");
    if (v.password !== v.confirm) throw new Error("The two new passwords don't match.");
    await api("POST", "password", { current: v.current, password: v.password });
    setV({ current: "", password: "", confirm: "" });
    setDone("Your password has been changed. You've been signed out everywhere else.");
  });
  return (
    <div className="stack" style={{ maxWidth: "32rem" }}>
      <h1 style={{ fontSize: "1.8rem" }}>Change password</h1>
      <form className="stack" onSubmit={onSubmit}>
        <Problem message={error} />
        <Done message={done} />
        <input type="hidden" autoComplete="username" value={me.username} readOnly />
        <TextField label="Current password" name="current" type="password" autoComplete="current-password" required value={v.current} onChange={set("current")} />
        <TextField label="New password" name="password" type="password" autoComplete="new-password" required value={v.password} onChange={set("password")} help={PASSWORD_HELP} />
        <TextField label="New password again" name="confirm" type="password" autoComplete="new-password" required value={v.confirm} onChange={set("confirm")} />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
