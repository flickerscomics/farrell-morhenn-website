import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ApplicationForm } from "@/components/forms/application-form";
import { Markdown, PageHero } from "@/components/ui";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/time";
import { issueFormToken } from "@/server/security";
import { getSettings } from "@/server/settings";

const getVacancy = cache((slug: string) =>
  prisma.vacancy.findFirst({
    where: { slug, status: { in: ["OPEN", "CLOSED"] } },
    select: {
      id: true, slug: true, title: true, department: true, employmentType: true, summary: true,
      description: true, responsibilities: true, requirements: true, status: true, closesAt: true,
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const v = await getVacancy((await params).slug);
  if (!v) return { title: "Vacancy not found" };
  return { title: `${v.title} — Careers`, description: v.summary, alternates: { canonical: `/careers/${v.slug}` } };
}

export default async function VacancyPage({ params }: { params: Promise<{ slug: string }> }) {
  const vacancy = await getVacancy((await params).slug);
  if (!vacancy) notFound();
  const settings = await getSettings();
  const open = vacancy.status === "OPEN" && (!vacancy.closesAt || vacancy.closesAt > new Date());

  return (
    <>
      <PageHero
        eyebrow={[vacancy.department, vacancy.employmentType].filter(Boolean).join(" · ") || "Vacancy"}
        title={vacancy.title}
        lead={vacancy.summary}
        crumbs={[{ label: "Careers", href: "/careers" }, { label: vacancy.title }]}
      />
      <section className="section-tight">
        <div className="container split split-even">
          <div>
            {vacancy.description && <Markdown>{vacancy.description}</Markdown>}
            {vacancy.responsibilities.length > 0 && (
              <>
                <h2 style={{ marginTop: "2rem" }}>Responsibilities</h2>
                <ul className="list-check">{vacancy.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
              </>
            )}
            {vacancy.requirements.length > 0 && (
              <>
                <h2 style={{ marginTop: "2rem" }}>Requirements</h2>
                <ul className="list-check">{vacancy.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
              </>
            )}
            <p className="small muted" style={{ marginTop: "2rem" }}>
              {vacancy.closesAt ? `Applications close ${formatDate(vacancy.closesAt, settings.timezone)}.` : "Open until filled."}
            </p>
          </div>
          <div>
            {open ? (
              <div className="card">
                <h2 style={{ fontSize: "1.4rem" }}>Apply for this position</h2>
                <ApplicationForm
                  token={issueFormToken("application")}
                  vacancy={{ id: vacancy.id, title: vacancy.title }}
                  contactMethods={settings.contactMethods}
                  maxUploadMb={Math.round(env.maxUploadBytes / 1024 / 1024)}
                />
              </div>
            ) : (
              <div className="notice notice-warn">
                <p>
                  This vacancy is closed and no longer accepting applications. See <Link href="/careers">current vacancies</Link> or
                  send a <Link href="/careers/apply">general application</Link>.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
