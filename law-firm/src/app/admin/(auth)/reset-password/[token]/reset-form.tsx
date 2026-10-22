"use client";

import { ActionForm, AInput, ASubmit } from "@/components/admin/action-form";
import { resetPasswordAction } from "../../actions";

export function ResetForm({ token }: { token: string }) {
  return (
    <ActionForm action={resetPasswordAction}>
      <input type="hidden" name="token" value={token} />
      <AInput name="password" label="New password" type="password" required help="At least 12 characters, mixing letters with numbers or symbols." />
      <AInput name="confirmPassword" label="Confirm new password" type="password" required />
      <ASubmit className="btn btn-primary btn-block">Set password</ASubmit>
    </ActionForm>
  );
}
