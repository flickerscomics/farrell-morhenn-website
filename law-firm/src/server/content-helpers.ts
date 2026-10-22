import "server-only";
import type { UploadPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";
import { IMAGE_TYPES, isRealFile, saveUpload, UploadError } from "./uploads";

/**
 * Reads an ImageField submission: a newly uploaded file wins, otherwise the
 * selected library image (which must be a public image) or none.
 */
export async function resolveImage(
  formData: FormData,
  name: string,
  opts: { purpose: UploadPurpose; uploadedById: string; altText?: string; maxEdge?: number },
): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const file = formData.get(`${name}File`);
  if (isRealFile(file)) {
    try {
      const upload = await saveUpload(file, IMAGE_TYPES, { visibility: "PUBLIC", purpose: opts.purpose, uploadedById: opts.uploadedById, altText: opts.altText }, opts.maxEdge);
      return { ok: true, id: upload.id };
    } catch (e) {
      if (e instanceof UploadError) return { ok: false, error: e.message };
      throw e;
    }
  }
  const selected = String(formData.get(`${name}Id`) ?? "");
  if (!selected) return { ok: true, id: null };
  const existing = await prisma.upload.findFirst({ where: { id: selected, visibility: "PUBLIC", mimeType: { startsWith: "image/" } } });
  return existing ? { ok: true, id: existing.id } : { ok: false, error: "Choose an image from the library." };
}

export async function imageLibrary() {
  const rows = await prisma.upload.findMany({
    where: { visibility: "PUBLIC", mimeType: { startsWith: "image/" } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, originalName: true, altText: true },
  });
  return rows.map((r) => ({ id: r.id, label: r.altText ? `${r.altText} (${r.originalName})` : r.originalName }));
}

export function checkboxIds(formData: FormData, name: string) {
  return [...new Set(formData.getAll(name).map(String).filter((v) => /^[a-z0-9]{10,40}$/.test(v)))];
}
