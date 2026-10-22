import { PERMISSION_LIST, hasPermission } from "@/lib/permissions";
import { requireStaff } from "@/server/auth";
import { PasswordForm } from "./password-form";

export const metadata = { title: "My account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>My account</h1>
          <p>{staff.name} · {staff.email}</p>
        </div>
      </div>
      {(sp.required || staff.mustChangePassword) && (
        <div className="notice notice-warn" style={{ marginBottom: "1.25rem" }}>
          <p>You must choose a new password before continuing.</p>
        </div>
      )}
      <div className="detail-grid">
        <section className="panel">
          <h2>Change password</h2>
          <PasswordForm />
        </section>
        <section className="panel">
          <h2>Your role: {staff.role.name}</h2>
          <p className="small muted">{staff.role.description}</p>
          <ul className="list-check small">
            {PERMISSION_LIST
              .filter((p) => hasPermission(staff.permissions, p.key))
              .map((p) => <li key={p.key}>{p.label}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}
