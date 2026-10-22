"use client";

import { ActionForm, AInput, ASubmit } from "@/components/admin/action-form";
import { loginAction } from "../actions";

export function LoginForm({ next }: { next: string }) {
  return (
    <ActionForm action={loginAction}>
      <input type="hidden" name="next" value={next} />
      <AInput name="email" label="Email" type="email" required />
      <AInput name="password" label="Password" type="password" required />
      <ASubmit className="btn btn-primary btn-block">Sign in</ASubmit>
    </ActionForm>
  );
}
