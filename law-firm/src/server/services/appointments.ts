import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validateAppointmentTime, type SchedulingRules } from "@/lib/time";
import { audit, staffActor } from "../audit";
import type { Actor } from "./matters";

export type AppointmentAction = "confirm" | "decline" | "reschedule" | "cancel" | "complete" | "no_show";

const ACTIVE: AppointmentStatus[] = ["CONFIRMED", "RESCHEDULED"];

const TRANSITIONS: Record<AppointmentAction, { from: AppointmentStatus[]; to: AppointmentStatus }> = {
  confirm: { from: ["REQUESTED", "RESCHEDULED"], to: "CONFIRMED" },
  decline: { from: ["REQUESTED"], to: "DECLINED" },
  reschedule: { from: ["REQUESTED", "CONFIRMED", "RESCHEDULED"], to: "RESCHEDULED" },
  cancel: { from: ["REQUESTED", "CONFIRMED", "RESCHEDULED"], to: "CANCELLED" },
  complete: { from: ["CONFIRMED", "RESCHEDULED"], to: "COMPLETED" },
  no_show: { from: ["CONFIRMED", "RESCHEDULED"], to: "NO_SHOW" },
};

export function allowedActions(status: AppointmentStatus): AppointmentAction[] {
  return (Object.keys(TRANSITIONS) as AppointmentAction[]).filter((a) => TRANSITIONS[a].from.includes(status));
}

export class AppointmentError extends Error {}

/** Finds a confirmed booking for the same attorney that overlaps the slot. */
export async function findConflict(
  attorneyId: string | null,
  start: Date,
  durationMinutes: number,
  excludeId?: string,
) {
  if (!attorneyId) return null;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const candidates = await prisma.appointment.findMany({
    where: {
      attorneyId,
      status: { in: ACTIVE },
      id: excludeId ? { not: excludeId } : undefined,
      scheduledStart: { lt: end, gte: new Date(start.getTime() - 24 * 3600_000) },
    },
    select: { id: true, reference: true, scheduledStart: true, durationMinutes: true },
  });
  return (
    candidates.find(
      (c) => c.scheduledStart && c.scheduledStart.getTime() + c.durationMinutes * 60_000 > start.getTime(),
    ) ?? null
  );
}

export async function transitionAppointment(
  actor: Actor,
  id: string,
  action: AppointmentAction,
  opts: {
    scheduledStart?: Date | null;
    reason?: string;
    location?: string;
    rules: SchedulingRules;
    allowOutsideHours?: boolean;
  },
) {
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) throw new AppointmentError("Appointment not found.");
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(appt.status)) {
    throw new AppointmentError(`An appointment that is ${appt.status.toLowerCase()} cannot be updated that way.`);
  }

  let scheduledStart = appt.scheduledStart;
  if (action === "confirm" || action === "reschedule") {
    const start = opts.scheduledStart ?? (action === "confirm" ? (appt.scheduledStart ?? appt.requestedStart) : null);
    if (!start) throw new AppointmentError("Choose the new date and time.");
    if (!opts.allowOutsideHours) {
      const problem = validateAppointmentTime(start, { ...opts.rules, minNoticeHours: 0, durationMinutes: appt.durationMinutes });
      if (problem) throw new AppointmentError(problem);
    } else if (start.getTime() < Date.now()) {
      throw new AppointmentError("The scheduled time must be in the future.");
    }
    const conflict = await findConflict(appt.attorneyId, start, appt.durationMinutes, appt.id);
    if (conflict) {
      throw new AppointmentError(`That time overlaps ${conflict.reference} for the same attorney.`);
    }
    scheduledStart = start;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.update({
      where: { id },
      data: {
        status: rule.to,
        scheduledStart,
        statusReason: opts.reason?.slice(0, 500) ?? appt.statusReason,
        location: opts.location !== undefined ? opts.location.slice(0, 200) : appt.location,
        handledById: actor.id,
      },
    });
    await audit(
      staffActor(actor),
      {
        action: `appointment.${action}`,
        entityType: "Appointment",
        entityId: id,
        summary: `${appt.reference}: ${appt.status} → ${rule.to}${opts.reason ? ` (${opts.reason.slice(0, 120)})` : ""}`,
        metadata: { scheduledStart: scheduledStart?.toISOString() ?? null },
      },
      tx,
    );
    if (appt.matterId && (action === "confirm" || action === "reschedule") && scheduledStart) {
      await tx.matterEvent.create({
        data: {
          matterId: appt.matterId,
          type: "MEETING",
          title: `${appt.consultationType} ${action === "confirm" ? "confirmed" : "rescheduled"}`,
          body: `Appointment ${appt.reference}.`,
          occursAt: scheduledStart,
          authorId: actor.id,
          clientVisible: true,
        },
      });
    }
    return result;
  });
  return updated;
}
