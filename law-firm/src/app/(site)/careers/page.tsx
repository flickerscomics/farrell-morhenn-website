import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Markdown, PageHero } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/time";
import { getPage } from "@/server/public";
import { getSettings } from "@/server/settings";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("careers");
  return { title: "Careers", description: page?.metaDescription || page?.summary, alternates: { canonical: "/careers" } };
}

export default async function CareersPage() {
  const now = new Date();
  const [page, settings, vacancies] = await Promise.all([
    getPage("careers"),
    getSettings(),
    prisma.vacancy.findMany({
      where: { status: "OPEN", OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      select: { slug: true, title: true, department: true, employmentType: true, summary: true, closesAt: true },
    }),
  ]);
  return (
    <>
      <PageHero eyebrow="Careers" title={page?.title ?? "Careers"} lead={page?.summary} crumbs={[{ label: "Careers" }]} />
      <section className="section-tight">
        <div className="container split">
          <div>
            <p className="eyebrow">Working here</p>
            <h2>Why join us</h2>
          </div>
          {page?.body && <Markdown>{page.body}</Markdown>}
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Current vacancies</p>
              <h2>Open positions</h2>
            </div>
            <Link href="/careers/apply" className="link-arrow">Send a general application</Link>
          </div>
          {vacancies.length === 0 ? (
            <EmptyState title="There are no open vacancies right now">
              <p>We still welcome <Link href="/careers/apply">general applications</Link>.</p>
            </EmptyState>
          ) : (
            <div className="grid grid-2">
              {vacancies.map((v) => (
                <Link key={v.slug} href={`/careers/${v.slug}`} className="card card-link">
                  <div className="meta-line" style={{ marginBottom: "0.5rem" }}>
                    {v.department && <span className="kind">{v.department}</span>}
                    {v.employmentType && <span>{v.employmentType}</span>}
                  </div>
                  <h3>{v.title}</h3>
                  <p className="muted" style={{ flexGrow: 1 }}>{v.summary}</p>
                  <span className="small">
                    {v.closesAt ? `Applications close ${formatDate(v.closesAt, settings.timezone)}` : "Open until filled"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section-tight">
        <div className="container">
          <div className="notice">
            <p>
              Positions are in-character roles within the GTA World roleplay community. Every application receives a
              reference number and is reviewed by a partner.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
