import { prisma } from "@/lib/db";
import { readStoredFile } from "@/server/uploads";

// Serves PUBLIC uploads only (portraits, logos, article images). Private
// documents are never reachable here; they go through /files/[id], which
// checks permissions on every request.

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const upload = await prisma.upload.findUnique({ where: { id } });
  if (!upload || upload.visibility !== "PUBLIC" || !upload.mimeType.startsWith("image/")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readStoredFile(upload.storageKey);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": upload.mimeType,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
