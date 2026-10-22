import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Prisma, UploadPurpose, UploadVisibility } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

// Uploaded files never keep the visitor's filename on disk. Each file is
// stored under a random key inside STORAGE_DIR (outside the web root) and
// served only through route handlers that check visibility and permissions.

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_TYPES = ["application/pdf", "text/plain", ...IMAGE_TYPES] as const;

type Detected = { mime: string; ext: string } | null;

/** Identifies a file by its leading bytes rather than trusting the browser. */
export function detectFileType(buf: Buffer): Detected {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (isPlainText(buf)) return { mime: "text/plain", ext: "txt" };
  return null;
}

function isPlainText(buf: Buffer) {
  if (buf.length === 0) return false;
  const sample = buf.subarray(0, 4096);
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) return false;
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample.subarray(0, Math.max(0, sample.length - 4)));
    return true;
  } catch {
    return false;
  }
}

export function cleanFilename(name: string) {
  const base = path.basename(name || "file").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim();
  return (base || "file").slice(0, 120);
}

export class UploadError extends Error {}

const STORAGE_KEY_RE = /^(public|private)\/[a-f0-9]{32}\.(jpg|png|webp|pdf|txt)$/;

export function storagePath(storageKey: string) {
  if (!STORAGE_KEY_RE.test(storageKey)) throw new UploadError("Invalid storage key.");
  const root = env.storageDir;
  const full = path.resolve(root, storageKey);
  if (!full.startsWith(root + path.sep)) throw new UploadError("Invalid storage path.");
  return full;
}

export type PreparedFile = {
  buffer: Buffer;
  mime: string;
  ext: string;
  width: number | null;
  height: number | null;
  originalName: string;
};

export type UploadMeta = {
  visibility: UploadVisibility;
  purpose: UploadPurpose;
  altText?: string;
  uploadedById?: string | null;
  uploadedByClientId?: string | null;
  enquiryId?: string | null;
  applicationId?: string | null;
  matterId?: string | null;
  clientVisible?: boolean;
};

export function isRealFile(value: FormDataEntryValue | null): value is File {
  return !!value && typeof value === "object" && "arrayBuffer" in value && value.size > 0;
}

/**
 * Validates and normalises a file without storing it, so callers can reject
 * a bad attachment before creating any related records.
 */
export async function prepareFile(
  file: File,
  allowed: readonly string[],
  maxImageEdge = 2000,
): Promise<PreparedFile> {
  if (file.size > env.maxUploadBytes) {
    throw new UploadError(`Files must be ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB or smaller.`);
  }
  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buffer);
  if (!detected || !allowed.includes(detected.mime)) {
    throw new UploadError(`Unsupported file type. Allowed: ${describeTypes(allowed)}.`);
  }

  let { mime, ext } = detected;
  let width: number | null = null;
  let height: number | null = null;

  if (mime.startsWith("image/")) {
    // Re-encoding strips metadata (including location data) and rejects
    // malformed images that merely carry a valid header.
    try {
      const pipeline = sharp(buffer, { failOn: "error", limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: maxImageEdge, height: maxImageEdge, fit: "inside", withoutEnlargement: true });
      const out =
        mime === "image/png"
          ? await pipeline.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
          : await pipeline.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      buffer = out.data;
      width = out.info.width;
      height = out.info.height;
      if (mime !== "image/png") {
        mime = "image/webp";
        ext = "webp";
      }
    } catch {
      throw new UploadError("The image could not be processed. Please upload a valid JPEG, PNG or WebP file.");
    }
  }

  const base = cleanFilename(file.name).replace(/\.[^.]+$/, "") || "file";
  return { buffer, mime, ext, width, height, originalName: `${base}.${ext}` };
}

export function describeTypes(allowed: readonly string[]) {
  const names = new Set(
    allowed.map((m) => (m === "text/plain" ? "TXT" : m === "image/jpeg" ? "JPEG" : m.split("/")[1].toUpperCase())),
  );
  return [...names].join(", ");
}

/** Writes a prepared file to storage and records it. Removes the file if the insert fails. */
export async function persistFile(
  prepared: PreparedFile,
  meta: UploadMeta,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const storageKey = `${meta.visibility === "PUBLIC" ? "public" : "private"}/${crypto.randomBytes(16).toString("hex")}.${prepared.ext}`;
  const target = storagePath(storageKey);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, prepared.buffer, { flag: "wx" });
  try {
    return await tx.upload.create({
      data: {
        storageKey,
        originalName: prepared.originalName,
        mimeType: prepared.mime,
        size: prepared.buffer.length,
        width: prepared.width,
        height: prepared.height,
        visibility: meta.visibility,
        purpose: meta.purpose,
        altText: (meta.altText ?? "").slice(0, 200),
        clientVisible: meta.clientVisible ?? false,
        uploadedById: meta.uploadedById ?? null,
        uploadedByClientId: meta.uploadedByClientId ?? null,
        enquiryId: meta.enquiryId ?? null,
        applicationId: meta.applicationId ?? null,
        matterId: meta.matterId ?? null,
      },
    });
  } catch (error) {
    await fs.rm(target, { force: true });
    throw error;
  }
}

export async function saveUpload(
  file: File,
  allowed: readonly string[],
  meta: UploadMeta,
  maxImageEdge?: number,
) {
  return persistFile(await prepareFile(file, allowed, maxImageEdge), meta);
}

export async function deleteStoredFile(storageKey: string) {
  await fs.rm(storagePath(storageKey), { force: true });
}

export async function readStoredFile(storageKey: string) {
  return fs.readFile(storagePath(storageKey));
}
