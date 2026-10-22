"use client";

import { ActionForm, AFile, AInput, ASubmit } from "@/components/admin/action-form";
import { uploadMediaAction } from "./actions";

export function UploadForm({ maxMb }: { maxMb: number }) {
  return (
    <ActionForm action={uploadMediaAction} multipart className="form-grid">
      <AFile name="file" label="Image" accept=".jpg,.jpeg,.png,.webp" help={`JPEG, PNG or WebP up to ${maxMb} MB. Resized to at most 2000px and stripped of metadata.`} />
      <AInput name="altText" label="Description (alt text)" required maxLength={200} />
      <div><ASubmit className="btn btn-primary btn-sm">Upload</ASubmit></div>
    </ActionForm>
  );
}
