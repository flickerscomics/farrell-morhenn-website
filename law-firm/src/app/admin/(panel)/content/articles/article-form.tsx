"use client";

import { ActionForm, ACheckbox, AInput, ASelect, ASubmit, ATextarea } from "@/components/admin/action-form";
import { ImageField, MarkdownField } from "@/components/admin/editors";
import { ARTICLE_TYPE_LABELS } from "@/lib/labels";
import { saveArticleAction } from "./actions";

type Opt = { value: string; label: string };
export type ArticleValues = {
  id?: string; title: string; slug: string; summary: string; body: string; type: string; categoryId: string; authorId: string;
  tags: string; metaDescription: string; isFeatured: boolean; featuredImageId: string | null; publishedAt: string; practiceAreaIds: string[];
};

export function ArticleForm({ values, categories, authors, areas, library, canPublish }: { values: ArticleValues; categories: Opt[]; authors: Opt[]; areas: Opt[]; library: { id: string; label: string }[]; canPublish: boolean }) {
  return (
    <ActionForm action={saveArticleAction} multipart>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="form-grid">
        <AInput name="title" label="Title" required defaultValue={values.title} maxLength={200} className="full" />
        <AInput name="slug" label="URL slug" required defaultValue={values.slug} maxLength={80} help="Used in /news/<slug>. Lowercase letters, numbers and hyphens." />
        <ASelect name="type" label="Type" required options={Object.entries(ARTICLE_TYPE_LABELS).map(([value, label]) => ({ value, label }))} defaultValue={values.type} />
        <ASelect name="categoryId" label="Category" options={categories} defaultValue={values.categoryId} placeholder="Uncategorised" />
        <ASelect name="authorId" label="Author" options={authors} defaultValue={values.authorId} placeholder="The firm" />
        <ATextarea name="summary" label="Summary" required rows={2} defaultValue={values.summary} maxLength={400} className="full" />
        <MarkdownField name="body" label="Article body" defaultValue={values.body} required />
        <AInput name="tags" label="Tags" defaultValue={values.tags} help="Comma separated, e.g. traffic, rights" />
        {canPublish ? (
          <AInput name="publishedAt" label="Publication date (office time)" type="datetime-local" defaultValue={values.publishedAt} help="A future date schedules the article; it appears once published and the date passes." />
        ) : (
          <p className="help">Publication dates are set by editors with publishing rights.</p>
        )}
        <ATextarea name="metaDescription" label="Search & social description" rows={2} defaultValue={values.metaDescription} maxLength={300} className="full" help="Optional. Defaults to the summary." />
        <ImageField name="featuredImage" label="Featured image" currentId={values.featuredImageId} library={library} />
        <fieldset className="full">
          <legend>Related practice areas</legend>
          <div className="grid grid-3" style={{ gap: "0.4rem" }}>
            {areas.map((a) => (
              <label key={a.value} className="check"><input type="checkbox" name="practiceAreaIds" value={a.value} defaultChecked={values.practiceAreaIds.includes(a.value)} /> <span>{a.label}</span></label>
            ))}
          </div>
        </fieldset>
        <ACheckbox name="isFeatured" label="Feature this article" defaultChecked={values.isFeatured} />
      </div>
      <div className="row"><ASubmit>Save article</ASubmit></div>
    </ActionForm>
  );
}
