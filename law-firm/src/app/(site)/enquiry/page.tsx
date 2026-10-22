import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { PageHero, strParam } from "@/components/ui";
import { enquiryFormProps } from "@/server/form-props";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Make an enquiry",
  description: "Tell Calder Whitmore about your in-character legal matter. You will receive a reference number immediately.",
  alternates: { canonical: "/enquiry" },
};

export default async function EnquiryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { accepting, initialAreaName, ...props } = await enquiryFormProps(strParam(sp.area, 80));
  const settings = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="Make an enquiry"
        title={initialAreaName ? `${initialAreaName} enquiry` : "Tell us about your matter"}
        lead="Choose a practice area to answer a few matter-specific questions, or send a general enquiry. Every enquiry receives a reference number and is reviewed by a member of staff."
        crumbs={[{ label: "Make an enquiry" }]}
      />
      <section className="section-tight">
        <div className="container split split-aside">
          <div>
            {accepting ? (
              <EnquiryForm {...props} />
            ) : (
              <div className="notice notice-warn">
                <p>
                  Online enquiries are paused at the moment. Please call the office on {settings.phone} or visit us in
                  person.
                </p>
              </div>
            )}
          </div>
          <aside className="stack">
            <div className="card">
              <h3>What happens next</h3>
              <ol className="prose-sans" style={{ paddingLeft: "1.2rem", margin: 0 }}>
                <li>You receive a reference number immediately.</li>
                <li>A member of staff reviews your enquiry, usually within one in-character business day.</li>
                <li>We contact you by your preferred method to arrange next steps.</li>
              </ol>
            </div>
            <div className="card">
              <h3>Prefer to book directly?</h3>
              <p className="small">If you already know you would like to meet an attorney, request a consultation slot.</p>
              <Link href="/consultation" className="btn btn-secondary btn-block">
                Request a consultation
              </Link>
            </div>
            <p className="small muted">
              Required fields are marked with an asterisk (*). Fields marked optional can be left blank.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
