import Link from "next/link";
import { PageHero } from "@/components/ui";
import { prisma } from "@/lib/db";
import { sha256 } from "@/server/security";
import { ClientResetForm } from "../../forms";

export const metadata = { title: "Reset portal password", robots: { index: false } };

export default async function ClientReset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = token.length >= 20 && token.length <= 100 ? await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  const valid = record && !record.usedAt && record.expiresAt > new Date() && record.clientAccountId;
  return (
    <>
      <PageHero eyebrow="Client portal" title="Choose a new password" crumbs={[{ label: "Client portal", href: "/portal/login" }, { label: "Reset password" }]} />
      <section className="section-tight">
        <div className="container container-narrow">
          {valid ? <div className="card"><ClientResetForm token={token} /></div> : (
            <div className="notice notice-error"><p>This link is invalid, has expired or has already been used. <Link href="/portal/login">Return to sign-in</Link>.</p></div>
          )}
        </div>
      </section>
    </>
  );
}
