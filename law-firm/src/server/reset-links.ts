import "server-only";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { randomToken, sha256 } from "./security";

const VALID_HOURS = 72;

/** Issues a one-time password link, revoking earlier unused links. */
export async function issueResetLink(target: { userId?: string; clientAccountId?: string }) {
  const token = randomToken(32);
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { ...target, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { ...target, tokenHash: sha256(token), expiresAt: new Date(Date.now() + VALID_HOURS * 3600_000) },
    }),
  ]);
  const path = target.userId ? "/admin/reset-password/" : "/portal/reset-password/";
  return { url: `${env.siteUrl}${path}${token}`, hours: VALID_HOURS };
}
