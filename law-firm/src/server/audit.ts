import type { ActorType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient | typeof prisma;

export type AuditActor =
  | { type: "STAFF"; id: string; label: string }
  | { type: "CLIENT"; id: string; label: string }
  | { type: "PUBLIC"; label: string }
  | { type: "SYSTEM"; label: string };

export function staffActor(user: { id: string; name: string }): AuditActor {
  return { type: "STAFF", id: user.id, label: user.name };
}

export async function audit(
  actor: AuditActor,
  event: {
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  },
  tx: Tx = prisma,
) {
  await tx.auditEvent.create({
    data: {
      actorType: actor.type as ActorType,
      actorId: actor.type === "STAFF" ? actor.id : null,
      actorLabel: actor.label,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      summary: event.summary.slice(0, 500),
      metadata: event.metadata ?? {},
    },
  });
}

export function activityFor(entityType: string, entityId: string, take = 50) {
  return prisma.auditEvent.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
