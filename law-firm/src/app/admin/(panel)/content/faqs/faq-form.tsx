"use client";

import { ActionForm, ACheckbox, ASelect, ASubmit, ATextarea } from "@/components/admin/action-form";
import { MarkdownField } from "@/components/admin/editors";
import { saveFaqAction } from "./actions";

type Opt = { value: string; label: string };

export function FaqForm({ values, categories, areas }: { values: { id?: string; question: string; answer: string; categoryId: string; practiceAreaId: string; isPublished: boolean }; categories: Opt[]; areas: Opt[] }) {
  return (
    <ActionForm action={saveFaqAction}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="form-grid">
        <ATextarea name="question" label="Question" required rows={2} defaultValue={values.question} maxLength={300} className="full" />
        <MarkdownField name="answer" label="Answer" defaultValue={values.answer} rows={6} required />
        <ASelect name="categoryId" label="Category" options={categories} defaultValue={values.categoryId} placeholder="Uncategorised" />
        <ASelect name="practiceAreaId" label="Practice area" options={areas} defaultValue={values.practiceAreaId} placeholder="General FAQ page" help="Choosing a practice area shows the question on that practice area's page instead of the main FAQ page." />
        <ACheckbox name="isPublished" label="Published" defaultChecked={values.isPublished} />
      </div>
      <div><ASubmit>Save FAQ</ASubmit></div>
    </ActionForm>
  );
}
