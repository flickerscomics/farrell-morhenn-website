"use client";

import { ActionForm, ACheckbox, AFile, AInput, ASelect, ASubmit, ATextarea } from "@/components/admin/action-form";
import { MATTER_EVENT_LABELS } from "@/lib/labels";
import { addMatterEventAction, linkClientAccountAction, uploadMatterDocumentAction } from "../actions";

export function EventForm({ matterId }: { matterId: string }) {
  return (
    <ActionForm action={addMatterEventAction}>
      <input type="hidden" name="matterId" value={matterId} />
      <div className="form-grid">
        <ASelect name="type" label="Type" required options={Object.entries(MATTER_EVENT_LABELS).map(([value, label]) => ({ value, label }))} defaultValue="UPDATE" />
        <AInput name="occursAt" label="Date and time (office time)" type="datetime-local" required />
        <AInput name="title" label="Title" required maxLength={160} className="full" />
        <ATextarea name="body" label="Details" rows={3} maxLength={5000} className="full" />
      </div>
      <div className="row">
        <ACheckbox name="isDeadline" label="Track as a deadline" />
        <ACheckbox name="clientVisible" label="Show to the client in the portal" />
      </div>
      <div><ASubmit className="btn btn-secondary btn-sm">Add to timeline</ASubmit></div>
    </ActionForm>
  );
}

export function DocumentForm({ matterId, maxMb }: { matterId: string; maxMb: number }) {
  return (
    <ActionForm action={uploadMatterDocumentAction} multipart>
      <input type="hidden" name="matterId" value={matterId} />
      <AFile name="file" label="File" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" help={`PDF, TXT, JPEG, PNG or WebP up to ${maxMb} MB. Stored privately.`} />
      <AInput name="description" label="Description" maxLength={200} />
      <ACheckbox name="clientVisible" label="Share with the client in the portal" />
      <div><ASubmit className="btn btn-secondary btn-sm">Upload document</ASubmit></div>
    </ActionForm>
  );
}

export function ClientLinkForm({ matterId, current }: { matterId: string; current: string }) {
  return (
    <ActionForm action={linkClientAccountAction}>
      <input type="hidden" name="matterId" value={matterId} />
      <AInput name="email" label="Client portal email" type="email" defaultValue={current} help="Leave empty and save to remove portal access." />
      <div><ASubmit className="btn btn-secondary btn-sm">Save portal access</ASubmit></div>
    </ActionForm>
  );
}
