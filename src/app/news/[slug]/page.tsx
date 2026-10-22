import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { ArticleCard } from "@/components/cards";
import { Breadcrumbs } from "@/components/ui";
import { absoluteUrl, article, articles, authorOf, relatedArticles, shareImages } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  const params = articles().map((a) => ({ slug: a.slug }));
  // A static export needs at least one page here; with none, build a placeholder that shows "page not found".
  return params.length ? params : [{ slug: "none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = article((await params).slug);
  if (!a) return {};
  const author = authorOf(a);
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: absoluteUrl(`/news/${a.slug}/`) },
    openGraph: { type: "article", title: a.title, description: a.summary, publishedTime: a.publishedOn, authors: author ? [author.name] : undefined, tags: a.tags, images: shareImages() },
    twitter: { card: "summary_large_image", title: a.title, description: a.summary, images: shareImages() },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = article((await params).slug);
  if (!a) notFound();
  const related = relatedArticles(a);
  return (
    <>
      <section className="section-tight">
        <div className="container">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "News & insights", href: "/news" }, { label: a.title }]} />
          <ArticleView article={a} />
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
              {related.map((r) => <ArticleCard key={r.slug} article={r} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
