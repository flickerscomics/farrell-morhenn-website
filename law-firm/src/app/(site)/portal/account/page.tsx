import { PageHero } from "@/components/ui";
import { requireClient } from "@/server/auth";
import { ClientPasswordForm } from "../forms";
import { PortalBar } from "../portal-nav";

export const metadata = { title: "Portal account", robots: { index: false } };

export default async function PortalAccount() {
  const client = await requireClient();
  return (
    <>
      <PageHero eyebrow="Client portal" title="Account settings" crumbs={[{ label: "Client portal", href: "/portal" }, { label: "Account" }]} />
      <section className="section-tight">
        <div className="container container-narrow">
          <PortalBar name={client.characterName} />
          <div className="card">
            <p><strong>{client.characterName}</strong> · {client.email}</p>
            <h2 style={{ fontSize: "1.2rem" }}>Change password</h2>
            <ClientPasswordForm />
          </div>
          <p className="small muted" style={{ marginTop: "1rem" }}>To change your email or close your account, contact the office.</p>
        </div>
      </section>
    </>
  );
}
