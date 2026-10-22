import Link from "next/link";

export const metadata = { title: "Access denied" };

export default function Forbidden() {
  return (
    <div className="panel" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: "1.6rem" }}>You do not have access to that page</h1>
      <p>
        Your role does not include the permission needed for this area. If you think you should have access, ask a firm
        administrator to review your role.
      </p>
      <Link href="/admin" className="btn btn-primary">Back to the dashboard</Link>
    </div>
  );
}
