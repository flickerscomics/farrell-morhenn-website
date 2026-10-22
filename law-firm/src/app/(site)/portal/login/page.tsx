import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero, strParam } from "@/components/ui";
import { getClient } from "@/server/auth";
import { ClientLoginForm } from "../forms";

export const metadata = { title: "Client portal sign-in", robots: { index: false } };

export default async function PortalLogin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getClient()) redirect("/portal");
  const next = strParam((await searchParams).next, 200) || "/portal";
  return (
    <>
      <PageHero eyebrow="Client portal" title="Sign in" lead="View the progress of your matters, read updates, exchange documents and message your legal team." crumbs={[{ label: "Client portal" }]} />
      <section className="section-tight">
        <div className="container split split-even">
          <div className="card"><ClientLoginForm next={next} /></div>
          <div className="stack">
            <h2 style={{ fontSize: "1.3rem" }}>New to the portal?</h2>
            <p>Create an account, then let your attorney know the email you used. They will share your matter with you.</p>
            <Link href="/portal/register" className="btn btn-secondary">Create an account</Link>
            <p className="small muted">Forgotten your password? Contact the office and staff will send you a one-time reset link.</p>
          </div>
        </div>
      </section>
    </>
  );
}
