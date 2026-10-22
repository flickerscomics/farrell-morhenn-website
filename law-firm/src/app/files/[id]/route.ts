import { prisma } from "@/lib/db";
import { getClient, getStaff } from "@/server/auth";
import { canAccessUpload } from "@/server/file-access";
import { readStoredFile } from "@/server/uploads";

// Authenticated downloads for private documents. Responses are identical for
// "missing" and "forbidden" so file ids cannot be probed.

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return notFound();
  const upload = await prisma.upload.findUnique({ where: { id } });
  if (!upload) return notFound();
  const [staff, client] = await Promise.all([getStaff(), getClient()]);
  if (!(await canAccessUpload(upload, staff, client))) return notFound();
  try {
    const data = await readStoredFile(upload.storageKey);
    const ascii = upload.originalName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": upload.mimeType,
        "Content-Length": String(data.length),
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(upload.originalName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return notFound();
  }
}
