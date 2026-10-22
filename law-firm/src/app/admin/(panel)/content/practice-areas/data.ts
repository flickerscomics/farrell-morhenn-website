import "server-only";
import { prisma } from "@/lib/db";

export async function peopleOptions() {
  const people = await prisma.staffProfile.findMany({ where: { status: { not: "DEPARTED" } }, orderBy: { sortOrder: "asc" }, select: { id: true, fullName: true, title: true } });
  return people.map((p) => ({ value: p.id, label: `${p.fullName} — ${p.title}` }));
}
