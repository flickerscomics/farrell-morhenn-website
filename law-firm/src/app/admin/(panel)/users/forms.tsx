"use client";

import { ActionForm, ACheckbox, AInput, ASelect, ASubmit } from "@/components/admin/action-form";
import { createUserAction, resetLinkAction, revokeSessionsAction, updateUserAction } from "./actions";

type Opt = { value: string; label: string };

export function UserForm({ values, roles, profiles }: { values: { id?: string; name: string; email: string; roleId: string; staffProfileId: string; isActive: boolean }; roles: Opt[]; profiles: Opt[] }) {
  return (
    <ActionForm action={values.id ? updateUserAction : createUserAction}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="form-grid">
        <AInput name="name" label="Name" required defaultValue={values.name} maxLength={120} />
        <AInput name="email" label="Email (used to sign in)" type="email" required defaultValue={values.email} />
        <ASelect name="roleId" label="Role" required options={roles} defaultValue={values.roleId} placeholder="Choose…" />
        <ASelect name="staffProfileId" label="Linked public profile" options={profiles} defaultValue={values.staffProfileId} placeholder="None" help="Optional. Links the account to a People profile." />
        {values.id && <ACheckbox name="isActive" label="Account active" defaultChecked={values.isActive} help="Deactivating signs the person out immediately." />}
      </div>
      <div><ASubmit>{values.id ? "Save account" : "Create account"}</ASubmit></div>
    </ActionForm>
  );
}

export function UserTools({ id }: { id: string }) {
  return (
    <div className="stack">
      <ActionForm action={resetLinkAction}>
        <input type="hidden" name="id" value={id} />
        <p className="small muted" style={{ margin: 0 }}>Generates a one-time link the person can use to set a new password. Earlier unused links stop working.</p>
        <div><ASubmit className="btn btn-secondary btn-sm">Issue password reset link</ASubmit></div>
      </ActionForm>
      <ActionForm action={revokeSessionsAction}>
        <input type="hidden" name="id" value={id} />
        <div><ASubmit className="btn btn-secondary btn-sm">Sign out of all sessions</ASubmit></div>
      </ActionForm>
    </div>
  );
}
