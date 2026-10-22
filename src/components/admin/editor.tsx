"use client";

// Lists and edits the site's content. The forms are built from the field
// definitions in .pages.yml (sent by the API), so every section Pages CMS can
// edit is editable here too.

import { useEffect, useState } from "react";
import { BBCode } from "@/components/bbcode";
import { Markdown } from "@/components/ui";
import { defaults, type Field } from "@/server/schema";
import { api, fileToBase64, when, type SectionInfo } from "./api";
import { go } from "./app";
import { Done, Problem } from "./auth-views";

type Raw = Record<string, unknown>;

/** Fields written in BBCode, which get a formatted preview. */
const BBCODE_FIELDS = new Set(["people.body", "press.body", "press.boilerplate", "settings.press.boilerplate"]);

// ─── Lists ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived", OPEN: "Open", CLOSED: "Closed", ACTIVE: "Active", ON_LEAVE: "On leave", INACTIVE: "Inactive", DEPARTED: "Departed" };

export function SectionList({ section }: { section: SectionInfo }) {
  const [items, setItems] = useState<{ file: string; label: string; summary: Raw; canEdit: boolean }[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    api<{ items: typeof items }>("GET", `items?section=${encodeURIComponent(section.name)}`)
      .then((d) => setItems(d.items))
      .catch((e: Error) => setError(e.message));
  }, [section.name]);
  const shown = (items ?? []).filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.label.localeCompare(b.label));
  return (
    <div className="stack">
      <div className="row row-between">
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{section.label}</h1>
        {section.canCreate && (
          <a className="btn btn-primary btn-sm" href={`#/new/${section.name}`}>
            Add new
          </a>
        )}
      </div>
      <Problem message={error} />
      {!items && !error && <p className="muted">Loading…</p>}
      {items && items.length > 6 && <input className="input" placeholder="Search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />}
      {items && items.length === 0 && <p className="muted">Nothing here yet.</p>}
      {shown.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {shown.map((i) => (
                <tr key={i.file}>
                  <td>
                    <a href={`#/edit/${section.name}/${i.file}`}>{i.label}</a>
                    {typeof i.summary.title === "string" && <div className="small muted">{i.summary.title}</div>}
                  </td>
                  <td className="small">
                    {typeof i.summary.status === "string" && <span className="badge badge-neutral">{STATUS_LABELS[i.summary.status] ?? i.summary.status}</span>}
                    {i.summary.draft === true && <span className="badge badge-neutral">Draft</span>}
                    {i.summary.published === false && <span className="badge badge-muted">Hidden</span>}
                  </td>
                  <td className="small muted">{String(i.summary.releaseDate ?? i.summary.publishedOn ?? "")}</td>
                  <td className="small">{i.canEdit ? "" : "View only"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Editor ────────────────────────────────────────────────────────────────

interface Loaded {
  values: Raw;
  sha: string;
  file: string;
  canEdit: boolean;
  restricted: string[];
  needsApproval: boolean;
  pending: { id: string; createdAt: number; fields: Raw } | null;
}

export function Editor({ section, file, isNew }: { section: SectionInfo; file?: string; isNew?: boolean }) {
  const [item, setItem] = useState<Loaded | null>(null);
  const [values, setValues] = useState<Raw>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (isNew) {
      const blank = defaults(section.fields);
      setItem({ values: blank, sha: "", file: "", canEdit: true, restricted: [], needsApproval: false, pending: null });
      setValues(blank);
      return;
    }
    const d = await api<Loaded>("GET", `item?section=${encodeURIComponent(section.name)}${file ? `&file=${encodeURIComponent(file)}` : ""}`);
    setItem(d);
    setValues(d.pending ? { ...d.values, ...d.pending.fields } : d.values);
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.name, file, isNew]);

  async function save() {
    setBusy(true);
    setError("");
    setDone("");
    try {
      if (isNew) {
        const r = await api<{ file: string }>("POST", "item", { section: section.name, values });
        go("edit", section.name, r.file);
        return;
      }
      const r = await api<{ pending?: boolean; unchanged?: boolean; file: string }>("PUT", "item", { section: section.name, file: item?.file || undefined, sha: item?.sha, values });
      if (r.unchanged) setDone("Nothing has changed.");
      else if (r.pending) setDone("Sent for approval. Your changes will appear on the website once an admin approves them.");
      else setDone("Saved. The website will show the change in about two minutes.");
      if (section.kind === "collection" && r.file && r.file !== item?.file) {
        go("edit", section.name, r.file);
        return;
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item || !window.confirm(`Delete "${String(values[section.primary] ?? item.file)}"? This removes it from the website.`)) return;
    setBusy(true);
    try {
      await api("POST", "item/delete", { section: section.name, file: item.file, sha: item.sha });
      go("section", section.name);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!item) return error ? <Problem message={error} /> : <p className="muted">Loading…</p>;
  const title = isNew ? `New: ${section.label}` : String(values[section.primary] || section.label);
  const editable = item.canEdit;
  return (
    <div className="stack">
      <p className="small">
        {section.kind === "collection" ? <a href={`#/section/${section.name}`}>← {section.label}</a> : <a href="#/">← Dashboard</a>}
      </p>
      <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{title}</h1>
      {!editable && <div className="notice notice-info"><p>You can view this but not change it.</p></div>}
      {item.needsApproval && editable && <div className="notice notice-info"><p>Changes to profiles are checked by an admin before they appear on the website.</p></div>}
      {item.pending && (
        <div className="notice notice-warn">
          <p>
            You sent changes for approval on {when(item.pending.createdAt)}. They&apos;re shown below. Saving again replaces them.
          </p>
        </div>
      )}
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {[false, true].map((locked) => {
          const fields = section.fields.filter((f) => item.restricted.includes(f.name) === locked);
          if (fields.length === 0) return null;
          return (
            <div key={String(locked)} className="stack">
              {locked && (
                <>
                  <h2 style={{ fontSize: "1.2rem", margin: "1rem 0 0" }}>Set by an admin</h2>
                  <p className="small muted" style={{ margin: 0 }}>Ask an admin if any of these need changing.</p>
                </>
              )}
              <div className="form-grid">
                {fields.map((f) => (
                  <FieldInput
                    key={f.name}
                    field={f}
                    path={f.name}
                    section={section}
                    value={values[f.name]}
                    disabled={!editable || locked}
                    onChange={(v) => setValues((old) => ({ ...old, [f.name]: v }))}
                  />
                ))}
              </div>
            </div>
          );
        })}
        <Problem message={error} />
        <Done message={done} />
        {editable && (
          <div className="row row-between admin-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : isNew ? "Create" : item.needsApproval ? "Send for approval" : "Save"}
            </button>
            {!isNew && section.kind === "collection" && section.canCreate && (
              <button className="btn btn-danger-outline btn-sm" type="button" disabled={busy} onClick={() => void remove()}>
                Delete
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

// ─── Fields ────────────────────────────────────────────────────────────────

const optionCache = new Map<string, Promise<{ value: string; label: string }[]>>();

function useOptions(collection: string | undefined) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    if (!collection) return;
    if (!optionCache.has(collection)) {
      optionCache.set(
        collection,
        api<{ options: { value: string; label: string }[] }>("GET", `options?collection=${encodeURIComponent(collection)}`).then((d) => d.options).catch(() => []),
      );
    }
    void optionCache.get(collection)!.then(setOptions);
  }, [collection]);
  return options;
}

function selectOptions(f: Field) {
  return (f.options?.values ?? []).map((v) => (typeof v === "string" ? { name: v, label: v } : v));
}

interface FieldProps {
  field: Field;
  path: string;
  section: SectionInfo;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}

const WIDE = new Set(["text", "rich-text", "object", "reference"]);

function FieldInput(props: FieldProps) {
  const { field, path, disabled } = props;
  const id = `f-${path.replace(/[^\w-]/g, "-")}`;
  const wide = WIDE.has(field.type) || !!field.list;
  return (
    <div className={`field${wide ? " full" : ""}`}>
      {field.type === "boolean" && !field.list ? (
        <label className="admin-check" htmlFor={id}>
          <input id={id} type="checkbox" checked={props.value === true} disabled={disabled} onChange={(e) => props.onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      ) : (
        <label className="label" htmlFor={id} id={`${id}-label`}>
          {field.label} {field.required && <span className="req">*</span>}
        </label>
      )}
      {field.list ? <ListInput {...props} id={id} /> : field.type === "boolean" ? null : <SingleInput {...props} id={id} />}
    </div>
  );
}

function SingleInput({ field, path, section, value, disabled, onChange, id }: FieldProps & { id: string }) {
  const text = typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
  const options = useOptions(field.type === "reference" ? field.options?.collection : undefined);
  const [preview, setPreview] = useState(false);
  switch (field.type) {
    case "number":
      return <input id={id} className="input" type="number" value={text} disabled={disabled} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
    case "date":
      return <input id={id} className="input" type="date" value={text} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <select id={id} className="select" value={text} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {selectOptions(field).map((o) => (
            <option key={o.name} value={o.name}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "reference":
      if (field.options?.multiple) {
        const chosen = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="admin-choices" id={id} role="group" aria-labelledby={`${id}-label`}>
            {options.map((o) => (
              <label key={o.value} className="admin-check">
                <input type="checkbox" disabled={disabled} checked={chosen.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...chosen, o.value] : chosen.filter((x) => x !== o.value))} />
                <span>{o.label}</span>
              </label>
            ))}
            {options.length === 0 && <span className="small muted">Nothing to choose from yet.</span>}
          </div>
        );
      }
      return (
        <select id={id} className="select" value={text} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "image":
    case "file":
      return <UploadInput field={field} path={path} section={section} value={text} disabled={disabled} onChange={onChange} id={id} />;
    case "object":
      return (
        <div className="admin-object" id={id} role="group" aria-labelledby={`${id}-label`}>
          <div className="form-grid">
            {(field.fields ?? []).map((f) => (
              <FieldInput
                key={f.name}
                field={f}
                path={`${path}.${f.name}`}
                section={section}
                value={((value as Raw) ?? {})[f.name]}
                disabled={disabled || !!f.readonly}
                onChange={(v) => onChange({ ...((value as Raw) ?? {}), [f.name]: v })}
              />
            ))}
          </div>
        </div>
      );
    case "text":
    case "rich-text": {
      const kind = BBCODE_FIELDS.has(`${section.name}.${path}`) ? "bbcode" : field.type === "rich-text" ? "markdown" : null;
      return (
        <>
          <textarea id={id} className="textarea" rows={field.type === "rich-text" || kind ? 12 : 4} value={text} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
          {kind && (
            <div className="row">
              <span className="help">{kind === "bbcode" ? "Formatting: BBCode, e.g. [b]bold[/b], [i]italic[/i], [list][*]item[/list]." : "Formatting: Markdown, e.g. **bold**, *italic*, - list item."}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(!preview)}>
                {preview ? "Hide preview" : "Preview"}
              </button>
            </div>
          )}
          {preview && kind && <div className="card card-flat admin-preview">{kind === "bbcode" ? <BBCode>{text}</BBCode> : <Markdown>{text}</Markdown>}</div>}
        </>
      );
    }
    default:
      return <input id={id} className="input" value={text} disabled={disabled || !!field.readonly} onChange={(e) => onChange(e.target.value)} />;
  }
}

function ListInput(props: FieldProps & { id: string }) {
  const { field, value, disabled, onChange } = props;
  const list = Array.isArray(value) ? value : [];
  const item: Field = { ...field, list: false, label: field.label };
  const fixed = typeof field.list === "object" && field.list !== null && (field.list as { min?: number; max?: number }).min !== undefined && (field.list as { min?: number }).min === (field.list as { max?: number }).max;
  const move = (i: number, d: number) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const blank = field.type === "object" ? defaults(field.fields ?? []) : field.type === "number" ? "" : "";
  return (
    <div className="admin-list" id={props.id} role="group" aria-labelledby={`${props.id}-label`}>
      {list.map((v, i) => {
        const summary = field.type === "object" ? String(Object.values((v as Raw) ?? {}).find((x) => typeof x === "string" && x) ?? `Entry ${i + 1}`) : "";
        return (
          <div key={i} className={field.type === "object" ? "admin-list-item card card-flat" : "admin-list-row"}>
            {field.type === "object" && <p className="small" style={{ margin: 0 }}><strong>{summary}</strong></p>}
            <SingleInput {...props} field={item} path={props.path} value={v} onChange={(nv) => onChange(list.map((x, j) => (j === i ? nv : x)))} id={`${props.id}-${i}`} />
            {!disabled && !fixed && (
              <div className="row admin-list-tools">
                <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(list.filter((_, j) => j !== i))}>Remove</button>
              </div>
            )}
          </div>
        );
      })}
      {!disabled && !fixed && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange([...list, blank])}>
          Add {field.type === "object" ? "an entry" : "another"}
        </button>
      )}
    </div>
  );
}

function UploadInput({ field, path, section, value, disabled, onChange, id }: { field: Field; path: string; section: SectionInfo; value: string; disabled: boolean; onChange: (v: unknown) => void; id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [local, setLocal] = useState("");
  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > 3 * 1024 * 1024) {
      setError("Files can be up to 3 MB.");
      return;
    }
    setBusy(true);
    try {
      const data = await fileToBase64(file);
      const r = await api<{ path: string }>("POST", "upload", { section: section.name, field: path.replace(/\.\d+(?=\.|$)/g, ""), name: file.name, data });
      if (field.type === "image") setLocal(URL.createObjectURL(file));
      onChange(r.path);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const image = field.type === "image";
  return (
    <div className="stack admin-upload">
      {value && image && <img src={local || value} alt="" className="admin-upload-preview" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
      {value && <p className="small muted" style={{ margin: 0 }}>{value}</p>}
      {!disabled && (
        <div className="row">
          <input id={id} type="file" accept={image ? "image/jpeg,image/png,image/webp,image/gif" : ".pdf,image/jpeg,image/png,image/webp"} disabled={busy} onChange={(e) => void pick(e.target.files?.[0])} />
          {value && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setLocal(""); onChange(""); }}>
              Remove
            </button>
          )}
        </div>
      )}
      {busy && <p className="small muted">Uploading…</p>}
      <Problem message={error} />
    </div>
  );
}
