"use client";

import { ActionForm, AInput, ASelect, ASubmit, ATextarea } from "@/components/admin/action-form";
import { VACANCY_STATUS_LABELS } from "@/lib/labels";
import { saveVacancyAction } from "./actions";

export type VacancyValues = {
  id?: string; title: string; slug: string; department: string; employmentType: string; summary: string; description: string;
  responsibilities: string; requirements: string; status: string; closesAt: string; sortOrder: number;
};

export function VacancyForm({ values }: { values: VacancyValues }) {
  return (
    <ActionForm action={saveVacancyAction}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="form-grid">
        <AInput name="title" label="Title" required defaultValue={values.title} maxLength={120} />
        <AInput name="slug" label="URL slug" required defaultValue={values.slug} help="Used in /careers/<slug>." maxLength={80} />
        <AInput name="department" label="Department" defaultValue={values.department} maxLength={80} />
        <AInput name="employmentType" label="Employment type" defaultValue={values.employmentType} maxLength={80} />
        <ASelect name="status" label="Status" required options={Object.entries(VACANCY_STATUS_LABELS).map(([value, label]) => ({ value, label }))} defaultValue={values.status} help="Only open vacancies accept applications. Drafts are hidden." />
        <AInput name="closesAt" label="Applications close (office time)" type="datetime-local" defaultValue={values.closesAt} />
        <AInput name="sortOrder" label="Sort order" type="number" defaultValue={values.sortOrder} />
        <ATextarea name="summary" label="Summary" required rows={2} defaultValue={values.summary} maxLength={300} className="full" />
        <ATextarea name="description" label="Description (Markdown)" rows={6} defaultValue={values.description} maxLength={8000} className="full" />
        <ATextarea name="responsibilities" label="Responsibilities (one per line)" rows={5} defaultValue={values.responsibilities} className="full" />
        <ATextarea name="requirements" label="Requirements (one per line)" rows={5} defaultValue={values.requirements} className="full" />
      </div>
      <div><ASubmit>Save vacancy</ASubmit></div>
    </ActionForm>
  );
}
