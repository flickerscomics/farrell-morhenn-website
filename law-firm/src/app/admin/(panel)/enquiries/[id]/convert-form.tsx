"use client";

import { ActionForm, ACheckbox, AInput, ASelect, ASubmit } from "@/components/admin/action-form";
import { convertEnquiryAction } from "../actions";

export function ConvertForm({ enquiryId, defaultTitle, lawyers, currentUserId }: { enquiryId: string; defaultTitle: string; lawyers: { id: string; name: string }[]; currentUserId: string }) {
  return (
    <ActionForm action={convertEnquiryAction}>
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <AInput name="title" label="Matter title" required defaultValue={defaultTitle} maxLength={160} />
      <ASelect name="leadAttorneyId" label="Lead attorney" options={lawyers.map((l) => ({ value: l.id, label: l.name }))} defaultValue={currentUserId} />
      <ACheckbox name="isRestricted" label="Restricted matter" help="Only the matter team will be able to see it." />
      <div><ASubmit>Open matter</ASubmit></div>
    </ActionForm>
  );
}
