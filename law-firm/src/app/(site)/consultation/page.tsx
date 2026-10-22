import type { Metadata } from "next";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { OfficeHoursTable, PageHero, strParam } from "@/components/ui";
import { timeZoneName, zonedDateString } from "@/lib/time";
import { bookableAttorneys } from "@/server/public";
import { issueFormToken } from "@/server/security";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Request a consultation",
  description: "Request a consultation with a Calder Whitmore attorney. Requests are confirmed by staff.",
  alternates: { canonical: "/consultation" },
};

export default async function ConsultationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [settings, attorneys] = await Promise.all([getSettings(), bookableAttorneys()]);
  const wanted = strParam(sp.attorney, 80);
  const initial = attorneys.find((a) => a.slug === wanted);
  const now = new Date();
  const minDate = zonedDateString(new Date(now.getTime() + settings.minNoticeHours * 3600_000), settings.timezone);
  const maxDate = zonedDateString(new Date(now.getTime() + settings.maxAdvanceDays * 86400_000), settings.timezone);
  const tzName = timeZoneName(settings.timezone);

  return (
    <>
      <PageHero
        eyebrow="Consultations"
        title={initial ? `Request a consultation with ${initial.fullName}` : "Request a consultation"}
        lead="Choose a preferred date and time. A member of staff will confirm the appointment or suggest an alternative."
        crumbs={[{ label: "Request a consultation" }]}
      />
      <section className="section-tight">
        <div className="container split split-aside">
          <div>
            {settings.acceptingBookings ? (
              <AppointmentForm
                token={issueFormToken("appointment")}
                attorneys={attorneys.map((a) => ({ id: a.id, slug: a.slug, fullName: a.fullName, title: a.title }))}
                consultationTypes={settings.consultationTypes}
                contactMethods={settings.contactMethods}
                officeHours={settings.officeHours}
                slotMinutes={settings.slotMinutes}
                durationMinutes={settings.appointmentMinutes}
                minDate={minDate}
                maxDate={maxDate}
                tzName={tzName}
                timezone={settings.timezone}
                initialAttorneyId={initial?.id}
                notice={settings.enquiryNotice}
              />
            ) : (
              <div className="notice notice-warn">
                <p>Online consultation requests are paused. Please call the office on {settings.phone}.</p>
              </div>
            )}
          </div>
          <aside className="stack">
            <div className="card">
              <h3>Office hours</h3>
              <p className="small muted">{tzName} ({settings.timezone})</p>
              <OfficeHoursTable hours={settings.officeHours} timezone={settings.timezone} />
            </div>
            <div className="card">
              <h3>Booking rules</h3>
              <ul className="list-check small">
                <li>Requests need at least {settings.minNoticeHours} hours&apos; notice.</li>
                <li>You can request up to {settings.maxAdvanceDays} days ahead.</li>
                <li>Appointments last about {settings.appointmentMinutes} minutes.</li>
                <li>No live calendar is connected: staff confirm every request personally.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
