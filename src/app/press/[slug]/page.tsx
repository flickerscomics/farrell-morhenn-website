import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PressCard } from "@/components/cards";
import { PressReleaseView } from "@/components/press-release-view";
import { Breadcrumbs } from "@/components/ui";
import { absoluteUrl, pressListItem, pressRelease, pressReleases, relatedReleases, shareImages } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  const params = pressReleases().map((r) => ({ slug: r.slug }));
  // A static export needs at least one page here; with none, build a placeholder that shows "page not found".
  return params.length ? params : [{ slug: "none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = pressRelease((await params).slug);
  if (!r) return {};
  return {
    title: r.title,
    description: r.summary,
    alternates: { canonical: absoluteUrl(`/press/${r.slug}/`), types: { "application/rss+xml": absoluteUrl("/press/feed.xml") } },
    openGraph: {
      type: "article",
      title: r.title,
      description: r.summary,
      publishedTime: r.releaseAt,
      modifiedTime: r.updatedOn,
      tags: r.tags,
      images: shareImages(r.image ? { url: r.image, alt: r.imageAlt } : undefined),
    },
    twitter: { card: "summary_large_image", title: r.title, description: r.summary, images: shareImages(r.image ? { url: r.image, alt: r.imageAlt } : undefined) },
    robots: r.status === "ARCHIVED" ? { index: false } : undefined,
  };
}

export default async function PressReleasePage({ params }: { params: Promise<{ slug: string }> }) {
  const r = pressRelease((await params).slug);
  if (!r) notFound();
  const related = relatedReleases(r);
  return (
    <>
      <section className="section-tight">
        <div className="container">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Press releases", href: "/press" }, { label: r.title }]} />
          <PressReleaseView release={r} url={absoluteUrl(`/press/${r.slug}/`)} />
        </div>
      </section>
      {related.length > 0 && (
        <section className="section section-alt related-releases">
          <div className="container">
            <div className="section-head">
              <h2>Related press releases</h2>
              <Link href="/press" className="link-arrow">All press releases</Link>
            </div>
            <div className="grid grid-3">
              {related.map((x) => <PressCard key={x.slug} release={pressListItem(x)} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
