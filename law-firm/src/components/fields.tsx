"use client";

import type { ReactNode } from "react";

// Small accessible form-field helpers. Each links its label, help text and
// error message to the control through ids and aria attributes.

type Base = {
  name: string;
  label: string;
  error?: string;
  help?: ReactNode;
  required?: boolean;
  className?: string;
  id?: string;
};

function describedBy(id: string, help?: ReactNode, error?: string) {
  return [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

function Label({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <label className="label" htmlFor={id}>
      {label}{" "}
      {required ? (
        <span className="req" aria-hidden="true">*</span>
      ) : (
        <span className="optional">(optional)</span>
      )}
    </label>
  );
}

function Extras({ id, help, error }: { id: string; help?: ReactNode; error?: string }) {
  return (
    <>
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
    </>
  );
}

export function TextField({
  type = "text",
  defaultValue,
  maxLength,
  autoComplete,
  placeholder,
  min,
  max,
  step,
  ...base
}: Base & {
  type?: string;
  defaultValue?: string;
  maxLength?: number;
  autoComplete?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: number;
}) {
  const id = base.id ?? `f-${base.name}`;
  return (
    <div className={`field ${base.className ?? ""}`}>
      <Label id={id} label={base.label} required={base.required} />
      <input
        id={id}
        name={base.name}
        type={type}
        className="input"
        defaultValue={defaultValue}
        required={base.required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(id, base.help, base.error)}
      />
      <Extras id={id} help={base.help} error={base.error} />
    </div>
  );
}

export function TextArea({
  defaultValue,
  maxLength,
  rows = 6,
  minLength,
  ...base
}: Base & { defaultValue?: string; maxLength?: number; rows?: number; minLength?: number }) {
  const id = base.id ?? `f-${base.name}`;
  return (
    <div className={`field ${base.className ?? ""}`}>
      <Label id={id} label={base.label} required={base.required} />
      <textarea
        id={id}
        name={base.name}
        className="textarea"
        rows={rows}
        defaultValue={defaultValue}
        required={base.required}
        maxLength={maxLength}
        minLength={minLength}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(id, base.help, base.error)}
      />
      <Extras id={id} help={base.help} error={base.error} />
    </div>
  );
}

export function SelectField({
  options,
  defaultValue,
  placeholder = "Select…",
  onChange,
  value,
  ...base
}: Base & {
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string | null;
  onChange?: (value: string) => void;
  value?: string;
}) {
  const id = base.id ?? `f-${base.name}`;
  return (
    <div className={`field ${base.className ?? ""}`}>
      <Label id={id} label={base.label} required={base.required} />
      <select
        id={id}
        name={base.name}
        className="select"
        {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? "" })}
        required={base.required}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(id, base.help, base.error)}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Extras id={id} help={base.help} error={base.error} />
    </div>
  );
}

export function FileField({ accept, ...base }: Base & { accept: string }) {
  const id = base.id ?? `f-${base.name}`;
  return (
    <div className={`field ${base.className ?? ""}`}>
      <Label id={id} label={base.label} required={base.required} />
      <input
        id={id}
        name={base.name}
        type="file"
        className="input"
        accept={accept}
        required={base.required}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(id, base.help, base.error)}
      />
      <Extras id={id} help={base.help} error={base.error} />
    </div>
  );
}

export function Acknowledge({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="check">
        <input
          type="checkbox"
          name="acknowledge"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "ack-error" : undefined}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p className="error-text" id="ack-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Hidden anti-spam fields included in every public form. */
export function SpamGuards({ token }: { token: string }) {
  return (
    <>
      <input type="hidden" name="formToken" value={token} />
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
    </>
  );
}

export function FormMessage({ message, ok }: { message?: string; ok?: boolean }) {
  if (!message) return null;
  return (
    <div className={`notice ${ok ? "notice-success" : "notice-error"}`} role={ok ? "status" : "alert"}>
      <p>{message}</p>
    </div>
  );
}
