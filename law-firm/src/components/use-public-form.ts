"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { formDataToObject, initialFormState, type FieldErrors, type FormState } from "@/lib/validation";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Wires a form to a server action with client-side pre-validation.
 * Submitting through a transition (instead of the form's native action)
 * keeps the visitor's answers in place if the server returns errors.
 * Without JavaScript the form still posts to the server action directly.
 */
export function usePublicForm(action: Action, validate: (values: Record<string, string>) => FieldErrors) {
  const [state, formAction, actionPending] = useActionState(action, initialFormState);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [transitionPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const errors = validate(formDataToObject(data));
    setClientErrors(errors);
    if (Object.keys(errors).length) {
      const first = form.querySelector<HTMLElement>(`[name="${CSS.escape(Object.keys(errors)[0])}"]`);
      first?.focus();
      return;
    }
    startTransition(() => formAction(data));
  };

  const errors: FieldErrors = { ...(state.errors ?? {}), ...clientErrors };
  const pending = actionPending || transitionPending;
  return { state, formAction, onSubmit, errors, pending, clientInvalid: Object.keys(clientErrors).length > 0 };
}
