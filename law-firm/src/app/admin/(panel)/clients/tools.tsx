"use client";

import { ActionForm, ASubmit } from "@/components/admin/action-form";
import { clientAccountAction } from "./actions";

export function ClientTools({ id, active }: { id: string; active: boolean }) {
  return (
    <div className="stack">
      <ActionForm action={clientAccountAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="op" value="reset" />
        <div><ASubmit className="btn btn-secondary btn-sm">Issue password reset link</ASubmit></div>
      </ActionForm>
      <ActionForm action={clientAccountAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="op" value="toggle" />
        <div><ASubmit className={active ? "btn btn-danger-outline btn-sm" : "btn btn-secondary btn-sm"}>{active ? "Deactivate account" : "Reactivate account"}</ASubmit></div>
      </ActionForm>
    </div>
  );
}
