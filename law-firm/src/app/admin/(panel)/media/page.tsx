import { AdminHead } from "@/components/admin/panels";
import { ConfirmSubmit, SubmitButton } from "@/components/client-ui";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { UPLOAD_PURPOSE_LABELS } from "@/lib/labels";
import { requirePermission } from "@/server/auth";
import { mediaOpAction } from "./actions";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  await requirePermission("media.manage");
  const images = await prisma.upload.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { portraitFor: true, articleImages: true, settingsLogo: true } } },
  });
  return (
    <>
      <AdminHead title="Media library" description="Public images used for portraits, articles and branding. Private documents never appear here." />
      <section className="panel"><h2>Upload an image</h2><UploadForm maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)} /></section>
      {images.length === 0 ? <EmptyState title="No images uploaded yet" /> : (
        <div className="media-grid" style={{ marginTop: "1.25rem" }}>
          {images.map((m) => {
            const uses = m._count.portraitFor + m._count.articleImages + m._count.settingsLogo;
            return (
              <figure key={m.id}>
                <img src={`/media/${m.id}`} alt={m.altText} loading="lazy" />
                <figcaption>
                  <span className="small">{m.originalName} · {m.width}×{m.height} · {Math.ceil(m.size / 1024)} KB</span>
                  <span className="small muted">{UPLOAD_PURPOSE_LABELS[m.purpose]} · used {uses}×</span>
                  <form action={mediaOpAction} className="form" style={{ gap: "0.4rem" }}>
                    <input type="hidden" name="id" value={m.id} />
                    <label className="sr-only" htmlFor={`alt-${m.id}`}>Description</label>
                    <input id={`alt-${m.id}`} name="altText" className="input input-sm" defaultValue={m.altText} maxLength={200} placeholder="Description" />
                    <div className="row" style={{ gap: "0.3rem" }}>
                      <SubmitButton className="btn btn-secondary btn-sm" name="op" value="alt" pendingLabel="…">Save</SubmitButton>
                      <ConfirmSubmit className="btn btn-ghost btn-sm" title="Delete this image?" message={uses ? `It is used ${uses} time(s); those places will show no image.` : "This cannot be undone."} name="op" value="delete">Delete</ConfirmSubmit>
                    </div>
                  </form>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </>
  );
}
