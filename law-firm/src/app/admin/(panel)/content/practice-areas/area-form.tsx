"use client";

import { ActionForm, ACheckbox, AInput, ASubmit, ATextarea } from "@/components/admin/action-form";
import { IntakeEditor, MarkdownField } from "@/components/admin/editors";
import type { IntakeField } from "@/lib/intake";
import { savePracticeAreaAction } from "./actions";

export type AreaValues = {
  id?: string; name: string; slug: string; shortDescription: string; overview: string; matterTypes: string; services: string;
  metaDescription: string; sortOrder: number; isPublished: boolean; isFeatured: boolean; intakeFields: IntakeField[]; attorneyIds: string[];
};

export function AreaForm({ values, people }: { values: AreaValues; people: { value: string; label: string }[] }) {
  return (
    <ActionForm action={savePracticeAreaAction}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="form-grid">
        <AInput name="name" label="Name" required defaultValue={values.name} maxLength={120} />
        <AInput name="slug" label="URL slug" required defaultValue={values.slug} maxLength={80} help="Used in /practice-areas/<slug>." />
        <ATextarea name="shortDescription" label="Short description" required rows={2} defaultValue={values.shortDescription} maxLength={400} className="full" />
        <MarkdownField name="overview" label="Full overview" defaultValue={values.overview} rows={10} />
        <ATextarea name="matterTypes" label="Types of matters handled (one per line)" rows={6} defaultValue={values.matterTypes} />
        <ATextarea name="services" label="Services offered (one per line)" rows={6} defaultValue={values.services} />
        <ATextarea name="metaDescription" label="Search & social description" rows={2} defaultValue={values.metaDescription} maxLength={300} className="full" />
        <AInput name="sortOrder" label="Sort order" type="number" defaultValue={values.sortOrder} />
        <div className="field">
          <span className="label">Visibility</span>
          <ACheckbox name="isPublished" label="Published on the website" defaultChecked={values.isPublished} />
          <ACheckbox name="isFeatured" label="Feature on the homepage" defaultChecked={values.isFeatured} />
        </div>
      </div>
      <fieldset>
        <legend>Assigned attorneys and staff</legend>
        <div className="grid grid-3" style={{ gap: "0.4rem" }}>
          {people.map((p) => (
            <label key={p.value} className="check"><input type="checkbox" name="attorneyIds" value={p.value} defaultChecked={values.attorneyIds.includes(p.value)} /> <span>{p.label}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Intake questions</legend>
        <p className="help" style={{ marginBottom: "0.75rem" }}>Extra questions shown on the enquiry form when a visitor chooses this practice area. FAQs for this area are managed on the FAQ page.</p>
        <IntakeEditor name="intakeFields" initial={values.intakeFields} />
      </fieldset>
      <div><ASubmit>Save practice area</ASubmit></div>
    </ActionForm>
  );
}
