import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { strParam } from "@/components/ui";
import { getStaff } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { LoginForm } from "./login-form";

export const metadata = { title: "Staff sign-in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getStaff()) redirect("/admin");
  const sp = await searchParams;
  const settings = await getSettings();
  return (
    <div className="auth-card">
      <div className="row" style={{ marginBottom: "1.25rem" }}>
        <BrandMark />
        <div>
          <strong style={{ fontFamily: "var(--font-serif)", color: "var(--navy)" }}>{settings.firmName}</strong>
          <div className="small muted">Staff administration</div>
        </div>
      </div>
      <h1>Sign in</h1>
      {sp.reset && (
        <div className="notice notice-success" role="status" style={{ marginBottom: "1rem" }}>
          <p>Your password has been changed. Sign in with your new password.</p>
        </div>
      )}
      <LoginForm next={strParam(sp.next, 200) || "/admin"} />
      <p className="small muted" style={{ marginTop: "1.25rem" }}>
        Forgotten your password? Ask a firm administrator to issue a one-time reset link from the staff accounts page.
      </p>
      <p className="small" style={{ margin: 0 }}>
        <Link href="/">← Back to the website</Link>
      </p>
    </div>
  );
}
