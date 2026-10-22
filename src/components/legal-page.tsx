import type { Metadata } from "next";
import { absoluteUrl, page } from "@/lib/content";
import { formatDate } from "@/lib/time";
import { Markdown, PageHero } from "./ui";

export function legalPageMetadata(slug: string): Metadata {
  const p = page(slug);
  return { title: p.title, description: p.metaDescription || p.summary, alternates: { canonical: absoluteUrl(`/${slug}/`) } };
}

export function LegalPage({ slug }: { slug: string }) {
  const p = page(slug);
  return (
    <>
      <PageHero title={p.title} lead={p.summary} crumbs={[{ label: p.title }]} />
      <section className="section-tight">
        <div className="container">
          <Markdown>{p.body}</Markdown>
          <p className="small muted" style={{ marginTop: "2rem" }}>Last updated {formatDate(p.updatedOn)}.</p>
        </div>
      </section>
    </>
  );
}
