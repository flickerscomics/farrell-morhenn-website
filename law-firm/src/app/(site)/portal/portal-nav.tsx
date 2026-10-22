import Link from "next/link";
import { clientLogoutAction } from "./actions";

export function PortalBar({ name }: { name: string }) {
  return (
    <div className="row row-between" style={{ marginBottom: "1.5rem" }}>
      <p className="muted" style={{ margin: 0 }}>Signed in as <strong>{name}</strong></p>
      <div className="row">
        <Link href="/portal" className="btn btn-ghost btn-sm">Dashboard</Link>
        <Link href="/portal/account" className="btn btn-ghost btn-sm">Account</Link>
        <form action={clientLogoutAction}><button type="submit" className="btn btn-secondary btn-sm">Sign out</button></form>
      </div>
    </div>
  );
}
