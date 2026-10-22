"use server";

import { redirect } from "next/navigation";
import { INTAKE_PREFIX } from "@/lib/intake";
import {
  applicationSchema,
  appointmentSchema,
  enquirySchema,
  formDataToObject,
  zodFieldErrors,
  type FormState,
} from "@/lib/validation";
import { getClient } from "@/server/auth";
import { checkRateLimit, hashedClientIp, issueFormToken, verifyFormToken } from "@/server/security";
import { getSettings, schedulingRules } from "@/server/settings";
import { submitApplication, submitAppointment, submitEnquiry, type SubmissionResult } from "@/server/services/submissions";
import { isRealFile, prepareFile, UploadError, type PreparedFile } from "@/server/uploads";

const ATTACHMENT_TYPES = ["application/pdf", "text/plain", "image/jpeg", "image/png", "image/webp"] as const;

type Guarded =
  | { ok: true; idempotencyKey: string; ipHash: string; values: Record<string, string> }
  | { ok: false; state: FormState };

/** Shared anti-abuse checks for every public form. */
async function guard(formData: FormData, form: string, limit: number): Promise<Guarded> {
  const values = formDataToObject(formData);
  delete values.formToken;
  delete values.website;
  if ((formData.get("website") as string | null)?.trim()) {
    return { ok: false, state: { ok: false, message: "Your submission could not be processed.", values } };
  }
  const token = verifyFormToken(formData.get("formToken") as string | undefined, form);
  if (!token.ok) {
    const message =
      token.reason === "too_fast"
        ? "That was quick! Please check your details and submit again."
        : "This form has expired. Please reload the page and try again — your answers are kept below.";
    const fresh = token.reason === "too_fast" ? undefined : issueFormToken(form);
    return { ok: false, state: { ok: false, message, values, token: fresh } };
  }
  const ipHash = await hashedClientIp();
  if (!(await checkRateLimit(`form:${form}`, ipHash, limit, 15 * 60 * 1000))) {
    return {
      ok: false,
      state: { ok: false, message: "Too many submissions from your connection. Please wait a few minutes and try again.", values },
    };
  }
  return { ok: true, idempotencyKey: token.idempotencyKey, ipHash, values };
}

async function readAttachment(formData: FormData): Promise<{ file: PreparedFile | null; error?: string }> {
  const file = formData.get("attachment");
  if (!isRealFile(file)) return { file: null };
  try {
    return { file: await prepareFile(file, ATTACHMENT_TYPES) };
  } catch (e) {
    if (e instanceof UploadError) return { file: null, error: `${e.message} Please choose the file again.` };
    throw e;
  }
}

function finish(result: SubmissionResult, type: string, values: Record<string, string>): FormState {
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors, values };
  redirect(`/confirmation?type=${type}&ref=${encodeURIComponent(result.reference)}${result.duplicate ? "&duplicate=1" : ""}`);
}

export async function submitEnquiryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard(formData, "enquiry", 6);
  if (!g.ok) return g.state;
  const parsed = enquirySchema.safeParse(g.values);
  const attachment = await readAttachment(formData);
  if (!parsed.success || attachment.error) {
    const errors = parsed.success ? {} : zodFieldErrors(parsed.error);
    if (attachment.error) errors.attachment = attachment.error;
    return { ok: false, message: "Please correct the highlighted fields.", errors, values: g.values };
  }
  const intakeValues: Record<string, string> = {};
  for (const [k, v] of Object.entries(g.values)) {
    if (k.startsWith(INTAKE_PREFIX)) intakeValues[k.slice(INTAKE_PREFIX.length)] = v;
  }
  const client = await getClient();
  const result = await submitEnquiry(parsed.data, intakeValues, {
    idempotencyKey: g.idempotencyKey,
    ipHash: g.ipHash,
    clientAccountId: client?.id,
    attachment: attachment.file,
  });
  return finish(result, "enquiry", g.values);
}

export async function submitAppointmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard(formData, "appointment", 6);
  if (!g.ok) return g.state;
  const parsed = appointmentSchema.safeParse(g.values);
  if (!parsed.success) {
    return { ok: false, message: "Please correct the highlighted fields.", errors: zodFieldErrors(parsed.error), values: g.values };
  }
  const settings = await getSettings();
  const client = await getClient();
  const result = await submitAppointment(parsed.data, schedulingRules(settings), {
    idempotencyKey: g.idempotencyKey,
    ipHash: g.ipHash,
    clientAccountId: client?.id,
  });
  return finish(result, "appointment", g.values);
}

export async function submitApplicationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard(formData, "application", 4);
  if (!g.ok) return g.state;
  const parsed = applicationSchema.safeParse(g.values);
  const attachment = await readAttachment(formData);
  if (!parsed.success || attachment.error) {
    const errors = parsed.success ? {} : zodFieldErrors(parsed.error);
    if (attachment.error) errors.attachment = attachment.error;
    return { ok: false, message: "Please correct the highlighted fields.", errors, values: g.values };
  }
  const result = await submitApplication(parsed.data, {
    idempotencyKey: g.idempotencyKey,
    ipHash: g.ipHash,
    attachment: attachment.file,
  });
  return finish(result, "application", g.values);
}

