import type { Metadata } from "next";
import Link from "next/link";
import { HowToApply } from "@/components/how-to-apply";
import { EmptyState, Markdown, PageHero } from "@/components/ui";
import { absoluteUrl, openVacancies, page } from "@/lib/content";
import { formatDate } from "@/lib/time";

const careers = page("careers");

export const metadata: Metadata = {
  title: "Careers",
  description: careers.metaDescription || careers.summary,
  alternates: { canonical: absoluteUrl("/careers/") },
};

export default function CareersPage() {
  const open = openVacancies();
  return (
    <>
      <PageHero eyebrow="Careers" title={careers.title} lead={careers.summary} crumbs={[{ label: "Careers" }]} />
      <section className="section-tight">
        <div className="container split">
          <div>
            <p className="eyebrow">Working here</p>
            <h2>Why join us</h2>
          </div>
          <Markdown>{careers.body}</Markdown>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Current vacancies</p>
              <h2>Open positions</h2>
            </div>
          </div>
          {open.length === 0 ? (
            <EmptyState title="There are no open vacancies right now">
              <p>We still welcome general applications (see below).</p>
            </EmptyState>
          ) : (
            <div className="grid grid-2">
              {open.map((v) => (
                <Link key={v.slug} href={`/careers/${v.slug}`} className="card card-link">
                  <div className="meta-line" style={{ marginBottom: "0.5rem" }}>
                    {v.department && <span className="kind">{v.department}</span>}
                    {v.employmentType && <span>{v.employmentType}</span>}
                  </div>
                  <h3>{v.title}</h3>
                  <p className="muted" style={{ flexGrow: 1 }}>{v.summary}</p>
                  <span className="small">{v.closesOn ? `Applications close ${formatDate(v.closesOn)}` : "Open until filled"}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section-tight">
        <div className="container container-narrow">
          <HowToApply />
          <p className="small muted" style={{ marginTop: "1rem" }}>
            Positions are in-character roles within the GTA World roleplay community.
          </p>
        </div>
      </section>
    </>
  );
}
