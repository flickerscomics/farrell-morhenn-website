import "server-only";
import { prisma } from "@/lib/db";

export async function userFormOptions() {
  const [roles, profiles] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.staffProfile.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, title: true } }),
  ]);
  return {
    roles: roles.map((r) => ({ value: r.id, label: r.name })),
    profiles: profiles.map((p) => ({ value: p.id, label: `${p.fullName} — ${p.title}` })),
  };
}
