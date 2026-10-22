import "server-only";
import { prisma } from "@/lib/db";
import { imageLibrary } from "@/server/content-helpers";

export async function profileOptions() {
  const [areas, library] = await Promise.all([
    prisma.practiceArea.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    imageLibrary(),
  ]);
  return { areas: areas.map((a) => ({ value: a.id, label: a.name })), library };
}
