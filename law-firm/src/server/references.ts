import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";

// Public-facing references (enquiries, appointments, applications) are random
// so they cannot be enumerated. Matter references are sequential per year
// because staff cite them in correspondence; they are never shown publicly.

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I

export function randomReference(prefix: string, now = new Date()) {
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${now.getUTCFullYear()}-${code}`;
}

export const REFERENCE_PATTERN = /^[A-Z]{3}-\d{4}-[2-9A-HJ-NP-Z]{6}$/;

export async function nextMatterReference(tx: Prisma.TransactionClient, now = new Date()) {
  const year = now.getUTCFullYear();
  const counter = await tx.referenceCounter.upsert({
    where: { key: `matter-${year}` },
    create: { key: `matter-${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `CW-${year}-${String(counter.value).padStart(4, "0")}`;
}
