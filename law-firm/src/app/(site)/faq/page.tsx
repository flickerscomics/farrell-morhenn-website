import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { EmptyState, Markdown, PageHero, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about consultations, enquiries, appointments and careers at Calder Whitmore (fictional, GTA World roleplay).",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = strParam(sp.q, 80).trim();
  const category = strParam(sp.category, 80);

  const where: Prisma.FaqWhereInput = { isPublished: true, archivedAt: null, practiceAreaId: null };
  if (q) where.OR = [{ question: { contains: q, mode: "insensitive" } }, { answer: { contains: q, mode: "insensitive" } }];
  if (category) where.category = { slug: category };

  const [categories, faqs] = await Promise.all([
    prisma.faqCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true } }),
    prisma.faq.findMany({ where, orderBy: [{ sortOrder: "asc" }], select: { id: true, question: true, answer: true, categoryId: true } }),
  ]);
  const groups = [
    ...categories.map((c) => ({ ...c, items: faqs.filter((f) => f.categoryId === c.id) })),
    { id: "other", slug: "", name: "Other questions", items: faqs.filter((f) => !f.categoryId) },
  ].filter((g) => g.items.length);

  return (
    <>
      <PageHero
        eyebrow="Help"
        title="Frequently asked questions"
        lead="How consultations, enquiries and appointments work, and how to apply to join the firm."
        crumbs={[{ label: "FAQ" }]}
      />
      <section className="section-tight">
        <div className="container container-narrow">
          <nav className="chip-nav" aria-label="FAQ categories">
            <Link href="/faq" aria-current={!category ? "true" : undefined}>All</Link>
            {categories.map((c) => (
              <Link key={c.slug} href={`/faq?category=${c.slug}`} aria-current={category === c.slug ? "true" : undefined}>
                {c.name}
              </Link>
            ))}
          </nav>
          <form className="filters" method="get" role="search" aria-label="Search questions">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="field field-grow">
              <label className="label" htmlFor="q">Search questions</label>
              <input id="q" name="q" className="input" defaultValue={q} placeholder="e.g. appointment" />
            </div>
            <div className="row">
              <button className="btn btn-primary" type="submit">Search</button>
              {(q || category) && <Link href="/faq" className="btn btn-ghost">Clear</Link>}
            </div>
          </form>
          {groups.length === 0 ? (
            <EmptyState title="No questions match your search">
              <p>Try another keyword, or <Link href="/contact">contact the office</Link>.</p>
            </EmptyState>
          ) : (
            groups.map((g) => (
              <section key={g.id} style={{ marginBottom: "2.5rem" }} aria-labelledby={`cat-${g.id}`}>
                <h2 id={`cat-${g.id}`} style={{ fontSize: "1.35rem" }}>{g.name}</h2>
                <div className="faq-list">
                  {g.items.map((f) => (
                    <details key={f.id} className="faq-item" open={Boolean(q)}>
                      <summary>{f.question}</summary>
                      <div className="faq-answer">
                        <Markdown className="prose-sans">{f.answer}</Markdown>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))
          )}
          <div className="notice">
            <p>
              Still have a question? <Link href="/enquiry">Send an enquiry</Link> or call the office.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
