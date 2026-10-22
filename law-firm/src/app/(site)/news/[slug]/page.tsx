import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArticleCard } from "@/components/cards";
import { Breadcrumbs } from "@/components/ui";
import { ArticleView } from "@/components/article-view";
import { prisma } from "@/lib/db";
import { articleCardSelect, publishedArticleWhere } from "@/server/public";
import { getSettings } from "@/server/settings";

const getArticle = cache((slug: string) =>
  prisma.article.findFirst({
    where: { slug, ...publishedArticleWhere() },
    select: {
      ...articleCardSelect,
      body: true,
      metaDescription: true,
      updatedAt: true,
      categoryId: true,
      practiceAreas: { where: { isPublished: true }, select: { id: true, slug: true, name: true } },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return { title: "Article not found" };
  const description = a.metaDescription || a.summary;
  return {
    title: a.title,
    description,
    alternates: { canonical: `/news/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description,
      publishedTime: a.publishedAt?.toISOString(),
      modifiedTime: a.updatedAt.toISOString(),
      authors: a.author ? [a.author.fullName] : undefined,
      tags: a.tags,
      images: a.featuredImageId ? [{ url: `/media/${a.featuredImageId}` }] : undefined,
    },
    twitter: { card: a.featuredImageId ? "summary_large_image" : "summary", title: a.title, description },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();
  const settings = await getSettings();
  const related = await prisma.article.findMany({
    where: {
      AND: [
        publishedArticleWhere(),
        { id: { not: article.id } },
        {
          OR: [
            ...(article.categoryId ? [{ categoryId: article.categoryId }] : []),
            ...(article.tags.length ? [{ tags: { hasSome: article.tags } }] : []),
            ...(article.practiceAreas.length ? [{ practiceAreas: { some: { id: { in: article.practiceAreas.map((p) => p.id) } } } }] : []),
            { type: article.type },
          ],
        },
      ],
    },
    orderBy: { publishedAt: "desc" },
    select: articleCardSelect,
    take: 3,
  });

  return (
    <>
      <section className="section-tight">
        <div className="container">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "News & insights", href: "/news" }, { label: article.title }]} />
          <ArticleView article={article} timezone={settings.timezone} />
        </div>
      </section>
      {related.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2>Related articles</h2>
              <Link href="/news" className="link-arrow">All articles</Link>
            </div>
            <div className="grid grid-3">
              {related.map((a) => <ArticleCard key={a.id} article={a} timezone={settings.timezone} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
