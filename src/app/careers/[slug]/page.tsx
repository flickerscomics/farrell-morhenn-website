import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HowToApply } from "@/components/how-to-apply";
import { Markdown, PageHero } from "@/components/ui";
import { absoluteUrl, openVacancies, vacancies, vacancy } from "@/lib/content";
import { formatDate } from "@/lib/time";

export const dynamicParams = false;

export function generateStaticParams() {
  return vacancies().map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const v = vacancy((await params).slug);
  if (!v) return {};
  return { title: `${v.title} — Careers`, description: v.summary, alternates: { canonical: absoluteUrl(`/careers/${v.slug}/`) } };
}

export default async function VacancyPage({ params }: { params: Promise<{ slug: string }> }) {
  const v = vacancy((await params).slug);
  if (!v) notFound();
  const open = openVacancies().some((o) => o.slug === v.slug);
  return (
    <>
      <PageHero
        eyebrow={[v.department, v.employmentType].filter(Boolean).join(" · ") || "Vacancy"}
        title={v.title}
        lead={v.summary}
        crumbs={[{ label: "Careers", href: "/careers" }, { label: v.title }]}
      />
      <section className="section-tight">
        <div className="container split split-even">
          <div>
            {v.description && <Markdown>{v.description}</Markdown>}
            {v.responsibilities.length > 0 && (
              <>
                <h2 style={{ marginTop: "2rem" }}>Responsibilities</h2>
                <ul className="list-check">{v.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
              </>
            )}
            {v.requirements.length > 0 && (
              <>
                <h2 style={{ marginTop: "2rem" }}>Requirements</h2>
                <ul className="list-check">{v.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
              </>
            )}
            <p className="small muted" style={{ marginTop: "2rem" }}>
              {v.closesOn ? `Applications close ${formatDate(v.closesOn)}.` : "Open until filled."}
            </p>
          </div>
          <div>
            {open ? (
              <HowToApply role={v.title} />
            ) : (
              <div className="notice notice-warn">
                <p>
                  This vacancy is closed and no longer accepting applications. See <Link href="/careers">current vacancies</Link>.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
