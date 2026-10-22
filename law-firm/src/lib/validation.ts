import { z } from "zod";
import { isValidDateString, isValidTimeString } from "./time";

// Schemas shared by client-side pre-validation and server-side enforcement.
// The server always re-validates; the client copy only improves feedback.

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(min, min <= 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .default("");

const optionalId = z
  .string()
  .trim()
  .max(40)
  .regex(/^[a-z0-9]*$/i, "Invalid selection.")
  .optional()
  .default("");

const optionalDate = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((v) => v === "" || isValidDateString(v), "Enter a valid date.");

const optionalTime = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((v) => v === "" || isValidTimeString(v), "Enter a valid time.");

const acknowledgement = z
  .string({ required_error: "Please confirm you have read the notice." })
  .refine((v) => v === "on" || v === "true" || v === "yes", "Please confirm you have read the notice.");

export const characterNameSchema = trimmed(2, 80, "Character name").regex(
  /^[\p{L}\p{M}' .\-]+$/u,
  "Character names may contain letters, spaces, apostrophes, periods and hyphens.",
);

export const enquirySchema = z.object({
  characterName: characterNameSchema,
  contactDetails: optionalText(200, "Contact details"),
  preferredContact: optionalText(60, "Preferred contact method"),
  practiceAreaId: optionalId,
  subject: trimmed(3, 140, "Subject"),
  description: trimmed(20, 5000, "Description"),
  preferredAttorneyId: optionalId,
  preferredDate: optionalDate,
  preferredTime: optionalTime,
  acknowledge: acknowledgement,
});
export type EnquiryInput = z.infer<typeof enquirySchema>;

export const appointmentSchema = z.object({
  characterName: characterNameSchema,
  contactDetails: optionalText(200, "Contact details"),
  preferredContact: optionalText(60, "Preferred contact method"),
  attorneyId: optionalId,
  consultationType: trimmed(1, 80, "Consultation type"),
  requestedDate: z.string().trim().refine(isValidDateString, "Choose a requested date."),
  requestedTime: z.string().trim().refine(isValidTimeString, "Choose a requested time."),
  alternativeDate: optionalDate,
  alternativeTime: optionalTime,
  reason: trimmed(10, 2000, "Reason for the appointment"),
  notes: optionalText(2000, "Additional notes"),
  acknowledge: acknowledgement,
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const applicationSchema = z.object({
  vacancyId: optionalId,
  desiredRole: trimmed(2, 120, "Desired role"),
  characterName: characterNameSchema,
  contactDetails: trimmed(3, 200, "Contact details"),
  preferredContact: optionalText(60, "Preferred contact method"),
  experience: trimmed(20, 4000, "Relevant experience"),
  availability: trimmed(3, 500, "Availability"),
  statement: trimmed(50, 6000, "Application statement"),
  acknowledge: acknowledgement,
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const passwordSchema = z
  .string()
  .min(12, "Passwords must be at least 12 characters.")
  .max(200, "Passwords must be 200 characters or fewer.")
  .refine((v) => /[a-zA-Z]/.test(v) && /[^a-zA-Z]/.test(v), "Use a mix of letters and numbers or symbols.");

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);

export const clientRegistrationSchema = z
  .object({
    characterName: characterNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acknowledge: acknowledgement,
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** Converts FormData into a plain object of strings (files are skipped). */
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type FormState = {
  ok: boolean;
  message?: string;
  errors?: FieldErrors;
  reference?: string;
  redirectTo?: string;
  values?: Record<string, string>;
  /** Replacement anti-spam token when the original one expired. */
  token?: string;
};

export const initialFormState: FormState = { ok: false };

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug is required.")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slugs use lowercase letters, numbers and single hyphens.");

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour such as #15233b.");

/** Splits a textarea into trimmed, non-empty lines. */
export function lines(value: string | undefined | null, max = 40): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** Accepts only same-site relative links or http(s) URLs. */
export function isSafeHref(href: string) {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
