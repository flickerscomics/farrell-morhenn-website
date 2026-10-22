"use client";

import { ActionForm, ACheckbox, AInput, ASubmit, ATextarea } from "@/components/admin/action-form";
import { MarkdownField, SectionsEditor } from "@/components/admin/editors";
import { savePageAction } from "./actions";

export function PageForm({ values, core, sectionsHelp }: { values: { id: string; title: string; summary: string; body: string; metaDescription: string; isPublished: boolean; sections: { heading: string; body: string }[] }; core: boolean; sectionsHelp: string }) {
  return (
    <ActionForm action={savePageAction}>
      <input type="hidden" name="id" value={values.id} />
      <div className="form-grid">
        <AInput name="title" label="Title" required defaultValue={values.title} maxLength={200} className="full" />
        <ATextarea name="summary" label="Summary / introduction" rows={2} defaultValue={values.summary} maxLength={600} className="full" />
        <MarkdownField name="body" label="Body" defaultValue={values.body} rows={12} />
        <ATextarea name="metaDescription" label="Search & social description" rows={2} defaultValue={values.metaDescription} maxLength={300} className="full" />
      </div>
      <fieldset>
        <legend>Sections</legend>
        <p className="help" style={{ marginBottom: "0.75rem" }}>{sectionsHelp}</p>
        <SectionsEditor name="sections" initial={values.sections} />
      </fieldset>
      {core ? <p className="help">This is a core page and always stays published.</p> : <ACheckbox name="isPublished" label="Published" defaultChecked={values.isPublished} />}
      <div><ASubmit>Save page</ASubmit></div>
    </ActionForm>
  );
}
