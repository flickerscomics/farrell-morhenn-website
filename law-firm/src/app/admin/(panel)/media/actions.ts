"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { setFlash } from "@/server/flash";
import { deleteStoredFile, IMAGE_TYPES, isRealFile, saveUpload, UploadError } from "@/server/uploads";

export async function uploadMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("media.manage");
  const file = formData.get("file");
  const altText = String(formData.get("altText") ?? "").trim().slice(0, 200);
  if (!isRealFile(file)) return { ok: false, errors: { file: "Choose an image to upload." } };
  if (!altText) return { ok: false, errors: { altText: "Describe the image for screen-reader users." } };
  try {
    const upload = await saveUpload(file, IMAGE_TYPES, { visibility: "PUBLIC", purpose: "GENERAL_IMAGE", uploadedById: staff.id, altText });
    await audit(staffActor(staff), { action: "media.uploaded", entityType: "Upload", entityId: upload.id, summary: `Uploaded image ${upload.originalName}` });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, errors: { file: e.message } };
    throw e;
  }
  await setFlash("Image uploaded.");
  redirect("/admin/media");
}

export async function mediaOpAction(formData: FormData) {
  const staff = await requirePermission("media.manage");
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const upload = await prisma.upload.findFirst({ where: { id, visibility: "PUBLIC" } });
  if (!upload) return redirect("/admin/media");
  if (op === "alt") {
    await prisma.upload.update({ where: { id }, data: { altText: String(formData.get("altText") ?? "").trim().slice(0, 200) } });
    await setFlash("Description saved.");
  } else if (op === "delete") {
    await prisma.upload.delete({ where: { id } });
    await deleteStoredFile(upload.storageKey);
    await audit(staffActor(staff), { action: "media.deleted", entityType: "Upload", entityId: id, summary: `Deleted image ${upload.originalName}` });
    await setFlash("Image deleted.");
  }
  redirect("/admin/media");
}
