import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard, PersonCard } from "@/components/cards";
import { Markdown, PageHero } from "@/components/ui";
import { absoluteUrl, articles, faqsForArea, peopleInArea, practiceArea, practiceAreas, shareImages } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return practiceAreas().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const area = practiceArea((await params).slug);
  if (!area) return {};
  return {
    title: area.name,
    description: area.shortDescription,
    alternates: { canonical: absoluteUrl(`/practice-areas/${area.slug}/`) },
    openGraph: { title: area.name, description: area.shortDescription, images: shareImages() },
  };
}

export default async function PracticeAreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const area = practiceArea((await params).slug);
  if (!area) notFound();
  const team = peopleInArea(area.slug);
  const faqs = faqsForArea(area.slug);
  const related = articles().filter((a) => a.practiceAreas.includes(area.slug)).slice(0, 3);

  return (
    <>
      <PageHero
        eyebrow="Practice area"
        title={area.name}
        lead={area.shortDescription}
        crumbs={[{ label: "Practice areas", href: "/practice-areas" }, { label: area.name }]}
      >
        <div className="row" style={{ marginTop: "1.5rem" }}>
          <Link href="/contact" className="btn btn-primary">
            Discuss a {area.name.toLowerCase()} matter
          </Link>
          {team.length > 0 && (
            <a href="#team" className="btn btn-secondary">
              Meet the team
            </a>
          )}
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
            {faqs.length > 0 && (
              <>
                <h2 style={{ marginTop: "2.5rem" }}>Frequently asked questions</h2>
                <div className="faq-list">
                  {faqs.map((f) => (
                    <details key={f.question} className="faq-item">
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
                Call, email or visit the office with a short summary of what happened. A member of staff will
                be in touch.
              </p>
              <Link href="/contact" className="btn btn-accent btn-block">
                How to contact us
              </Link>
            </div>
            <p className="small muted">
              The information on this page is general information and is not legal advice.
            </p>
          </aside>
        </div>
      </section>

      {team.length > 0 && (
        <section className="section section-alt" id="team">
          <div className="container">
            <p className="eyebrow">Who handles these matters</p>
            <h2>{area.name} team</h2>
            <div className="grid grid-4" style={{ marginTop: "1.5rem" }}>
              {team.map((p) => (
                <PersonCard key={p.slug} person={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Related articles</h2>
              <Link href="/news" className="link-arrow">
                All articles
              </Link>
            </div>
            <div className="grid grid-3">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
