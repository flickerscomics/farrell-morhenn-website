import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ClientAccount, Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hasPermission, type Permission } from "@/lib/permissions";
import { randomToken, sha256, userAgent } from "./security";

export const STAFF_COOKIE = "cw_staff";
export const CLIENT_COOKIE = "cw_client";

const STAFF_SESSION_HOURS = 12;
const CLIENT_SESSION_HOURS = 24 * 7;

export type StaffActor = User & { role: Role; permissions: string[] };

async function setSessionCookie(name: string, token: string, expires: Date) {
  (await cookies()).set(name, token, {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function createStaffSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + STAFF_SESSION_HOURS * 3600_000);
  await prisma.session.create({
    data: { tokenHash: sha256(token), kind: "STAFF", userId, expiresAt, userAgent: await userAgent() },
  });
  await setSessionCookie(STAFF_COOKIE, token, expiresAt);
}

export async function createClientSession(clientAccountId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + CLIENT_SESSION_HOURS * 3600_000);
  await prisma.session.create({
    data: { tokenHash: sha256(token), kind: "CLIENT", clientAccountId, expiresAt, userAgent: await userAgent() },
  });
  await setSessionCookie(CLIENT_COOKIE, token, expiresAt);
}

async function destroySession(cookieName: string) {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(cookieName);
}

export const destroyStaffSession = () => destroySession(STAFF_COOKIE);
export const destroyClientSession = () => destroySession(CLIENT_COOKIE);

/** Resolves the signed-in staff member for this request, or null. */
export const getStaff = cache(async (): Promise<StaffActor | null> => {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: true } } },
  });
  if (!session || session.kind !== "STAFF" || !session.user) return null;
  if (session.expiresAt < new Date() || !session.user.isActive) return null;
  return { ...session.user, permissions: session.user.role.permissions };
});

/** Resolves the signed-in portal client for this request, or null. */
export const getClient = cache(async (): Promise<ClientAccount | null> => {
  const token = (await cookies()).get(CLIENT_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { clientAccount: true },
  });
  if (!session || session.kind !== "CLIENT" || !session.clientAccount) return null;
  if (session.expiresAt < new Date() || !session.clientAccount.isActive) return null;
  return session.clientAccount;
});

export async function requireStaff(): Promise<StaffActor> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

/**
 * Server-side authorisation gate. Use at the top of every protected page and
 * every server action; hiding links in the UI is never relied on.
 */
export async function requirePermission(...anyOf: Permission[]): Promise<StaffActor> {
  const staff = await requireStaff();
  if (!anyOf.some((p) => hasPermission(staff.permissions, p))) redirect("/admin/forbidden");
  return staff;
}

export function can(staff: Pick<StaffActor, "permissions"> | null | undefined, permission: Permission) {
  return !!staff && hasPermission(staff.permissions, permission);
}

export async function requireClient(): Promise<ClientAccount> {
  const client = await getClient();
  if (!client) redirect("/portal/login");
  return client;
}

export async function revokeSessionsForUser(userId: string, exceptToken?: string) {
  await prisma.session.deleteMany({
    where: { userId, ...(exceptToken ? { NOT: { tokenHash: sha256(exceptToken) } } : {}) },
  });
}

export async function currentStaffToken() {
  return (await cookies()).get(STAFF_COOKIE)?.value;
}

/** Like requirePermission, but every listed permission is required. */
export async function requireAllPermissions(...all: Permission[]): Promise<StaffActor> {
  const staff = await requireStaff();
  if (!all.every((p) => hasPermission(staff.permissions, p))) redirect("/admin/forbidden");
  return staff;
}
