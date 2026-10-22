import type { Metadata } from "next";
import { ContactOptions, Markdown, OfficeHoursTable, PageHero } from "@/components/ui";
import { absoluteUrl, page, site } from "@/lib/content";
import { timeZoneName } from "@/lib/time";

const contact = page("contact");

export const metadata: Metadata = {
  title: "Contact",
  description: contact.metaDescription,
  alternates: { canonical: absoluteUrl("/contact/") },
};

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title={contact.title} lead={contact.summary} crumbs={[{ label: "Contact" }]} />
      <section className="section-tight">
        <div className="container split">
          <aside className="stack">
            <div className="card">
              <dl className="contact-block" style={{ margin: 0 }}>
                <dt>Office</dt>
                <dd>
                  <address style={{ fontStyle: "normal" }}>
                    {site.addressLines.map((l) => <div key={l}>{l}</div>)}
                  </address>
                </dd>
                <dt>Telephone</dt>
                <dd>{site.phone}</dd>
                <dt>Email</dt>
                <dd><a href={`mailto:${site.email}`}>{site.email}</a></dd>
              </dl>
              {site.locationNote && <p className="small muted" style={{ margin: 0 }}>{site.locationNote}</p>}
            </div>
            <div className="card">
              <h3>Office hours</h3>
              <p className="small muted">{timeZoneName(site.timezone)} ({site.timezone})</p>
              <OfficeHoursTable hours={site.officeHours} timezone={site.timezone} />
            </div>
          </aside>
          <div className="stack">
            <h2>How to reach us</h2>
            <ContactOptions methods={site.contactMethods} intro="Get in touch in any of these ways:" />
            <div className="notice notice-warn" role="note">
              <p><strong>Confidentiality.</strong> {site.confidentialityNotice}</p>
            </div>
            <h2 style={{ marginTop: "1.5rem" }}>Consultations</h2>
            <p>
              Ask for a consultation by any of the methods above. Tell us which attorney you would like to see (if any), the
              type of consultation and when you are available. Consultations last about {site.appointmentMinutes} minutes and
              are confirmed by staff.
            </p>
            <ul className="list-check">{site.consultationTypes.map((t) => <li key={t}>{t}</li>)}</ul>
            <div style={{ marginTop: "1.5rem" }}>
              <Markdown className="prose prose-sans">{contact.body}</Markdown>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
