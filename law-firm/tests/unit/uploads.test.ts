import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { cleanFilename, detectFileType, prepareFile, storagePath, UploadError } from "@/server/uploads";

const file = (data: Buffer | string, name: string, type = "application/octet-stream") => new File([typeof data === "string" ? data : new Uint8Array(data)], name, { type });

describe("file type detection", () => {
  it("identifies files by content, not name", () => {
    expect(detectFileType(Buffer.from("%PDF-1.7 ..."))?.mime).toBe("application/pdf");
    expect(detectFileType(Buffer.from("plain notes\n"))?.mime).toBe("text/plain");
    expect(detectFileType(Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]))).toBeNull(); // Windows executable
  });
});

describe("prepareFile", () => {
  it("rejects an executable renamed to .png", async () => {
    await expect(prepareFile(file(Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]), "photo.png", "image/png"), ["image/png"])).rejects.toBeInstanceOf(UploadError);
  });
  it("rejects types that are not allowed for the slot", async () => {
    await expect(prepareFile(file("%PDF-1.4 test", "doc.pdf"), ["image/png"])).rejects.toThrow(/Unsupported file type/);
  });
  it("rejects files over the size limit", async () => {
    await expect(prepareFile(file(Buffer.alloc(3 * 1024 * 1024, 65), "big.txt"), ["text/plain"])).rejects.toThrow(/MB or smaller/);
  });
  it("rejects corrupt images that only carry a valid header", async () => {
    const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
    await expect(prepareFile(file(fake, "x.jpg"), ["image/jpeg"])).rejects.toThrow(/could not be processed/);
  });
  it("re-encodes JPEG uploads as WebP and resizes them", async () => {
    const jpeg = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: "#123456" } }).jpeg().toBuffer();
    const prepared = await prepareFile(file(jpeg, "Wide Photo.JPG"), ["image/jpeg", "image/webp"], 1200);
    expect(prepared.mime).toBe("image/webp");
    expect(prepared.width).toBe(1200);
    expect(prepared.originalName).toBe("Wide Photo.webp");
  });
});

describe("storage paths", () => {
  it("only accepts generated keys and blocks traversal", () => {
    expect(() => storagePath("private/0123456789abcdef0123456789abcdef.pdf")).not.toThrow();
    expect(() => storagePath("../etc/passwd")).toThrow();
    expect(() => storagePath("private/../../secret.pdf")).toThrow();
    expect(() => storagePath("public/abc.exe")).toThrow();
  });
  it("cleans user-supplied filenames", () => {
    expect(cleanFilename("../../etc/passwd")).toBe("passwd");
    expect(cleanFilename("my<file>.pdf")).toBe("my_file_.pdf");
  });
});
