import type { Metadata } from "next";
import Link from "next/link";
import { PersonCard } from "@/components/cards";
import { Markdown, PageHero } from "@/components/ui";
import { absoluteUrl, milestones, page, people } from "@/lib/content";

const about = page("about");

export const metadata: Metadata = {
  title: about.title,
  description: about.metaDescription || about.summary,
  alternates: { canonical: absoluteUrl("/about/") },
};

export default function AboutPage() {
  const leaders = people().filter((p) => p.isLeadership);
  return (
    <>
      <PageHero eyebrow="About the firm" title={about.title} lead={about.summary} crumbs={[{ label: "About" }]} />
      {about.body && (
        <section className="section-tight">
          <div className="container">
            <Markdown>{about.body}</Markdown>
          </div>
        </section>
      )}
      {about.sections.map((s, i) => (
        <section key={i} className={`section-tight ${i % 2 === 1 ? "section-alt" : ""}`}>
          <div className="container split">
            <div>
              <p className="eyebrow">{String(i + 1).padStart(2, "0")}</p>
              <h2>{s.heading}</h2>
            </div>
            <Markdown>{s.body}</Markdown>
          </div>
        </section>
      ))}
      {leaders.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Leadership</p>
                <h2>The people who lead the firm</h2>
              </div>
              <Link href="/people" className="link-arrow">
                All people
              </Link>
            </div>
            <div className="grid grid-4">
              {leaders.map((p) => (
                <PersonCard key={p.slug} person={p} />
              ))}
            </div>
          </div>
        </section>
      )}
      {milestones.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <p className="eyebrow">Milestones</p>
            <h2>Our history in brief</h2>
            <ol className="timeline-public">
              {milestones.map((m) => (
                <li key={m.year + m.title}>
                  <span className="timeline-year">{m.year}</span>
                  <div>
                    <h3>{m.title}</h3>
                    {m.description && <p className="muted">{m.description}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
      <section className="section-tight">
        <div className="container row row-between">
          <h2 style={{ margin: 0 }}>Talk to us about your matter</h2>
          <Link href="/contact" className="btn btn-primary">
            Contact the office
          </Link>
        </div>
      </section>
    </>
  );
}
