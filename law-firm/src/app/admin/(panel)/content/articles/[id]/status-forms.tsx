"use client";

import { ActionForm, ACheckbox, ASubmit } from "@/components/admin/action-form";
import { ConfirmSubmit } from "@/components/client-ui";
import { articleStatusAction } from "../actions";

export function StatusForms({ id, status, isCase }: { id: string; status: string; isCase: boolean }) {
  return (
    <div className="stack">
      {status !== "PUBLISHED" && (
        <ActionForm action={articleStatusAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="publish" />
          {isCase && <ACheckbox name="confirmAnonymised" label="I confirm this announcement names no client and reveals no confidential information." />}
          <div><ASubmit>Publish</ASubmit></div>
        </ActionForm>
      )}
      {status === "PUBLISHED" && (
        <ActionForm action={articleStatusAction} className="">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="unpublish" />
          <ASubmit className="btn btn-secondary">Unpublish (back to draft)</ASubmit>
        </ActionForm>
      )}
      {status !== "ARCHIVED" && (
        <ActionForm action={articleStatusAction} className="">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="archive" />
          <ConfirmSubmit title="Archive this article?" message="It will be removed from the public site but kept for reference." confirmLabel="Archive" tone="primary" className="btn btn-secondary">
            Archive
          </ConfirmSubmit>
        </ActionForm>
      )}
      <ActionForm action={articleStatusAction} className="">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="op" value="delete" />
        <ConfirmSubmit title="Delete this article permanently?" message="This cannot be undone. Consider archiving instead.">Delete</ConfirmSubmit>
      </ActionForm>
    </div>
  );
}
