import type { Metadata } from "next";
import { ApplicationForm } from "@/components/forms/application-form";
import { PageHero } from "@/components/ui";
import { env } from "@/lib/env";
import { issueFormToken } from "@/server/security";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "General application",
  description: "Apply to join Calder Whitmore when no current vacancy fits.",
  alternates: { canonical: "/careers/apply" },
};

export default async function GeneralApplicationPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title="General application"
        lead="Interested in joining the firm but no current vacancy fits? Tell us about yourself and the role you are looking for."
        crumbs={[{ label: "Careers", href: "/careers" }, { label: "General application" }]}
      />
      <section className="section-tight">
        <div className="container container-narrow">
          <ApplicationForm
            token={issueFormToken("application")}
            vacancy={null}
            contactMethods={settings.contactMethods}
            maxUploadMb={Math.round(env.maxUploadBytes / 1024 / 1024)}
          />
        </div>
      </section>
    </>
  );
}
