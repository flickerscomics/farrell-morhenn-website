import type { MatterStatus, Prisma, Priority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasPermission, WILDCARD } from "@/lib/permissions";
import { audit, staffActor } from "../audit";
import { nextMatterReference } from "../references";

export type Actor = { id: string; name: string; permissions: string[] };

/**
 * Row-level access rule for matters.
 *  - matters.view_all: every matter except restricted ones they are not on.
 *  - matters.view_assigned: only matters they lead or support.
 *  - The super administrator wildcard sees everything.
 * Restricted matters ("ethical wall") are visible only to their own team.
 */
export function matterAccessWhere(actor: Actor): Prisma.MatterWhereInput {
  if (actor.permissions.includes(WILDCARD)) return {};
  const onTeam: Prisma.MatterWhereInput = {
    OR: [{ leadAttorneyId: actor.id }, { members: { some: { userId: actor.id } } }],
  };
  if (hasPermission(actor.permissions, "matters.view_all")) {
    return { OR: [{ isRestricted: false }, onTeam] };
  }
  if (hasPermission(actor.permissions, "matters.view_assigned")) return onTeam;
  return { id: "__no_access__" };
}

export async function findAccessibleMatter(actor: Actor, id: string) {
  return prisma.matter.findFirst({ where: { AND: [{ id }, matterAccessWhere(actor)] } });
}

export const CLOSED_MATTER_STATUSES: MatterStatus[] = ["CONCLUDED", "ARCHIVED"];

export type MatterInput = {
  title: string;
  clientName: string;
  clientContact: string;
  practiceAreaId: string | null;
  leadAttorneyId: string | null;
  description: string;
  status: MatterStatus;
  priority: Priority;
  isRestricted: boolean;
  followUpAt: Date | null;
  memberIds: string[];
};

export async function createMatter(actor: Actor, input: MatterInput, enquiryId?: string) {
  return prisma.$transaction(async (tx) => {
    const reference = await nextMatterReference(tx);
    const matter = await tx.matter.create({
      data: {
        reference,
        title: input.title,
        clientName: input.clientName,
        clientContact: input.clientContact,
        practiceAreaId: input.practiceAreaId,
        leadAttorneyId: input.leadAttorneyId,
        description: input.description,
        status: input.status,
        priority: input.priority,
        isRestricted: input.isRestricted,
        followUpAt: input.followUpAt,
        members: {
          create: [...new Set(input.memberIds)]
            .filter((id) => id !== input.leadAttorneyId)
            .map((userId) => ({ userId })),
        },
      },
    });

    if (enquiryId) {
      const enquiry = await tx.enquiry.findUniqueOrThrow({ where: { id: enquiryId } });
      if (enquiry.matterId) throw new Error("This enquiry has already been converted into a matter.");
      await tx.enquiry.update({
        where: { id: enquiryId },
        data: { matterId: matter.id, status: "ACCEPTED" },
      });
      await tx.appointment.updateMany({ where: { enquiryId, matterId: null }, data: { matterId: matter.id } });
      if (enquiry.clientAccountId) {
        await tx.matter.update({ where: { id: matter.id }, data: { clientAccountId: enquiry.clientAccountId } });
      }
      await tx.matterEvent.create({
        data: {
          matterId: matter.id,
          type: "MILESTONE",
          title: "Matter opened",
          body: `Opened from enquiry ${enquiry.reference}.`,
          occursAt: new Date(),
          authorId: actor.id,
        },
      });
      await audit(
        staffActor(actor),
        {
          action: "enquiry.converted",
          entityType: "Enquiry",
          entityId: enquiryId,
          summary: `Converted into matter ${reference}`,
          metadata: { matterId: matter.id },
        },
        tx,
      );
    } else {
      await tx.matterEvent.create({
        data: { matterId: matter.id, type: "MILESTONE", title: "Matter opened", occursAt: new Date(), authorId: actor.id },
      });
    }

    await audit(
      staffActor(actor),
      {
        action: "matter.created",
        entityType: "Matter",
        entityId: matter.id,
        summary: `Opened matter ${reference}: ${input.title}`,
      },
      tx,
    );
    return matter;
  });
}

export async function updateMatter(actor: Actor, id: string, input: MatterInput) {
  const before = await findAccessibleMatter(actor, id);
  if (!before) throw new Error("Matter not found.");
  return prisma.$transaction(async (tx) => {
    const closing = CLOSED_MATTER_STATUSES.includes(input.status);
    const matter = await tx.matter.update({
      where: { id },
      data: {
        title: input.title,
        clientName: input.clientName,
        clientContact: input.clientContact,
        practiceAreaId: input.practiceAreaId,
        leadAttorneyId: input.leadAttorneyId,
        description: input.description,
        status: input.status,
        priority: input.priority,
        isRestricted: input.isRestricted,
        followUpAt: input.followUpAt,
        closedAt: closing ? (before.closedAt ?? new Date()) : null,
      },
    });
    await tx.matterMember.deleteMany({ where: { matterId: id } });
    const members = [...new Set(input.memberIds)].filter((m) => m !== input.leadAttorneyId);
    if (members.length) {
      await tx.matterMember.createMany({ data: members.map((userId) => ({ matterId: id, userId })) });
    }
    const changes: string[] = [];
    if (before.status !== input.status) changes.push(`status ${before.status} → ${input.status}`);
    if (before.priority !== input.priority) changes.push(`priority ${before.priority} → ${input.priority}`);
    if (before.leadAttorneyId !== input.leadAttorneyId) changes.push("lead attorney changed");
    if (before.isRestricted !== input.isRestricted) changes.push(input.isRestricted ? "restricted" : "unrestricted");
    await audit(
      staffActor(actor),
      {
        action: "matter.updated",
        entityType: "Matter",
        entityId: id,
        summary: `Updated matter ${matter.reference}${changes.length ? `: ${changes.join(", ")}` : ""}`,
      },
      tx,
    );
    if (before.status !== input.status) {
      await tx.matterEvent.create({
        data: {
          matterId: id,
          type: "UPDATE",
          title: `Status changed to ${input.status.replace(/_/g, " ").toLowerCase()}`,
          occursAt: new Date(),
          authorId: actor.id,
        },
      });
    }
    return matter;
  });
}
