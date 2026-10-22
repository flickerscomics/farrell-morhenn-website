import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArticleCard } from "@/components/cards";
import { Markdown, PageHero, Portrait } from "@/components/ui";
import { prisma } from "@/lib/db";
import { STAFF_ROLE_LABELS } from "@/lib/labels";
import { articleCardSelect, publicStaffWhere, publishedArticleWhere } from "@/server/public";
import { getSettings } from "@/server/settings";

const getPerson = cache((slug: string) =>
  prisma.staffProfile.findFirst({
    where: { slug, ...publicStaffWhere },
    select: {
      id: true,
      slug: true,
      fullName: true,
      title: true,
      role: true,
      status: true,
      portraitId: true,
      shortBio: true,
      biography: true,
      background: true,
      qualifications: true,
      barAdmissions: true,
      languages: true,
      notableCases: true,
      achievements: true,
      email: true,
      phone: true,
      acceptsConsultations: true,
      joinedYear: true,
      practiceAreas: { where: { isPublished: true }, select: { slug: true, name: true }, orderBy: { sortOrder: "asc" } },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const person = await getPerson((await params).slug);
  if (!person) return { title: "Profile not found" };
  return {
    title: `${person.fullName}, ${person.title}`,
    description: person.shortBio,
    alternates: { canonical: `/people/${person.slug}` },
    openGraph: { title: person.fullName, description: person.shortBio, type: "profile" },
  };
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const person = await getPerson((await params).slug);
  if (!person) notFound();
  const settings = await getSettings();
  const articles = await prisma.article.findMany({
    where: { ...publishedArticleWhere(), authorId: person.id },
    orderBy: { publishedAt: "desc" },
    select: articleCardSelect,
    take: 3,
  });
  const bookable = person.status === "ACTIVE" && person.acceptsConsultations;

  return (
    <>
      <PageHero
        eyebrow={STAFF_ROLE_LABELS[person.role]}
        title={person.fullName}
        lead={person.title}
        crumbs={[{ label: "People", href: "/people" }, { label: person.fullName }]}
      />
      <section className="section">
        <div className="container split">
          <aside className="stack">
            <Portrait name={person.fullName} portraitId={person.portraitId} />
            {person.status === "ON_LEAVE" && (
              <div className="notice notice-warn">
                <p>{person.fullName.split(" ")[0]} is currently on leave. Their matters are being handled by colleagues.</p>
              </div>
            )}
            {bookable ? (
              <Link href={`/consultation?attorney=${person.slug}`} className="btn btn-primary btn-block">
                Request a consultation
              </Link>
            ) : (
              <Link href="/enquiry" className="btn btn-secondary btn-block">
                Contact the office
              </Link>
            )}
            <dl className="profile-meta">
              {person.practiceAreas.length > 0 && (
                <div>
                  <dt>Practice areas</dt>
                  <dd>
                    <ul className="list-check">
                      {person.practiceAreas.map((a) => (
                        <li key={a.slug}>
                          <Link href={`/practice-areas/${a.slug}`}>{a.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              {person.languages.length > 0 && (
                <div>
                  <dt>Languages</dt>
                  <dd>{person.languages.join(", ")}</dd>
                </div>
              )}
              {person.email && (
                <div>
                  <dt>Email (in character)</dt>
                  <dd><a href={`mailto:${person.email}`}>{person.email}</a></dd>
                </div>
              )}
              {person.phone && (
                <div>
                  <dt>Direct line (in character)</dt>
                  <dd>{person.phone}</dd>
                </div>
              )}
              {person.joinedYear && (
                <div>
                  <dt>With the firm since</dt>
                  <dd>{person.joinedYear}</dd>
                </div>
              )}
            </dl>
          </aside>
          <div>
            <Markdown>{person.biography || person.shortBio}</Markdown>
            {person.background && (
              <>
                <h2 style={{ marginTop: "2.5rem" }}>Background</h2>
                <Markdown>{person.background}</Markdown>
              </>
            )}
            {(person.qualifications || person.barAdmissions) && (
              <div className="grid grid-2" style={{ marginTop: "2.5rem" }}>
                {person.qualifications && (
                  <div className="card">
                    <h3>Qualifications</h3>
                    <p style={{ whiteSpace: "pre-line", margin: 0 }}>{person.qualifications}</p>
                  </div>
                )}
                {person.barAdmissions && (
                  <div className="card">
                    <h3>Bar admissions</h3>
                    <p style={{ whiteSpace: "pre-line", margin: 0 }}>{person.barAdmissions}</p>
                  </div>
                )}
              </div>
            )}
            {person.notableCases && (
              <>
                <h2 style={{ marginTop: "2.5rem" }}>Notable matters</h2>
                <Markdown>{person.notableCases}</Markdown>
              </>
            )}
            {person.achievements && (
              <>
                <h2 style={{ marginTop: "2.5rem" }}>Recognition and activities</h2>
                <Markdown>{person.achievements}</Markdown>
              </>
            )}
            <p className="small muted" style={{ marginTop: "2rem" }}>
              Qualifications, admissions and matters described on this page are established in character within the GTA
              World roleplay community.
            </p>
          </div>
        </div>
      </section>
      {articles.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2>Articles by {person.fullName}</h2>
            <div className="grid grid-3">
              {articles.map((a) => <ArticleCard key={a.id} article={a} timezone={settings.timezone} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
