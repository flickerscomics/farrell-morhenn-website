"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "btn btn-primary",
  name,
  value,
  disabled,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-disabled={pending || disabled} name={name} value={value}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" /> {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Submit button that asks for confirmation in an accessible modal dialog
 * before submitting its form. Used for destructive or irreversible actions.
 */
export function ConfirmSubmit({
  children,
  title,
  message,
  confirmLabel = "Confirm",
  className = "btn btn-danger-outline btn-sm",
  tone = "danger",
  name,
  value,
}: {
  children: ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
  className?: string;
  tone?: "danger" | "primary";
  name?: string;
  value?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const { pending } = useFormStatus();

  const confirm = () => {
    dialogRef.current?.close();
    const form = buttonRef.current?.form;
    if (!form) return;
    // Preserve the button's name/value in the submission.
    if (name) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = name;
      hidden.value = value ?? "";
      form.appendChild(hidden);
    }
    form.requestSubmit();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        disabled={pending}
        onClick={() => dialogRef.current?.showModal()}
      >
        {pending ? <span className="spinner" aria-hidden="true" /> : null}
        {children}
      </button>
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={() => dialogRef.current?.close()} autoFocus>
            Cancel
          </button>
          <button type="button" className={tone === "danger" ? "btn btn-danger" : "btn btn-primary"} onClick={confirm}>
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}

type Flash = { message: string; tone: "success" | "error" | "info" };

function readFlash(): Flash | null {
  const match = document.cookie.match(/(?:^|;\s*)cw_flash=([^;]+)/);
  if (!match) return null;
  document.cookie = "cw_flash=; Max-Age=0; path=/";
  try {
    const b64 = decodeURIComponent(match[1]).replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (parsed && typeof parsed.message === "string") return parsed as Flash;
  } catch {
    /* ignore malformed cookie */
  }
  return null;
}

/** Displays one-time notifications queued by server actions. */
export function Toaster() {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<(Flash & { id: number })[]>([]);

  useEffect(() => {
    const check = () => {
      const flash = readFlash();
      if (flash) setToasts((t) => [...t.slice(-2), { ...flash, id: Date.now() }]);
    };
    check();
    const interval = window.setInterval(check, 800);
    return () => window.clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => setToasts((t) => t.slice(1)), 6000);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone === "error" ? "toast-error" : ""}`}>
          <span>{t.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
