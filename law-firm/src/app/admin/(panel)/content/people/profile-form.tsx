"use client";

import { ActionForm, ACheckbox, AInput, ASelect, ASubmit, ATextarea } from "@/components/admin/action-form";
import { ImageField, MarkdownField } from "@/components/admin/editors";
import { STAFF_ROLE_LABELS, STAFF_STATUS_LABELS } from "@/lib/labels";
import { saveProfileAction } from "./actions";

export type ProfileValues = {
  id?: string; fullName: string; slug: string; title: string; role: string; status: string; shortBio: string; biography: string;
  background: string; qualifications: string; barAdmissions: string; languages: string; notableCases: string; achievements: string;
  email: string; phone: string; joinedYear: string; sortOrder: number; portraitId: string | null; isPublished: boolean; isFeatured: boolean;
  isLeadership: boolean; acceptsConsultations: boolean; practiceAreaIds: string[];
};

export function ProfileForm({ values, areas, library }: { values: ProfileValues; areas: { value: string; label: string }[]; library: { id: string; label: string }[] }) {
  return (
    <ActionForm action={saveProfileAction} multipart>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="form-grid">
        <AInput name="fullName" label="Full name" required defaultValue={values.fullName} maxLength={120} />
        <AInput name="slug" label="URL slug" required defaultValue={values.slug} maxLength={80} help="Used in /people/<slug>." />
        <AInput name="title" label="Professional title" required defaultValue={values.title} maxLength={120} />
        <ASelect name="role" label="Role" required options={Object.entries(STAFF_ROLE_LABELS).map(([value, label]) => ({ value, label }))} defaultValue={values.role} />
        <ASelect
          name="status"
          label="Employment status"
          required
          options={Object.entries(STAFF_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          defaultValue={values.status}
          help="Active and on-leave profiles are public (if published). Inactive and departed profiles are hidden."
        />
        <AInput name="sortOrder" label="Sort order" type="number" defaultValue={values.sortOrder} />
        <ATextarea name="shortBio" label="Short biography" required rows={2} defaultValue={values.shortBio} maxLength={400} className="full" />
        <MarkdownField name="biography" label="Full biography" defaultValue={values.biography} rows={8} />
        <ATextarea name="background" label="Professional background" rows={3} defaultValue={values.background} className="full" />
        <ATextarea name="qualifications" label="Qualifications (in character)" rows={3} defaultValue={values.qualifications} />
        <ATextarea name="barAdmissions" label="Bar admissions (in character)" rows={3} defaultValue={values.barAdmissions} />
        <AInput name="languages" label="Languages" defaultValue={values.languages} help="Comma separated." />
        <AInput name="joinedYear" label="Joined the firm (year)" defaultValue={values.joinedYear} type="number" />
        <AInput name="email" label="Public email (in character)" type="email" defaultValue={values.email} />
        <AInput name="phone" label="Direct line (in character)" defaultValue={values.phone} maxLength={60} />
        <ATextarea name="notableCases" label="Notable cases (optional, no client names)" rows={3} defaultValue={values.notableCases} className="full" />
        <ATextarea name="achievements" label="Achievements and activities" rows={3} defaultValue={values.achievements} className="full" />
        <ImageField name="portrait" label="Portrait" currentId={values.portraitId} library={library} />
      </div>
      <fieldset>
        <legend>Practice areas</legend>
        <div className="grid grid-3" style={{ gap: "0.4rem" }}>
          {areas.map((a) => (
            <label key={a.value} className="check"><input type="checkbox" name="practiceAreaIds" value={a.value} defaultChecked={values.practiceAreaIds.includes(a.value)} /> <span>{a.label}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Visibility</legend>
        <ACheckbox name="isPublished" label="Show on the website" defaultChecked={values.isPublished} />
        <ACheckbox name="acceptsConsultations" label="Accepts consultation requests" defaultChecked={values.acceptsConsultations} />
        <ACheckbox name="isFeatured" label="Feature on the homepage" defaultChecked={values.isFeatured} />
        <ACheckbox name="isLeadership" label="Show in leadership on the About page" defaultChecked={values.isLeadership} />
      </fieldset>
      <div><ASubmit>Save profile</ASubmit></div>
    </ActionForm>
  );
}
