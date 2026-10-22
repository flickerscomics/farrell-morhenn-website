import Link from "next/link";
import type { ArticleType, Prisma, PublishStatus } from "@prisma/client";
import { AdminHead } from "@/components/admin/panels";
import { EmptyState, Pagination, StatusBadge, pageParam, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { ARTICLE_TYPE_LABELS, PUBLISH_STATUS_LABELS } from "@/lib/labels";
import { formatShortDate } from "@/lib/time";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Articles" };
const PER_PAGE = 25;

export default async function ArticlesAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("content.articles");
  const sp = await searchParams;
  const q = strParam(sp.q, 80).trim();
  const status = strParam(sp.status, 20);
  const type = strParam(sp.type, 30);
  const page = pageParam(sp.page);
  const settings = await getSettings();
  const where: Prisma.ArticleWhereInput = {
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(status in PUBLISH_STATUS_LABELS ? { status: status as PublishStatus } : {}),
    ...(type in ARTICLE_TYPE_LABELS ? { type: type as ArticleType } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { author: { select: { fullName: true } }, category: { select: { name: true } } } }),
  ]);
  return (
    <>
      <AdminHead
        title="Articles"
        description="News, legal articles, recruitment posts and anonymised case announcements."
        actions={<><Link href="/admin/content/articles/categories" className="btn btn-secondary btn-sm">Categories</Link><Link href="/admin/content/articles/new" className="btn btn-primary btn-sm">New article</Link></>}
      />
      <form className="filters" method="get">
        <div className="field field-grow"><label className="label" htmlFor="q">Search titles</label><input id="q" name="q" className="input input-sm" defaultValue={q} /></div>
        <div className="field"><label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="select select-sm" defaultValue={status}><option value="">Any</option>{Object.entries(PUBLISH_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label className="label" htmlFor="type">Type</label>
          <select id="type" name="type" className="select select-sm" defaultValue={type}><option value="">Any</option>{Object.entries(ARTICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="row"><button className="btn btn-primary btn-sm" type="submit">Apply</button><Link href="/admin/content/articles" className="btn btn-ghost btn-sm">Reset</Link></div>
      </form>
      {rows.length === 0 ? <EmptyState title="No articles found" /> : (
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Published</th><th>Updated</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td data-label="Title"><Link href={`/admin/content/articles/${a.id}`}>{a.title}</Link><span className="sub">{[a.author?.fullName, a.category?.name].filter(Boolean).join(" · ") || "—"}</span></td>
                  <td data-label="Type">{ARTICLE_TYPE_LABELS[a.type]}</td>
                  <td data-label="Status"><StatusBadge status={a.status} label={PUBLISH_STATUS_LABELS[a.status]} />{a.status === "PUBLISHED" && a.publishedAt && a.publishedAt > new Date() && <> <span className="badge badge-info">Scheduled</span></>}</td>
                  <td data-label="Published">{a.publishedAt ? formatShortDate(a.publishedAt, settings.timezone) : "—"}</td>
                  <td data-label="Updated">{formatShortDate(a.updatedAt, settings.timezone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/content/articles" params={{ q, status, type }} />
    </>
  );
}
