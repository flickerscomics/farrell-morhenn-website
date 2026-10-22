import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/server/public";
import { Markdown, PageHero } from "./ui";

export async function legalPageMetadata(slug: string): Promise<Metadata> {
  const page = await getPage(slug);
  return {
    title: page?.title ?? "Not found",
    description: page?.metaDescription || page?.summary,
    alternates: { canonical: `/${slug}` },
  };
}

export async function LegalPage({ slug }: { slug: string }) {
  const page = await getPage(slug);
  if (!page) notFound();
  return (
    <>
      <PageHero title={page.title} lead={page.summary} crumbs={[{ label: page.title }]} />
      <section className="section-tight">
        <div className="container">
          <Markdown>{page.body}</Markdown>
          <p className="small muted" style={{ marginTop: "2rem" }}>
            Last updated {page.updatedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
          </p>
        </div>
      </section>
    </>
  );
}
