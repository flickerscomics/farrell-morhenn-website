"use client";

import { ActionForm, AInput, ASubmit } from "@/components/admin/action-form";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction}>
      <AInput name="current" label="Current password" type="password" required />
      <AInput name="password" label="New password" type="password" required help="At least 12 characters, mixing letters with numbers or symbols." />
      <AInput name="confirmPassword" label="Confirm new password" type="password" required />
      <div><ASubmit>Change password</ASubmit></div>
    </ActionForm>
  );
}
