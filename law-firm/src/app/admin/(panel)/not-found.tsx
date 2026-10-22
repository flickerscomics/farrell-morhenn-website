import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="panel" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: "1.6rem" }}>Record not found</h1>
      <p>It may have been deleted, or it may be a restricted record you are not permitted to see.</p>
      <Link href="/admin" className="btn btn-primary">Back to the dashboard</Link>
    </div>
  );
}
