"use client";

import { useId, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useFormCtx } from "./action-form";
import { INTAKE_FIELD_TYPES, type IntakeField } from "@/lib/intake";

/** Markdown textarea with a rendered preview tab. */
export function MarkdownField({
  name,
  label,
  defaultValue,
  rows = 14,
  help,
  required,
}: {
  name: string;
  label: string;
  defaultValue: string;
  rows?: number;
  help?: string;
  required?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const { errors } = useFormCtx();
  return (
    <div className="field full">
      <div className="row row-between">
        <label className="label" htmlFor={id}>
          {label} {required && <span className="req" aria-hidden="true">*</span>}
        </label>
        <div className="md-editor-tabs" role="group" aria-label={`${label} view`}>
          <button type="button" className={`btn btn-sm ${tab === "write" ? "btn-primary" : "btn-ghost"}`} aria-pressed={tab === "write"} onClick={() => setTab("write")}>
            Write
          </button>
          <button type="button" className={`btn btn-sm ${tab === "preview" ? "btn-primary" : "btn-ghost"}`} aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>
            Preview
          </button>
        </div>
      </div>
      <textarea
        id={id}
        name={name}
        className="textarea"
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        hidden={tab !== "write"}
        aria-invalid={errors[name] ? true : undefined}
      />
      {tab === "preview" && (
        <div className="md-preview prose" aria-live="polite">
          {value.trim() ? <ReactMarkdown skipHtml>{value}</ReactMarkdown> : <p className="muted">Nothing to preview.</p>}
        </div>
      )}
      <p className="help">{help ?? "Supports Markdown: ## headings, **bold**, *italic*, lists and [links](/path). Raw HTML is not rendered."}</p>
      {errors[name] && <p className="error-text" role="alert">{errors[name]}</p>}
    </div>
  );
}

/** Choose an existing public image, upload a new one, or remove it. */
export function ImageField({
  name,
  label,
  currentId,
  library,
}: {
  name: string;
  label: string;
  currentId: string | null;
  library: { id: string; label: string }[];
}) {
  const id = useId();
  const { errors } = useFormCtx();
  return (
    <fieldset className="full">
      <legend>{label}</legend>
      <div className="row" style={{ alignItems: "flex-start" }}>
        {currentId ? <img src={`/media/${currentId}`} alt="" className="thumb" /> : <div className="thumb" aria-hidden="true" />}
        <div className="form" style={{ flex: 1, gap: "0.75rem" }}>
          <div className="field">
            <label className="label" htmlFor={`${id}-sel`}>From the media library</label>
            <select id={`${id}-sel`} name={`${name}Id`} className="select" defaultValue={currentId ?? ""}>
              <option value="">No image</option>
              {library.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor={`${id}-file`}>Or upload a new image</label>
            <input id={`${id}-file`} type="file" name={`${name}File`} className="input" accept=".jpg,.jpeg,.png,.webp" />
            <p className="help">JPEG, PNG or WebP. Images are resized and stripped of metadata. An upload replaces the selection above.</p>
            {errors[`${name}File`] && <p className="error-text" role="alert">{errors[`${name}File`]}</p>}
          </div>
        </div>
      </div>
    </fieldset>
  );
}

type Section = { heading: string; body: string };

/** Ordered list of heading/body sections, submitted as JSON. */
export function SectionsEditor({ name, initial, headingLabel = "Heading", bodyLabel = "Body (Markdown)" }: { name: string; initial: Section[]; headingLabel?: string; bodyLabel?: string }) {
  const [items, setItems] = useState<Section[]>(initial);
  const update = (i: number, patch: Partial<Section>) => setItems((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) =>
    setItems((all) => {
      const next = [...all];
      const j = i + d;
      if (j < 0 || j >= next.length) return all;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  return (
    <div className="full">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.map((s, i) => (
        <div key={i} className="list-editor-row">
          <div className="form" style={{ gap: "0.6rem" }}>
            <div className="field">
              <label className="label" htmlFor={`${name}-h-${i}`}>{headingLabel} {i + 1}</label>
              <input id={`${name}-h-${i}`} className="input" value={s.heading} maxLength={160} onChange={(e) => update(i, { heading: e.target.value })} />
            </div>
            <div className="field">
              <label className="label" htmlFor={`${name}-b-${i}`}>{bodyLabel}</label>
              <textarea id={`${name}-b-${i}`} className="textarea" rows={5} value={s.body} onChange={(e) => update(i, { body: e.target.value })} />
            </div>
          </div>
          <div className="stack" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move section ${i + 1} up`}>↑</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move section ${i + 1} down`}>↓</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((all) => all.filter((_, j) => j !== i))} aria-label={`Remove section ${i + 1}`}>✕</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: "0.75rem" }} onClick={() => setItems((all) => [...all, { heading: "", body: "" }])}>
        Add section
      </button>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = { text: "Short text", textarea: "Long text", select: "Choice list", date: "Date" };

/** Builder for practice-area intake questions, submitted as JSON. */
export function IntakeEditor({ name, initial }: { name: string; initial: IntakeField[] }) {
  const [fields, setFields] = useState<IntakeField[]>(initial);
  const { errors } = useFormCtx();
  const update = (i: number, patch: Partial<IntakeField>) => setFields((all) => all.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const keyFrom = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "q_$1").slice(0, 40) || "question";
  return (
    <div className="full">
      <input type="hidden" name={name} value={JSON.stringify(fields)} />
      {errors[name] && <p className="error-text" role="alert">{errors[name]}</p>}
      {fields.length === 0 && <p className="small muted">No extra questions. Visitors will see only the general enquiry fields.</p>}
      {fields.map((f, i) => (
        <div key={i} className="list-editor-row">
          <div className="form-grid" style={{ gap: "0.6rem" }}>
            <div className="field full">
              <label className="label" htmlFor={`${name}-l-${i}`}>Question {i + 1}</label>
              <input
                id={`${name}-l-${i}`}
                className="input"
                value={f.label}
                maxLength={120}
                onChange={(e) => update(i, { label: e.target.value, key: f.key && f.key !== keyFrom(f.label) ? f.key : keyFrom(e.target.value) })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor={`${name}-t-${i}`}>Answer type</label>
              <select id={`${name}-t-${i}`} className="select" value={f.type} onChange={(e) => update(i, { type: e.target.value as IntakeField["type"] })}>
                {INTAKE_FIELD_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor={`${name}-k-${i}`}>Field key</label>
              <input id={`${name}-k-${i}`} className="input mono" value={f.key} maxLength={40} onChange={(e) => update(i, { key: e.target.value })} />
            </div>
            {f.type === "select" && (
              <div className="field full">
                <label className="label" htmlFor={`${name}-o-${i}`}>Options (one per line)</label>
                <textarea
                  id={`${name}-o-${i}`}
                  className="textarea"
                  rows={4}
                  style={{ minHeight: 90 }}
                  value={f.options.join("\n")}
                  onChange={(e) => update(i, { options: e.target.value.split("\n").map((o) => o.trimStart()).slice(0, 20) })}
                />
              </div>
            )}
            <div className="field full">
              <label className="label" htmlFor={`${name}-hp-${i}`}>Help text</label>
              <input id={`${name}-hp-${i}`} className="input" value={f.help} maxLength={240} onChange={(e) => update(i, { help: e.target.value })} />
            </div>
            <label className="check full">
              <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} />
              <span>Required</span>
            </label>
          </div>
          <div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFields((all) => all.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`}>✕</button>
          </div>
        </div>
      ))}
      {fields.length < 12 && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ marginTop: "0.75rem" }}
          onClick={() => setFields((all) => [...all, { key: "", label: "", type: "text", required: false, options: [], help: "" }])}
        >
          Add question
        </button>
      )}
      <p className="help" style={{ marginTop: "0.5rem" }}>Keep questions general. Do not ask for real-world personal information or confidential documents.</p>
    </div>
  );
}
