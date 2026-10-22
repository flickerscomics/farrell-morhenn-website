"use client";

import { ActionForm, ACheckbox, AInput, ASelect, ASubmit, ATextarea, useFormCtx } from "@/components/admin/action-form";
import { ImageField } from "@/components/admin/editors";
import { WEEKDAY_NAMES, type OfficeHours } from "@/lib/time";
import { saveSettingsAction } from "./actions";

export type SettingsValues = {
  firmName: string; shortName: string; tagline: string; colorPrimary: string; colorAccent: string; phone: string; email: string;
  addressLines: string; locationNote: string; footerText: string; heroEyebrow: string; heroTitle: string; heroText: string;
  navigation: string; socialLinks: string; contactMethods: string; consultationTypes: string; enquiryNotice: string; defaultAssigneeId: string;
  timezone: string; slotMinutes: number; minNoticeHours: number; maxAdvanceDays: number; appointmentMinutes: number;
  acceptingEnquiries: boolean; acceptingBookings: boolean; logoId: string | null; officeHours: OfficeHours; homeSections: Record<string, boolean>;
};

const HOME_LABELS: Record<string, string> = {
  showPracticeAreas: "Practice areas",
  showAttorneys: "Featured attorneys",
  showProcess: "Consultation process",
  showArticles: "Recent articles",
  showCareers: "Careers band",
  showContact: "Office & hours",
};

const TIMEZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "Europe/London", "UTC"];

function HoursEditor({ hours }: { hours: OfficeHours }) {
  const { errors } = useFormCtx();
  return (
    <fieldset>
      <legend>Office hours</legend>
      {errors.officeHours && <p className="error-text" role="alert">{errors.officeHours}</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Day</th><th>Closed</th><th>Opens</th><th>Closes</th></tr></thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <tr key={d}>
                <th scope="row" style={{ textTransform: "none", fontSize: "0.9rem", background: "transparent" }}>{WEEKDAY_NAMES[d]}</th>
                <td><input type="checkbox" name={`hours_${d}_closed`} defaultChecked={hours[d].closed} aria-label={`${WEEKDAY_NAMES[d]} closed`} /></td>
                <td><input type="time" name={`hours_${d}_open`} className="input input-sm" defaultValue={hours[d].open} aria-label={`${WEEKDAY_NAMES[d]} opening time`} /></td>
                <td><input type="time" name={`hours_${d}_close`} className="input input-sm" defaultValue={hours[d].close} aria-label={`${WEEKDAY_NAMES[d]} closing time`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}

export function SettingsForm({ values, assignees, library }: { values: SettingsValues; assignees: { value: string; label: string }[]; library: { id: string; label: string }[] }) {
  return (
    <ActionForm action={saveSettingsAction} multipart>
      <fieldset>
        <legend>Firm identity</legend>
        <div className="form-grid">
          <AInput name="firmName" label="Firm name" required defaultValue={values.firmName} maxLength={120} />
          <AInput name="shortName" label="Short name (header)" required defaultValue={values.shortName} maxLength={60} />
          <AInput name="tagline" label="Tagline" defaultValue={values.tagline} maxLength={160} className="full" />
          <AInput name="colorPrimary" label="Primary colour" type="color" defaultValue={values.colorPrimary} help="Deep navy by default. Keep it dark enough for white text." />
          <AInput name="colorAccent" label="Accent colour" type="color" defaultValue={values.colorAccent} help="Used for rules and highlights." />
          <ImageField name="logo" label="Logo (optional, replaces the monogram)" currentId={values.logoId} library={library} />
        </div>
      </fieldset>
      <fieldset>
        <legend>Contact & office</legend>
        <div className="form-grid">
          <AInput name="phone" label="Telephone (in character)" required defaultValue={values.phone} maxLength={40} />
          <AInput name="email" label="Email (in character)" type="email" required defaultValue={values.email} />
          <ATextarea name="addressLines" label="Office address (one line each)" required rows={3} defaultValue={values.addressLines} />
          <ATextarea name="locationNote" label="Directions / location note" rows={3} defaultValue={values.locationNote} maxLength={600} />
        </div>
      </fieldset>
      <HoursEditor hours={values.officeHours} />
      <fieldset>
        <legend>Homepage</legend>
        <div className="form-grid">
          <AInput name="heroEyebrow" label="Hero eyebrow" defaultValue={values.heroEyebrow} maxLength={120} className="full" />
          <AInput name="heroTitle" label="Hero heading" required defaultValue={values.heroTitle} maxLength={160} className="full" />
          <ATextarea name="heroText" label="Hero text" required rows={3} defaultValue={values.heroText} maxLength={600} className="full" />
        </div>
        <p className="label" style={{ marginTop: "1rem" }}>Sections shown</p>
        <div className="grid grid-3" style={{ gap: "0.25rem" }}>
          {Object.entries(HOME_LABELS).map(([k, label]) => (
            <ACheckbox key={k} name={`home_${k}`} label={label} defaultChecked={values.homeSections[k]} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Navigation & footer</legend>
        <div className="form-grid">
          <ATextarea name="navigation" label="Main navigation" rows={7} defaultValue={values.navigation} code help={'One link per line: "Label | /path". Up to 12.'} />
          <ATextarea name="socialLinks" label="Social links" rows={7} defaultValue={values.socialLinks} code help={'One per line: "Label | https://…". Shown in the footer.'} />
          <ATextarea name="footerText" label="Footer disclaimer" rows={3} defaultValue={values.footerText} maxLength={600} className="full" />
        </div>
      </fieldset>
      <fieldset>
        <legend>Enquiries</legend>
        <div className="form-grid">
          <ATextarea name="contactMethods" label="Contact methods offered (one per line)" rows={5} defaultValue={values.contactMethods} />
          <div className="form">
            <ASelect name="defaultAssigneeId" label="Assign new enquiries to" options={assignees} defaultValue={values.defaultAssigneeId} placeholder="Leave unassigned" />
            <ACheckbox name="acceptingEnquiries" label="Accept online enquiries" defaultChecked={values.acceptingEnquiries} />
          </div>
          <ATextarea name="enquiryNotice" label="Roleplay notice shown on forms" rows={2} defaultValue={values.enquiryNotice} maxLength={500} className="full" />
        </div>
      </fieldset>
      <fieldset>
        <legend>Appointments</legend>
        <div className="form-grid">
          <ATextarea name="consultationTypes" label="Consultation types (one per line)" rows={5} defaultValue={values.consultationTypes} />
          <div className="form">
            <ASelect name="timezone" label="Office timezone" required options={(TIMEZONES.includes(values.timezone) ? TIMEZONES : [values.timezone, ...TIMEZONES]).map((t) => ({ value: t, label: t }))} defaultValue={values.timezone} />
            <ASelect name="slotMinutes" label="Booking slot interval" options={[15, 20, 30, 60].map((n) => ({ value: String(n), label: `${n} minutes` }))} defaultValue={String(values.slotMinutes)} />
          </div>
          <AInput name="appointmentMinutes" label="Default appointment length (minutes)" type="number" defaultValue={values.appointmentMinutes} />
          <AInput name="minNoticeHours" label="Minimum notice (hours)" type="number" defaultValue={values.minNoticeHours} />
          <AInput name="maxAdvanceDays" label="Booking window (days ahead)" type="number" defaultValue={values.maxAdvanceDays} />
          <ACheckbox name="acceptingBookings" label="Accept online consultation requests" defaultChecked={values.acceptingBookings} />
        </div>
      </fieldset>
      <div><ASubmit>Save settings</ASubmit></div>
    </ActionForm>
  );
}
