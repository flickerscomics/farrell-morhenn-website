import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonCard } from "@/components/cards";
import { Markdown, PageHero } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getPage, pageSections, publicStaffWhere, staffCardSelect } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return {
    title: page?.title ?? "About the firm",
    description: page?.metaDescription || page?.summary,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const page = await getPage("about");
  if (!page) notFound();
  const [leaders, milestones] = await Promise.all([
    prisma.staffProfile.findMany({
      where: { ...publicStaffWhere, isLeadership: true },
      orderBy: { sortOrder: "asc" },
      select: staffCardSelect,
    }),
    prisma.milestone.findMany({ where: { isPublished: true }, orderBy: [{ sortOrder: "asc" }, { year: "asc" }] }),
  ]);
  const sections = pageSections(page.sections);

  return (
    <>
      <PageHero eyebrow="About the firm" title={page.title} lead={page.summary} crumbs={[{ label: "About" }]} />

      {page.body && (
        <section className="section-tight">
          <div className="container">
            <Markdown>{page.body}</Markdown>
          </div>
        </section>
      )}

      {sections.map((s, i) => (
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
                <PersonCard key={p.id} person={p} />
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
                <li key={m.id}>
                  <span className="timeline-year">{m.year}</span>
                  <div>
                    <h3>{m.title}</h3>
                    {m.description && <p className="muted">{m.description}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <p className="small muted">Milestones describe the firm&apos;s fictional in-character history.</p>
          </div>
        </section>
      )}

      <section className="section-tight">
        <div className="container row row-between">
          <h2 style={{ margin: 0 }}>Talk to us about your matter</h2>
          <div className="row">
            <Link href="/enquiry" className="btn btn-secondary">
              Make an enquiry
            </Link>
            <Link href="/consultation" className="btn btn-primary">
              Request a consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
