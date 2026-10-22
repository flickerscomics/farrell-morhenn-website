import { redirect } from "next/navigation";
import { PageHero } from "@/components/ui";
import { getClient } from "@/server/auth";
import { RegisterForm } from "../forms";

export const metadata = { title: "Create a portal account", robots: { index: false } };

export default async function Register() {
  if (await getClient()) redirect("/portal");
  return (
    <>
      <PageHero eyebrow="Client portal" title="Create an account" lead="Registering gives you a private area. You will only see matters the firm has shared with you." crumbs={[{ label: "Client portal", href: "/portal/login" }, { label: "Register" }]} />
      <section className="section-tight">
        <div className="container container-narrow"><div className="card"><RegisterForm /></div></div>
      </section>
    </>
  );
}
