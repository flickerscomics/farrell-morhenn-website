"use client";

import Link from "next/link";
import type { Faq } from "../../content/types";
import { EmptyState, Markdown } from "./ui";
import { matches, useUrlFilters } from "./use-url-filters";

export function FaqList({ faqs, categories }: { faqs: Faq[]; categories: { slug: string; name: string }[] }) {
  const { values, update, clear, active } = useUrlFilters(["q", "category"] as const);
  const shown = faqs.filter((f) => (!values.q || matches(`${f.question} ${f.answer}`, values.q)) && (!values.category || f.category === values.category));
  const groups = categories.map((c) => ({ ...c, items: shown.filter((f) => f.category === c.slug) })).filter((g) => g.items.length);

  return (
    <>
      <nav className="chip-nav" aria-label="FAQ categories">
        <a href="#" aria-current={!values.category ? "true" : undefined} onClick={(e) => { e.preventDefault(); update({ category: "" }); }}>
          All
        </a>
        {categories.map((c) => (
          <a
            key={c.slug}
            href={`?category=${c.slug}`}
            aria-current={values.category === c.slug ? "true" : undefined}
            onClick={(e) => { e.preventDefault(); update({ category: c.slug }); }}
          >
            {c.name}
          </a>
        ))}
      </nav>
      <form className="filters" role="search" aria-label="Search questions" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-grow">
          <label className="label" htmlFor="q">Search questions</label>
          <input id="q" className="input" value={values.q} onChange={(e) => update({ q: e.target.value })} placeholder="e.g. appointment" />
        </div>
        {active && <button type="button" className="btn btn-ghost" onClick={clear}>Clear</button>}
      </form>
      {groups.length === 0 ? (
        <EmptyState title="No questions match your search">
          <p>Try another keyword, or <Link href="/contact">contact the office</Link>.</p>
        </EmptyState>
      ) : (
        groups.map((g) => (
          <section key={g.slug} style={{ marginBottom: "2.5rem" }} aria-labelledby={`cat-${g.slug}`}>
            <h2 id={`cat-${g.slug}`} style={{ fontSize: "1.35rem" }}>{g.name}</h2>
            <div className="faq-list">
              {g.items.map((f) => (
                <details key={f.question} className="faq-item" open={Boolean(values.q)}>
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
    </>
  );
}
