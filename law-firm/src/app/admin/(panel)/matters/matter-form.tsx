"use client";

import { ActionForm, ACheckbox, AInput, ASelect, ASubmit, ATextarea } from "@/components/admin/action-form";
import { MATTER_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import type { FormState } from "@/lib/validation";

type Option = { value: string; label: string };

export type MatterFormValues = {
  id?: string;
  title: string;
  clientName: string;
  clientContact: string;
  practiceAreaId: string;
  leadAttorneyId: string;
  description: string;
  status: string;
  priority: string;
  isRestricted: boolean;
  followUpAt: string;
  memberIds: string[];
};

export function MatterForm({
  action,
  values,
  areas,
  team,
  canArchive,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  values: MatterFormValues;
  areas: Option[];
  team: Option[];
  canArchive: boolean;
  submitLabel: string;
}) {
  const statuses = Object.entries(MATTER_STATUS_LABELS)
    .filter(([k]) => canArchive || k !== "ARCHIVED" || values.status === "ARCHIVED")
    .map(([value, label]) => ({ value, label }));
  return (
    <ActionForm action={action}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="form-grid">
        <AInput name="title" label="Matter title" required defaultValue={values.title} maxLength={160} className="full" />
        <AInput name="clientName" label="Client (character) name" required defaultValue={values.clientName} maxLength={120} />
        <AInput name="clientContact" label="Client contact details" defaultValue={values.clientContact} maxLength={200} />
        <ASelect name="practiceAreaId" label="Practice area" options={areas} defaultValue={values.practiceAreaId} placeholder="—" />
        <ASelect name="leadAttorneyId" label="Lead attorney" options={team} defaultValue={values.leadAttorneyId} placeholder="Unassigned" />
        <ASelect name="status" label="Status" options={statuses} defaultValue={values.status} required />
        <ASelect name="priority" label="Priority" options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} defaultValue={values.priority} required />
        <AInput name="followUpAt" label="Follow-up (office time)" type="datetime-local" defaultValue={values.followUpAt} />
        <div className="field">
          <span className="label">Access</span>
          <ACheckbox name="isRestricted" label="Restricted matter" defaultChecked={values.isRestricted} help="Visible only to the lead attorney and supporting staff listed below." />
        </div>
        <ATextarea name="description" label="Matter description" rows={6} defaultValue={values.description} maxLength={10000} className="full" />
      </div>
      <fieldset>
        <legend>Supporting staff</legend>
        <div className="grid grid-3" style={{ gap: "0.5rem" }}>
          {team.map((t) => (
            <label key={t.value} className="check">
              <input type="checkbox" name="memberIds" value={t.value} defaultChecked={values.memberIds.includes(t.value)} />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div><ASubmit>{submitLabel}</ASubmit></div>
    </ActionForm>
  );
}
