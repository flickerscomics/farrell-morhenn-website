import "server-only";
import { prisma } from "@/lib/db";
import { imageLibrary } from "@/server/content-helpers";

export async function articleFormOptions() {
  const [categories, authors, areas, library] = await Promise.all([
    prisma.articleCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.staffProfile.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, fullName: true, status: true } }),
    prisma.practiceArea.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    imageLibrary(),
  ]);
  return {
    categories: categories.map((c) => ({ value: c.id, label: c.name })),
    authors: authors.map((a) => ({ value: a.id, label: a.status === "ACTIVE" ? a.fullName : `${a.fullName} (${a.status.toLowerCase().replace("_", " ")})` })),
    areas: areas.map((a) => ({ value: a.id, label: a.name })),
    library,
  };
}
