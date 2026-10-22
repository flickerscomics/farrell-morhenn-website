import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Markdown, OfficeHoursTable, PageHero } from "@/components/ui";
import { timeZoneName } from "@/lib/time";
import { enquiryFormProps } from "@/server/form-props";
import { getPage } from "@/server/public";
import { getSettings } from "@/server/settings";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("contact");
  return {
    title: "Contact",
    description: page?.metaDescription || "Office address, telephone, opening hours and enquiry form.",
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const [settings, page, { accepting, initialAreaName: _unused, ...props }] = await Promise.all([
    getSettings(),
    getPage("contact"),
    enquiryFormProps(),
  ]);
  void _unused;
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={page?.title ?? "Contact the office"}
        lead={page?.summary}
        crumbs={[{ label: "Contact" }]}
      />
      <section className="section-tight">
        <div className="container split">
          <aside className="stack">
            <div className="card">
              <dl className="contact-block" style={{ margin: 0 }}>
                <dt>Office</dt>
                <dd>
                  <address style={{ fontStyle: "normal" }}>
                    {settings.addressLines.map((l) => <div key={l}>{l}</div>)}
                  </address>
                </dd>
                <dt>Telephone (in character)</dt>
                <dd>{settings.phone}</dd>
                <dt>Email (in character)</dt>
                <dd><a href={`mailto:${settings.email}`}>{settings.email}</a></dd>
                {settings.contactMethods.length > 0 && (
                  <>
                    <dt>Ways to reach us</dt>
                    <dd>
                      <ul className="list-check small">
                        {settings.contactMethods.map((m) => <li key={m}>{m}</li>)}
                      </ul>
                    </dd>
                  </>
                )}
              </dl>
              {settings.locationNote && <p className="small muted" style={{ margin: 0 }}>{settings.locationNote}</p>}
            </div>
            <div className="card">
              <h3>Office hours</h3>
              <p className="small muted">{timeZoneName(settings.timezone)} ({settings.timezone})</p>
              <OfficeHoursTable hours={settings.officeHours} timezone={settings.timezone} />
            </div>
            <Link href="/consultation" className="btn btn-primary btn-block">Request a consultation</Link>
          </aside>
          <div>
            {page?.body && <Markdown className="prose prose-sans">{page.body}</Markdown>}
            <h2 style={{ marginTop: "2rem" }}>General enquiry</h2>
            <p className="muted">
              For matter-specific questions, you can also <Link href="/enquiry">choose a practice area</Link> on the full enquiry form.
            </p>
            {accepting ? (
              <EnquiryForm {...props} />
            ) : (
              <div className="notice notice-warn"><p>Online enquiries are paused. Please call or visit the office.</p></div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
