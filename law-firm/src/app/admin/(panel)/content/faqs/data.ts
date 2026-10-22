import "server-only";
import { prisma } from "@/lib/db";

export async function faqOptions() {
  const [categories, areas] = await Promise.all([
    prisma.faqCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.practiceArea.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories: categories.map((c) => ({ value: c.id, label: c.name })), areas: areas.map((a) => ({ value: a.id, label: a.name })) };
}
