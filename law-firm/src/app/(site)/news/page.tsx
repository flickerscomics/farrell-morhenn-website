import type { Metadata } from "next";
import Link from "next/link";
import type { ArticleType, Prisma } from "@prisma/client";
import { ArticleCard } from "@/components/cards";
import { EmptyState, PageHero, Pagination, pageParam, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { ARTICLE_TYPE_LABELS } from "@/lib/labels";
import { articleCardSelect, publishedArticleWhere } from "@/server/public";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "News & insights",
  description: "Firm announcements, legal articles and community information from Calder Whitmore (fictional, GTA World roleplay).",
  alternates: { canonical: "/news" },
};

const PER_PAGE = 9;

export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = strParam(sp.q, 80).trim();
  const type = strParam(sp.type, 40);
  const category = strParam(sp.category, 80);
  const tag = strParam(sp.tag, 60);
  const page = pageParam(sp.page);
  const settings = await getSettings();

  const and: Prisma.ArticleWhereInput[] = [publishedArticleWhere()];
  if (q) and.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] });
  if (type && type in ARTICLE_TYPE_LABELS) and.push({ type: type as ArticleType });
  if (category) and.push({ category: { slug: category } });
  if (tag) and.push({ tags: { has: tag } });
  const where: Prisma.ArticleWhereInput = { AND: and };

  const [total, articles, categories] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      select: articleCardSelect,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.articleCategory.findMany({
      orderBy: { sortOrder: "asc" },
      where: { articles: { some: publishedArticleWhere() } },
      select: { slug: true, name: true },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtered = Boolean(q || type || category || tag);

  return (
    <>
      <PageHero
        eyebrow="News & insights"
        title="Announcements and legal articles"
        lead="Firm news, plain-language guides and community legal information. Articles describe the fictional GTA World legal framework and are not real-world legal advice."
        crumbs={[{ label: "News & insights" }]}
      />
      <section className="section-tight">
        <div className="container">
          <nav className="chip-nav" aria-label="Article categories">
            <Link href="/news" aria-current={!category ? "true" : undefined}>All</Link>
            {categories.map((c) => (
              <Link key={c.slug} href={`/news?category=${c.slug}`} aria-current={category === c.slug ? "true" : undefined}>
                {c.name}
              </Link>
            ))}
          </nav>
          <form className="filters" method="get" role="search" aria-label="Search articles">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="field field-grow">
              <label className="label" htmlFor="q">Search articles</label>
              <input id="q" name="q" className="input" defaultValue={q} placeholder="Keyword" />
            </div>
            <div className="field">
              <label className="label" htmlFor="type">Type</label>
              <select id="type" name="type" className="select" defaultValue={type}>
                <option value="">All types</option>
                {Object.entries(ARTICLE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {tag && (
              <div className="field">
                <span className="label">Tag</span>
                <span><input type="hidden" name="tag" value={tag} /><span className="tag">#{tag}</span></span>
              </div>
            )}
            <div className="row">
              <button type="submit" className="btn btn-primary">Search</button>
              {filtered && <Link href="/news" className="btn btn-ghost">Clear</Link>}
            </div>
          </form>

          {articles.length === 0 ? (
            <EmptyState title={filtered ? "No articles match your search" : "No articles have been published yet"}>
              {filtered && <p><Link href="/news">Show all articles</Link></p>}
            </EmptyState>
          ) : (
            <div className="grid grid-3">
              {articles.map((a) => <ArticleCard key={a.id} article={a} timezone={settings.timezone} />)}
            </div>
          )}
          <Pagination page={page} pageCount={pageCount} basePath="/news" params={{ q, type, category, tag }} />
        </div>
      </section>
    </>
  );
}
