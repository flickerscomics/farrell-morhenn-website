import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseIntakeFields, validateIntakeAnswers, type IntakeAnswer } from "@/lib/intake";
import { validateAppointmentTime, zonedTimeToUtc, type SchedulingRules } from "@/lib/time";
import type { AppointmentInput, ApplicationInput, EnquiryInput, FieldErrors } from "@/lib/validation";
import { audit } from "../audit";
import { randomReference } from "../references";
import { contentFingerprint } from "../security";
import { persistFile, type PreparedFile } from "../uploads";

// Business logic for public submissions. Kept free of request APIs so it can
// be exercised directly by the integration tests.

export type SubmissionContext = {
  idempotencyKey: string;
  ipHash: string;
  clientAccountId?: string | null;
  attachment?: PreparedFile | null;
  now?: Date;
};

export type SubmissionResult =
  | { ok: true; reference: string; duplicate: boolean }
  | { ok: false; errors?: FieldErrors; message: string };

const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

function isUniqueViolation(error: unknown, field?: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  if (!field) return true;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? "").includes(field);
}

/** Retries creation when a random reference collides with an existing one. */
async function withReference<T>(prefix: string, create: (reference: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await create(randomReference(prefix));
    } catch (error) {
      if (attempt < 4 && isUniqueViolation(error, "reference")) continue;
      throw error;
    }
  }
}

function validContactMethod(method: string, allowed: string[]) {
  return method === "" || allowed.includes(method);
}

// ─── Enquiries ──────────────────────────────────────────────────────────────

export async function submitEnquiry(
  input: EnquiryInput,
  intakeValues: Record<string, string>,
  ctx: SubmissionContext,
): Promise<SubmissionResult> {
  const settings = await prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  if (!settings.acceptingEnquiries) {
    return { ok: false, message: "The firm is not accepting online enquiries at the moment. Please contact the office directly." };
  }

  const existing = await prisma.enquiry.findUnique({
    where: { idempotencyKey: ctx.idempotencyKey },
    select: { reference: true },
  });
  if (existing) return { ok: true, reference: existing.reference, duplicate: true };

  const errors: FieldErrors = {};
  if (!validContactMethod(input.preferredContact, settings.contactMethods)) {
    errors.preferredContact = "Choose one of the listed contact methods.";
  }

  let answers: IntakeAnswer[] = [];
  let practiceAreaId: string | null = null;
  if (input.practiceAreaId) {
    const area = await prisma.practiceArea.findFirst({
      where: { id: input.practiceAreaId, isPublished: true },
      select: { id: true, intakeFields: true },
    });
    if (!area) {
      errors.practiceAreaId = "Choose a practice area from the list.";
    } else {
      practiceAreaId = area.id;
      const result = validateIntakeAnswers(parseIntakeFields(area.intakeFields), intakeValues);
      if (result.ok) answers = result.answers;
      else Object.assign(errors, result.errors);
    }
  }

  let preferredAttorneyId: string | null = null;
  if (input.preferredAttorneyId) {
    const attorney = await prisma.staffProfile.findFirst({
      where: { id: input.preferredAttorneyId, isPublished: true, status: "ACTIVE", acceptsConsultations: true },
      select: { id: true },
    });
    if (!attorney) errors.preferredAttorneyId = "That attorney is not currently taking enquiries.";
    else preferredAttorneyId = attorney.id;
  }

  if (Object.keys(errors).length) {
    return { ok: false, errors, message: "Please correct the highlighted fields." };
  }

  const contentHash = contentFingerprint([input.characterName, input.subject, input.description]);
  const now = ctx.now ?? new Date();
  const recent = await prisma.enquiry.findFirst({
    where: { contentHash, createdAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) } },
    select: { reference: true },
  });
  if (recent) return { ok: true, reference: recent.reference, duplicate: true };

  try {
    const enquiry = await withReference("ENQ", (reference) =>
      prisma.$transaction(async (tx) => {
        const created = await tx.enquiry.create({
          data: {
            reference,
            characterName: input.characterName,
            contactDetails: input.contactDetails,
            preferredContact: input.preferredContact,
            practiceAreaId,
            subject: input.subject,
            description: input.description,
            preferredAttorneyId,
            preferredDate: input.preferredDate,
            preferredTime: input.preferredTime,
            intakeData: answers,
            assignedToId: settings.defaultAssigneeId,
            clientAccountId: ctx.clientAccountId ?? null,
            idempotencyKey: ctx.idempotencyKey,
            contentHash,
            sourceIpHash: ctx.ipHash,
          },
        });
        if (ctx.attachment) {
          await persistFile(
            ctx.attachment,
            { visibility: "PRIVATE", purpose: "ENQUIRY_ATTACHMENT", enquiryId: created.id, uploadedByClientId: ctx.clientAccountId },
            tx,
          );
        }
        await audit(
          { type: "PUBLIC", label: input.characterName },
          {
            action: "enquiry.submitted",
            entityType: "Enquiry",
            entityId: created.id,
            summary: `Enquiry ${reference} submitted: ${input.subject}`,
          },
          tx,
        );
        return created;
      }),
    );
    return { ok: true, reference: enquiry.reference, duplicate: false };
  } catch (error) {
    if (isUniqueViolation(error, "idempotencyKey")) {
      const again = await prisma.enquiry.findUnique({ where: { idempotencyKey: ctx.idempotencyKey } });
      if (again) return { ok: true, reference: again.reference, duplicate: true };
    }
    throw error;
  }
}

// ─── Consultation requests ──────────────────────────────────────────────────

export async function submitAppointment(
  input: AppointmentInput,
  rules: SchedulingRules,
  ctx: SubmissionContext,
): Promise<SubmissionResult> {
  const settings = await prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  if (!settings.acceptingBookings) {
    return { ok: false, message: "Online consultation requests are paused. Please contact the office to arrange a meeting." };
  }

  const existing = await prisma.appointment.findUnique({
    where: { idempotencyKey: ctx.idempotencyKey },
    select: { reference: true },
  });
  if (existing) return { ok: true, reference: existing.reference, duplicate: true };

  const errors: FieldErrors = {};
  const now = ctx.now ?? new Date();

  if (!settings.consultationTypes.includes(input.consultationType)) {
    errors.consultationType = "Choose one of the listed consultation types.";
  }
  if (!validContactMethod(input.preferredContact, settings.contactMethods)) {
    errors.preferredContact = "Choose one of the listed contact methods.";
  }

  const start = zonedTimeToUtc(input.requestedDate, input.requestedTime, rules.timezone);
  if (!start) errors.requestedTime = "That date and time is not valid in the office timezone.";
  else {
    const problem = validateAppointmentTime(start, rules, now);
    if (problem) errors.requestedTime = problem;
  }

  let alternative: Date | null = null;
  if (input.alternativeDate || input.alternativeTime) {
    if (!input.alternativeDate || !input.alternativeTime) {
      errors.alternativeTime = "Provide both a date and a time for the alternative, or leave both empty.";
    } else {
      alternative = zonedTimeToUtc(input.alternativeDate, input.alternativeTime, rules.timezone);
      if (!alternative) errors.alternativeTime = "That alternative time is not valid in the office timezone.";
      else {
        const problem = validateAppointmentTime(alternative, rules, now);
        if (problem) errors.alternativeTime = problem;
        else if (start && alternative.getTime() === start.getTime()) {
          errors.alternativeTime = "The alternative should differ from the requested time.";
        }
      }
    }
  }

  let attorneyId: string | null = null;
  if (input.attorneyId) {
    const attorney = await prisma.staffProfile.findFirst({
      where: { id: input.attorneyId, isPublished: true, status: "ACTIVE", acceptsConsultations: true },
      select: { id: true },
    });
    if (!attorney) errors.attorneyId = "That attorney is not currently accepting consultations.";
    else attorneyId = attorney.id;
  }

  if (Object.keys(errors).length || !start) {
    return { ok: false, errors, message: "Please correct the highlighted fields." };
  }

  const contentHash = contentFingerprint([input.characterName, start.toISOString(), input.reason]);
  const recent = await prisma.appointment.findFirst({
    where: { contentHash, createdAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) } },
    select: { reference: true },
  });
  if (recent) return { ok: true, reference: recent.reference, duplicate: true };

  try {
    const appointment = await withReference("APT", (reference) =>
      prisma.$transaction(async (tx) => {
        const created = await tx.appointment.create({
          data: {
            reference,
            characterName: input.characterName,
            contactDetails: input.contactDetails,
            preferredContact: input.preferredContact,
            attorneyId,
            consultationType: input.consultationType,
            requestedStart: start,
            alternativeStart: alternative,
            durationMinutes: rules.durationMinutes,
            reason: input.reason,
            notes: input.notes,
            clientAccountId: ctx.clientAccountId ?? null,
            idempotencyKey: ctx.idempotencyKey,
            contentHash,
            sourceIpHash: ctx.ipHash,
          },
        });
        await audit(
          { type: "PUBLIC", label: input.characterName },
          {
            action: "appointment.requested",
            entityType: "Appointment",
            entityId: created.id,
            summary: `Consultation ${reference} requested (${input.consultationType})`,
          },
          tx,
        );
        return created;
      }),
    );
    return { ok: true, reference: appointment.reference, duplicate: false };
  } catch (error) {
    if (isUniqueViolation(error, "idempotencyKey")) {
      const again = await prisma.appointment.findUnique({ where: { idempotencyKey: ctx.idempotencyKey } });
      if (again) return { ok: true, reference: again.reference, duplicate: true };
    }
    throw error;
  }
}

// ─── Recruitment applications ───────────────────────────────────────────────

export async function submitApplication(input: ApplicationInput, ctx: SubmissionContext): Promise<SubmissionResult> {
  const existing = await prisma.application.findUnique({
    where: { idempotencyKey: ctx.idempotencyKey },
    select: { reference: true },
  });
  if (existing) return { ok: true, reference: existing.reference, duplicate: true };

  const settings = await prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  const errors: FieldErrors = {};
  if (!validContactMethod(input.preferredContact, settings.contactMethods)) {
    errors.preferredContact = "Choose one of the listed contact methods.";
  }

  let vacancyId: string | null = null;
  if (input.vacancyId) {
    const vacancy = await prisma.vacancy.findFirst({
      where: { id: input.vacancyId, status: "OPEN" },
      select: { id: true, closesAt: true },
    });
    const now = ctx.now ?? new Date();
    if (!vacancy || (vacancy.closesAt && vacancy.closesAt < now)) {
      errors.vacancyId = "This vacancy is no longer accepting applications.";
    } else vacancyId = vacancy.id;
  }
  if (Object.keys(errors).length) return { ok: false, errors, message: "Please correct the highlighted fields." };

  const contentHash = contentFingerprint([input.characterName, input.desiredRole, input.statement]);
  const now = ctx.now ?? new Date();
  const recent = await prisma.application.findFirst({
    where: { contentHash, createdAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) } },
    select: { reference: true },
  });
  if (recent) return { ok: true, reference: recent.reference, duplicate: true };

  try {
    const application = await withReference("APP", (reference) =>
      prisma.$transaction(async (tx) => {
        const created = await tx.application.create({
          data: {
            reference,
            vacancyId,
            desiredRole: input.desiredRole,
            characterName: input.characterName,
            contactDetails: input.contactDetails,
            preferredContact: input.preferredContact,
            experience: input.experience,
            availability: input.availability,
            statement: input.statement,
            idempotencyKey: ctx.idempotencyKey,
            contentHash,
            sourceIpHash: ctx.ipHash,
          },
        });
        if (ctx.attachment) {
          await persistFile(
            ctx.attachment,
            { visibility: "PRIVATE", purpose: "APPLICATION_ATTACHMENT", applicationId: created.id },
            tx,
          );
        }
        await audit(
          { type: "PUBLIC", label: input.characterName },
          {
            action: "application.submitted",
            entityType: "Application",
            entityId: created.id,
            summary: `Application ${reference} received for ${input.desiredRole}`,
          },
          tx,
        );
        return created;
      }),
    );
    return { ok: true, reference: application.reference, duplicate: false };
  } catch (error) {
    if (isUniqueViolation(error, "idempotencyKey")) {
      const again = await prisma.application.findUnique({ where: { idempotencyKey: ctx.idempotencyKey } });
      if (again) return { ok: true, reference: again.reference, duplicate: true };
    }
    throw error;
  }
}
