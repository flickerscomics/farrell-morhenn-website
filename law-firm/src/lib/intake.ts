import { z } from "zod";
import { isValidDateString } from "./time";

// Practice-area-specific intake questions are configured per practice area in
// the admin area and stored as JSON. This module defines their shape and
// validates both the configuration and the answers submitted against it.

export const INTAKE_FIELD_TYPES = ["text", "textarea", "select", "date"] as const;
export type IntakeFieldType = (typeof INTAKE_FIELD_TYPES)[number];

export type IntakeField = {
  key: string;
  label: string;
  type: IntakeFieldType;
  required: boolean;
  options: string[];
  help: string;
};

export type IntakeAnswer = { key: string; label: string; value: string };

const fieldSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,39}$/, "Field keys use lowercase letters, numbers and underscores."),
  label: z.string().trim().min(2).max(120),
  type: z.enum(INTAKE_FIELD_TYPES),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(80)).max(20),
  help: z.string().trim().max(240),
});

export const intakeConfigSchema = z
  .array(fieldSchema)
  .max(12, "An intake form can have at most 12 questions.")
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    fields.forEach((f, i) => {
      if (seen.has(f.key)) ctx.addIssue({ code: "custom", message: `Duplicate field key "${f.key}".`, path: [i, "key"] });
      seen.add(f.key);
      if (f.type === "select" && f.options.length < 2) {
        ctx.addIssue({ code: "custom", message: `"${f.label}" needs at least two options.`, path: [i, "options"] });
      }
    });
  });

/** Reads stored JSON defensively; malformed configuration yields no fields. */
export function parseIntakeFields(value: unknown): IntakeField[] {
  const result = intakeConfigSchema.safeParse(value);
  return result.success ? result.data : [];
}

export const INTAKE_PREFIX = "intake_";

export function maxLengthFor(type: IntakeFieldType) {
  return type === "textarea" ? 2000 : 200;
}

/**
 * Validates submitted answers for the given intake fields. `values` maps
 * field keys to raw strings. Returns either the answers (with labels
 * snapshotted so later configuration changes do not alter old records) or
 * a map of field errors keyed by `intake_<key>`.
 */
export function validateIntakeAnswers(
  fields: IntakeField[],
  values: Record<string, string | undefined>,
): { ok: true; answers: IntakeAnswer[] } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const answers: IntakeAnswer[] = [];
  for (const field of fields) {
    const raw = (values[field.key] ?? "").trim();
    const name = INTAKE_PREFIX + field.key;
    if (!raw) {
      if (field.required) errors[name] = `${field.label} is required.`;
      continue;
    }
    if (raw.length > maxLengthFor(field.type)) {
      errors[name] = `${field.label} must be ${maxLengthFor(field.type)} characters or fewer.`;
      continue;
    }
    if (field.type === "select" && !field.options.includes(raw)) {
      errors[name] = `Choose one of the listed options for ${field.label}.`;
      continue;
    }
    if (field.type === "date" && !isValidDateString(raw)) {
      errors[name] = `${field.label} must be a valid date.`;
      continue;
    }
    answers.push({ key: field.key, label: field.label, value: raw });
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}

export function parseIntakeAnswers(value: unknown): IntakeAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is IntakeAnswer =>
      !!a && typeof a === "object" && typeof a.label === "string" && typeof a.value === "string",
  );
}
