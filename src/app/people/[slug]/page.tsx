import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/cards";
import { Markdown, PageHero, Portrait } from "@/components/ui";
import { absoluteUrl, articles, isBookable, people, person, practiceArea, site } from "@/lib/content";
import { EmailLink } from "@/components/email-link";
import { STAFF_ROLE_LABELS } from "@/lib/labels";

export const dynamicParams = false;

export function generateStaticParams() {
  return people().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = person((await params).slug);
  if (!p) return {};
  return {
    title: `${p.fullName}, ${p.title}`,
    description: p.shortBio,
    alternates: { canonical: absoluteUrl(`/people/${p.slug}/`) },
    openGraph: { title: p.fullName, description: p.shortBio, type: "profile" },
  };
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = person((await params).slug);
  if (!p) notFound();
  const areas = p.practiceAreas.map(practiceArea).filter((a) => !!a);
  const written = articles().filter((a) => a.author === p.slug).slice(0, 3);
  const firstName = p.fullName.split(" ")[0];

  return (
    <>
      <PageHero
        eyebrow={STAFF_ROLE_LABELS[p.role]}
        title={p.fullName}
        lead={p.title}
        crumbs={[{ label: "People", href: "/people" }, { label: p.fullName }]}
      />
      <section className="section">
        <div className="container split">
          <aside className="stack">
            <Portrait name={p.fullName} src={p.portrait} />
            {p.status === "ON_LEAVE" && (
              <div className="notice notice-warn">
                <p>{firstName} is currently on leave. Their matters are being handled by colleagues.</p>
              </div>
            )}
            {isBookable(p) ? (
              <div className="card">
                <h3 style={{ fontSize: "1.1rem" }}>Arrange a consultation</h3>
                <p className="small" style={{ margin: 0 }}>
                  {p.email ? (
                    <>
                      Email <EmailLink address={p.email} /> or call reception on {site.phone} and ask
                      for {firstName}.
                    </>
                  ) : (
                    <>Call reception on {site.phone} and ask for {firstName}.</>
                  )}
                </p>
              </div>
            ) : (
              <Link href="/contact" className="btn btn-secondary btn-block">
                Contact the office
              </Link>
            )}
            <dl className="profile-meta">
              {areas.length > 0 && (
                <div>
                  <dt>Practice areas</dt>
                  <dd>
                    <ul className="list-check">
                      {areas.map((a) => (
                        <li key={a!.slug}>
                          <Link href={`/practice-areas/${a!.slug}`}>{a!.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              {p.languages && p.languages.length > 0 && (
                <div>
                  <dt>Languages</dt>
                  <dd>{p.languages.join(", ")}</dd>
                </div>
              )}
              {p.email && (
                <div>
                  <dt>Email</dt>
                  <dd><EmailLink address={p.email} /></dd>
                </div>
              )}
              {p.phone && (
                <div>
                  <dt>Direct line</dt>
                  <dd>{p.phone}</dd>
                </div>
              )}
              {p.joinedYear && (
                <div>
                  <dt>With the firm since</dt>
                  <dd>{p.joinedYear}</dd>
                </div>
              )}
            </dl>
          </aside>
          <div>
            <Markdown>{p.biography || p.shortBio}</Markdown>
            {p.background && (
              <>
                <h2 style={{ marginTop: "2.5rem" }}>Background</h2>
                <Markdown>{p.background}</Markdown>
              </>
            )}
            {(p.qualifications || p.barAdmissions) && (
              <div className="grid grid-2" style={{ marginTop: "2.5rem" }}>
                {p.qualifications && (
                  <div className="card">
                    <h3>Qualifications</h3>
                    <p style={{ whiteSpace: "pre-line", margin: 0 }}>{p.qualifications}</p>
                  </div>
                )}
                {p.barAdmissions && (
                  <div className="card">
                    <h3>Bar admissions</h3>
                    <p style={{ whiteSpace: "pre-line", margin: 0 }}>{p.barAdmissions}</p>
                  </div>
                )}
              </div>
            )}
            {p.notableCases && (
              <>
                <h2 style={{ marginTop: "2.5rem" }}>Notable matters</h2>
                <Markdown>{p.notableCases}</Markdown>
              </>
            )}
            {p.achievements && (
              <>
                <h2 style={{ marginTop: "2.5rem" }}>Recognition and activities</h2>
                <Markdown>{p.achievements}</Markdown>
              </>
            )}
          </div>
        </div>
      </section>
      {written.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2>Articles by {p.fullName}</h2>
            <div className="grid grid-3">
              {written.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
