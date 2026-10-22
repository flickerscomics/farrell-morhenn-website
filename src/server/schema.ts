// The editing forms come from .pages.yml, the same file Pages CMS uses, so
// both editors always offer the same fields. This module reads that file,
// turns form values back into content files, and checks values before they
// are saved.

import YAML from "yaml";
import type { Permission } from "./permissions";

export interface Field {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  readonly?: boolean;
  list?: boolean | Record<string, unknown>;
  fields?: Field[];
  default?: unknown;
  options?: {
    values?: (string | { name: string; label: string })[];
    collection?: string;
    multiple?: boolean;
    path?: string;
    extensions?: string[];
  };
}

export interface Section {
  name: string;
  label: string;
  group: string;
  kind: "file" | "collection";
  path: string;
  format: "yaml" | "yaml-frontmatter";
  fields: Field[];
  primary: string;
  /** "profile" and "press" have their own rules; others need this permission. */
  access: Permission | "profile" | "press";
}

type Raw = Record<string, unknown>;

function toField(f: Raw): Field {
  return {
    name: String(f.name),
    label: String(f.label ?? f.name),
    type: String(f.type ?? "string"),
    required: f.required === true,
    readonly: f.readonly === true,
    list: (f.list as Field["list"]) ?? false,
    fields: Array.isArray(f.fields) ? (f.fields as Raw[]).map(toField) : undefined,
    default: f.default,
    options: (f.options as Field["options"]) ?? undefined,
  };
}

function accessFor(name: string): Section["access"] {
  if (name === "people") return "profile";
  if (name === "press") return "press";
  if (name === "settings") return "settings.edit";
  return "pages.edit";
}

export function parseSchema(pagesYml: string): Section[] {
  const doc = YAML.parse(pagesYml) as { content?: Raw[] };
  const out: Section[] = [];
  const add = (c: Raw, group: string) => {
    if (c.type === "group") {
      for (const item of (c.items as Raw[]) ?? []) add(item, String(c.label ?? c.name));
      return;
    }
    if (c.type !== "file" && c.type !== "collection") return;
    const view = (c.view ?? {}) as Raw;
    const fields = ((c.fields as Raw[]) ?? []).map(toField);
    out.push({
      name: String(c.name),
      label: String(c.label ?? c.name),
      group,
      kind: c.type,
      path: String(c.path).replace(/\/+$/, ""),
      format: c.format === "yaml" ? "yaml" : "yaml-frontmatter",
      fields,
      primary: String(view.primary ?? fields[0]?.name ?? "title"),
      access: accessFor(String(c.name)),
    });
  };
  for (const c of doc.content ?? []) add(c, "");
  return out;
}

// ─── Reading and writing files ─────────────────────────────────────────────

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFile(section: Section, text: string): Raw {
  if (section.format === "yaml") return (YAML.parse(text) as Raw) ?? {};
  const m = FRONTMATTER.exec(text);
  if (!m) return { body: text.trim() };
  const data = (YAML.parse(m[1]) as Raw) ?? {};
  for (const [k, v] of Object.entries(data)) if (v instanceof Date) data[k] = v.toISOString().slice(0, 10);
  return { ...data, body: m[2].replace(/^\s*\n/, "").replace(/\s+$/, "") };
}

export function serializeFile(section: Section, values: Raw): string {
  const order = section.fields.map((f) => f.name);
  const keys = [...order.filter((k) => k in values), ...Object.keys(values).filter((k) => !order.includes(k))];
  const data: Raw = {};
  for (const k of keys) {
    if (section.format === "yaml-frontmatter" && k === "body") continue;
    if (values[k] !== undefined) data[k] = values[k];
  }
  const yaml = YAML.stringify(data, { lineWidth: 0 });
  if (section.format === "yaml") return yaml;
  const body = typeof values.body === "string" ? values.body.trim() : "";
  return `---\n${yaml}---\n${body ? `\n${body}\n` : ""}`;
}

// ─── Checking values ───────────────────────────────────────────────────────

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UPLOAD = /^\/images\/[A-Za-z0-9/_. -]+\.(?:jpe?g|png|webp|gif|pdf)$/i;

export class ValidationError extends Error {}

function optionNames(f: Field): string[] {
  return (f.options?.values ?? []).map((v) => (typeof v === "string" ? v : v.name));
}

function single(f: Field, v: unknown, where: string): unknown {
  const label = `${where}${f.label}`;
  switch (f.type) {
    case "boolean":
      return v === true || v === "true";
    case "number": {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = Number(v);
      if (!Number.isFinite(n)) throw new ValidationError(`${label}: enter a number.`);
      return n;
    }
    case "date": {
      const s = typeof v === "string" ? v.trim() : "";
      if (s && !DATE.test(s)) throw new ValidationError(`${label}: use a date like 2026-10-31.`);
      return s;
    }
    case "select": {
      const s = typeof v === "string" ? v : "";
      if (s && !optionNames(f).includes(s)) throw new ValidationError(`${label}: choose one of the options.`);
      return s;
    }
    case "image":
    case "file": {
      const s = typeof v === "string" ? v.trim() : "";
      if (s && (!UPLOAD.test(s) || s.includes(".."))) throw new ValidationError(`${label}: upload the file again.`);
      return s;
    }
    case "reference": {
      if (f.options?.multiple) {
        const list = Array.isArray(v) ? v : [];
        if (list.length > 100 || list.some((x) => typeof x !== "string" || !SLUG.test(x))) throw new ValidationError(`${label}: choose from the list.`);
        return [...new Set(list as string[])];
      }
      const s = typeof v === "string" ? v : "";
      if (s && !SLUG.test(s)) throw new ValidationError(`${label}: choose from the list.`);
      return s;
    }
    case "object": {
      const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {};
      return normalizeFields(f.fields ?? [], o, {}, `${label} › `);
    }
    case "text":
    case "rich-text": {
      const s = typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(/\s+$/, "") : "";
      if (s.length > 50_000) throw new ValidationError(`${label}: too long.`);
      return s;
    }
    default: {
      const s = typeof v === "string" ? v.replace(/[\r\n]+/g, " ").trim() : typeof v === "number" ? String(v) : "";
      if (s.length > 2_000) throw new ValidationError(`${label}: too long.`);
      return s;
    }
  }
}

function isEmpty(v: unknown) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

function normalize(f: Field, v: unknown, where: string): unknown {
  if (f.list) {
    const list = Array.isArray(v) ? v : [];
    if (list.length > 300) throw new ValidationError(`${where}${f.label}: too many entries.`);
    const items = list.map((x, i) => single({ ...f, label: `${f.label} ${i + 1}` }, x, where));
    return f.type === "object" ? items : items.filter((x) => !isEmpty(x));
  }
  return single(f, v, where);
}

/**
 * Cleans submitted values against the schema. Read-only fields, and fields
 * the schema doesn't know, keep the values they already had.
 */
export function normalizeFields(fields: Field[], submitted: Raw, existing: Raw, where = ""): Raw {
  const out: Raw = { ...existing };
  for (const f of fields) {
    if (f.readonly && f.name in existing) continue;
    const v = normalize(f, submitted[f.name], where);
    if (f.required && isEmpty(v)) throw new ValidationError(`${where}${f.label} is required.`);
    if (v === undefined) delete out[f.name];
    else out[f.name] = v;
  }
  return out;
}

/** Extra checks for particular fields, matching the rules the site build applies. */
export function checkSpecialFields(section: Section, values: Raw) {
  if (section.kind === "collection" && (typeof values.slug !== "string" || !SLUG.test(values.slug))) {
    throw new ValidationError("Web address: use lowercase letters, numbers and hyphens only (e.g. jane-doe).");
  }
  if (section.name === "settings") {
    for (const k of ["colorPrimary", "colorAccent"]) {
      if (!/^#[0-9a-fA-F]{6}$/.test(String(values[k] ?? ""))) throw new ValidationError("Colours must look like #15233b.");
    }
    const link = String(values.emailLink ?? "");
    if (link && !/^https:\/\/[^\s"<>]+$/i.test(link)) throw new ValidationError("Email links go to: use a web address starting with https://");
  }
  if (section.name === "press" && values.releaseTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(values.releaseTime))) {
    throw new ValidationError("Release time: use 24-hour time like 09:00.");
  }
}

/** The names of the fields whose values differ. */
export function changedFields(before: Raw, after: Raw): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null));
}

/** Default values for a new entry. */
export function defaults(fields: Field[]): Raw {
  const out: Raw = {};
  for (const f of fields) {
    if (f.default !== undefined) out[f.name] = f.default;
    else if (f.list) out[f.name] = [];
    else if (f.type === "boolean") out[f.name] = false;
    else if (f.type === "object") out[f.name] = defaults(f.fields ?? []);
    else if (f.type === "reference" && f.options?.multiple) out[f.name] = [];
    else if (f.type !== "number") out[f.name] = "";
  }
  return out;
}
