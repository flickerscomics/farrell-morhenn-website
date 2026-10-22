"use client";

import { createContext, useActionState, useContext, useId, useTransition, type FormEvent, type ReactNode } from "react";
import { initialFormState, type FormState } from "@/lib/validation";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const FormCtx = createContext<{ errors: Record<string, string>; pending: boolean }>({ errors: {}, pending: false });

/**
 * Admin form bound to a server action. Validation errors returned by the
 * server are shown beside the matching fields, and the user's edits are kept
 * (the submission runs in a transition instead of resetting the form).
 */
export function ActionForm({
  action,
  children,
  className = "form",
  multipart,
  id,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  multipart?: boolean;
  id?: string;
}) {
  const [state, formAction, actionPending] = useActionState(action, initialFormState);
  const [transitionPending, start] = useTransition();
  const pending = actionPending || transitionPending;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const data = new FormData(e.currentTarget, submitter ?? undefined);
    start(() => formAction(data));
  };

  return (
    <FormCtx.Provider value={{ errors: state.errors ?? {}, pending }}>
      <form id={id} className={className} action={formAction} onSubmit={onSubmit} encType={multipart ? "multipart/form-data" : undefined}>
        {state.message && (
          <div className={`notice ${state.ok ? "notice-success" : "notice-error"}`} role={state.ok ? "status" : "alert"}>
            <p>{state.message}</p>
          </div>
        )}
        {children}
      </form>
    </FormCtx.Provider>
  );
}

export function useFormCtx() {
  return useContext(FormCtx);
}

type FieldProps = {
  name: string;
  label: string;
  help?: ReactNode;
  required?: boolean;
  className?: string;
};

function Wrap({ id, name, label, help, required, className, children }: FieldProps & { id: string; children: ReactNode }) {
  const { errors } = useFormCtx();
  const error = errors[name];
  return (
    <div className={`field ${className ?? ""}`}>
      <label className="label" htmlFor={id}>
        {label} {required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {children}
      {help && (
        <p className="help" id={`${id}-help`}>
          {help}
        </p>
      )}
      {error && (
        <p className="error-text" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function aria(id: string, name: string, help: ReactNode, errors: Record<string, string>) {
  const ids = [help ? `${id}-help` : null, errors[name] ? `${id}-error` : null].filter(Boolean).join(" ");
  return { "aria-describedby": ids || undefined, "aria-invalid": errors[name] ? true : undefined } as const;
}

export function AInput({
  type = "text",
  defaultValue,
  maxLength,
  placeholder,
  ...p
}: FieldProps & { type?: string; defaultValue?: string | number | null; maxLength?: number; placeholder?: string }) {
  const id = useId();
  const { errors } = useFormCtx();
  return (
    <Wrap {...p} id={id}>
      <input
        id={id}
        name={p.name}
        type={type}
        className="input"
        defaultValue={defaultValue ?? ""}
        required={p.required}
        maxLength={maxLength}
        placeholder={placeholder}
        {...aria(id, p.name, p.help, errors)}
      />
    </Wrap>
  );
}

export function ATextarea({
  defaultValue,
  rows = 6,
  maxLength,
  code,
  ...p
}: FieldProps & { defaultValue?: string | null; rows?: number; maxLength?: number; code?: boolean }) {
  const id = useId();
  const { errors } = useFormCtx();
  return (
    <Wrap {...p} id={id}>
      <textarea
        id={id}
        name={p.name}
        className={`textarea ${code ? "textarea-code" : ""}`}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        required={p.required}
        maxLength={maxLength}
        {...aria(id, p.name, p.help, errors)}
      />
    </Wrap>
  );
}

export function ASelect({
  options,
  defaultValue,
  placeholder,
  ...p
}: FieldProps & { options: { value: string; label: string }[]; defaultValue?: string | null; placeholder?: string }) {
  const id = useId();
  const { errors } = useFormCtx();
  return (
    <Wrap {...p} id={id}>
      <select id={id} name={p.name} className="select" defaultValue={defaultValue ?? ""} required={p.required} {...aria(id, p.name, p.help, errors)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function ACheckbox({ name, label, defaultChecked, help }: { name: string; label: string; defaultChecked?: boolean; help?: string }) {
  return (
    <div className="field">
      <label className="check">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} />
        <span>
          {label}
          {help && <span className="help" style={{ display: "block" }}>{help}</span>}
        </span>
      </label>
    </div>
  );
}

export function AFile({ name, label, accept, help }: { name: string; label: string; accept: string; help?: string }) {
  const id = useId();
  const { errors } = useFormCtx();
  return (
    <Wrap name={name} label={label} help={help} id={id}>
      <input id={id} name={name} type="file" className="input" accept={accept} {...aria(id, name, help, errors)} />
    </Wrap>
  );
}

export function ASubmit({ children, className = "btn btn-primary", name, value }: { children: ReactNode; className?: string; name?: string; value?: string }) {
  const { pending } = useFormCtx();
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending && <span className="spinner" aria-hidden="true" />} {children}
    </button>
  );
}
