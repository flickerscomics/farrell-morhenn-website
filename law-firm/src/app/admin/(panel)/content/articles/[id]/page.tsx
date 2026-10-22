import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityPanel, AdminHead } from "@/components/admin/panels";
import { StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { PUBLISH_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime, toLocalInput } from "@/lib/time";
import { activityFor } from "@/server/audit";
import { can, requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { ArticleForm } from "../article-form";
import { articleFormOptions } from "../data";
import { StatusForms } from "./status-forms";

export const metadata = { title: "Edit article" };

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("content.articles");
  const { id } = await params;
  const a = await prisma.article.findUnique({ where: { id }, include: { practiceAreas: { select: { id: true } } } });
  if (!a) notFound();
  const [opts, settings, events] = await Promise.all([articleFormOptions(), getSettings(), activityFor("Article", id)]);
  const canPublish = can(staff, "content.publish");
  const locked = a.status !== "DRAFT" && !canPublish;
  return (
    <>
      <AdminHead
        back={{ href: "/admin/content/articles", label: "Articles" }}
        title={a.title}
        description={`Last updated ${formatDateTime(a.updatedAt, settings.timezone)}`}
        actions={<>
          <StatusBadge status={a.status} label={PUBLISH_STATUS_LABELS[a.status]} />
          <Link href={`/admin/content/articles/${a.id}/preview`} className="btn btn-secondary btn-sm" target="_blank">Preview</Link>
          {a.status === "PUBLISHED" && <Link href={`/news/${a.slug}`} className="btn btn-ghost btn-sm" target="_blank">View live</Link>}
        </>}
      />
      {a.type === "CASE_ANNOUNCEMENT" && (
        <div className="notice notice-warn" style={{ marginBottom: "1.25rem" }}>
          <p>Case announcements are public. Never include client names, private notes, documents or internal discussion.</p>
        </div>
      )}
      <div className="detail-grid">
        <section className="panel">
          {locked ? (
            <p>This article is {a.status.toLowerCase()}. Only editors with publishing rights can change it.</p>
          ) : (
            <ArticleForm
              {...opts}
              canPublish={canPublish}
              values={{
                id: a.id, title: a.title, slug: a.slug, summary: a.summary, body: a.body, type: a.type, categoryId: a.categoryId ?? "", authorId: a.authorId ?? "",
                tags: a.tags.join(", "), metaDescription: a.metaDescription, isFeatured: a.isFeatured, featuredImageId: a.featuredImageId,
                publishedAt: toLocalInput(a.publishedAt, settings.timezone), practiceAreaIds: a.practiceAreas.map((p) => p.id),
              }}
            />
          )}
        </section>
        <div>
          <section className="panel">
            <h2>Publishing</h2>
            {canPublish ? <StatusForms id={a.id} status={a.status} isCase={a.type === "CASE_ANNOUNCEMENT"} /> : <p className="small muted">An editor with publishing rights will review and publish this article.</p>}
          </section>
          <ActivityPanel events={events} timezone={settings.timezone} />
        </div>
      </div>
    </>
  );
}
