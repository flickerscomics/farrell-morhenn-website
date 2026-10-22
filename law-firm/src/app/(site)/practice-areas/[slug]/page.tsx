import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArticleCard, PersonCard } from "@/components/cards";
import { Markdown, PageHero } from "@/components/ui";
import { prisma } from "@/lib/db";
import { parseIntakeFields } from "@/lib/intake";
import { articleCardSelect, publicStaffWhere, publishedArticleWhere, staffCardSelect } from "@/server/public";
import { getSettings } from "@/server/settings";

const getArea = cache((slug: string) =>
  prisma.practiceArea.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      overview: true,
      matterTypes: true,
      services: true,
      intakeFields: true,
      metaDescription: true,
      attorneys: { where: publicStaffWhere, orderBy: { sortOrder: "asc" }, select: staffCardSelect },
      faqs: {
        where: { isPublished: true, archivedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, question: true, answer: true },
      },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const area = await getArea((await params).slug);
  if (!area) return { title: "Practice area not found" };
  return {
    title: area.name,
    description: area.metaDescription || area.shortDescription,
    alternates: { canonical: `/practice-areas/${area.slug}` },
    openGraph: { title: area.name, description: area.shortDescription },
  };
}

export default async function PracticeAreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const area = await getArea((await params).slug);
  if (!area) notFound();
  const settings = await getSettings();
  const articles = await prisma.article.findMany({
    where: { ...publishedArticleWhere(), practiceAreas: { some: { id: area.id } } },
    orderBy: { publishedAt: "desc" },
    select: articleCardSelect,
    take: 3,
  });
  const hasIntake = parseIntakeFields(area.intakeFields).length > 0;

  return (
    <>
      <PageHero
        eyebrow="Practice area"
        title={area.name}
        lead={area.shortDescription}
        crumbs={[{ label: "Practice areas", href: "/practice-areas" }, { label: area.name }]}
      >
        <div className="row" style={{ marginTop: "1.5rem" }}>
          <Link href={`/enquiry?area=${area.slug}`} className="btn btn-primary">
            {hasIntake ? `Start a ${area.name.toLowerCase()} enquiry` : "Make an enquiry"}
          </Link>
          <Link href="/consultation" className="btn btn-secondary">
            Request a consultation
          </Link>
        </div>
      </PageHero>

      <section className="section">
        <div className="container split split-aside">
          <div>
            <h2>Overview</h2>
            <Markdown>{area.overview || area.shortDescription}</Markdown>

            {area.matterTypes.length > 0 && (
              <>
                <h2 style={{ marginTop: "2.5rem" }}>Matters we handle</h2>
                <ul className="list-check list-columns">
                  {area.matterTypes.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </>
            )}

            {area.faqs.length > 0 && (
              <>
                <h2 style={{ marginTop: "2.5rem" }}>Frequently asked questions</h2>
                <div className="faq-list">
                  {area.faqs.map((f) => (
                    <details key={f.id} className="faq-item">
                      <summary>{f.question}</summary>
                      <div className="faq-answer">
                        <Markdown className="prose-sans">{f.answer}</Markdown>
                      </div>
                    </details>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="stack">
            {area.services.length > 0 && (
              <div className="card">
                <h3>Services</h3>
                <ul className="list-check">
                  {area.services.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="card" style={{ background: "var(--navy)", color: "#dfe2e8", border: 0 }}>
              <h3 style={{ color: "white" }}>Discuss your matter</h3>
              <p className="small">
                Tell us briefly what happened. You will receive a reference number immediately and a member of staff will
                be in touch.
              </p>
              <Link href={`/enquiry?area=${area.slug}`} className="btn btn-accent btn-block">
                Make an enquiry
              </Link>
            </div>
            <p className="small muted">
              Information on this page describes the fictional legal framework of the GTA World roleplay community and is
              not real-world legal advice.
            </p>
          </aside>
        </div>
      </section>

      {area.attorneys.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <p className="eyebrow">Who handles these matters</p>
            <h2>{area.name} team</h2>
            <div className="grid grid-4" style={{ marginTop: "1.5rem" }}>
              {area.attorneys.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Related articles</h2>
              <Link href="/news" className="link-arrow">
                All articles
              </Link>
            </div>
            <div className="grid grid-3">
              {articles.map((a) => (
                <ArticleCard key={a.id} article={a} timezone={settings.timezone} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
