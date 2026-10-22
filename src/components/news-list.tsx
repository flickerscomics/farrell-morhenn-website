"use client";

import type { Article } from "@/lib/types";
import { ARTICLE_TYPE_LABELS } from "@/lib/labels";
import { ArticleCard } from "./cards";
import { EmptyState } from "./ui";
import { matches, useUrlFilters } from "./use-url-filters";

export function NewsList({ articles, categories }: { articles: Article[]; categories: { slug: string; name: string }[] }) {
  const { values, update, clear, active } = useUrlFilters(["q", "type", "category", "tag"] as const);
  const used = categories.filter((c) => articles.some((a) => a.category === c.slug));
  const shown = articles.filter(
    (a) =>
      (!values.q || matches(`${a.title} ${a.summary} ${a.body}`, values.q)) &&
      (!values.type || a.type === values.type) &&
      (!values.category || a.category === values.category) &&
      (!values.tag || a.tags.includes(values.tag)),
  );

  return (
    <>
      <nav className="chip-nav" aria-label="Article categories">
        <a
          href="#"
          aria-current={!values.category ? "true" : undefined}
          onClick={(e) => {
            e.preventDefault();
            update({ category: "" });
          }}
        >
          All
        </a>
        {used.map((c) => (
          <a
            key={c.slug}
            href={`?category=${c.slug}`}
            aria-current={values.category === c.slug ? "true" : undefined}
            onClick={(e) => {
              e.preventDefault();
              update({ category: c.slug });
            }}
          >
            {c.name}
          </a>
        ))}
      </nav>
      <form className="filters" role="search" aria-label="Search articles" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-grow">
          <label className="label" htmlFor="q">Search articles</label>
          <input id="q" className="input" value={values.q} onChange={(e) => update({ q: e.target.value })} placeholder="Keyword" />
        </div>
        <div className="field">
          <label className="label" htmlFor="type">Type</label>
          <select id="type" className="select" value={values.type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">All types</option>
            {Object.entries(ARTICLE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {values.tag && (
          <div className="field">
            <span className="label">Tag</span>
            <span className="tag">#{values.tag}</span>
          </div>
        )}
        {active && (
          <button type="button" className="btn btn-ghost" onClick={clear}>
            Clear filters
          </button>
        )}
      </form>
      <p className="small muted" aria-live="polite">
        {shown.length} {shown.length === 1 ? "article" : "articles"}
      </p>
      {shown.length === 0 ? (
        <EmptyState title="No articles match your search">
          <p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={clear}>Show all articles</button>
          </p>
        </EmptyState>
      ) : (
        <div className="grid grid-3">
          {shown.map((a) => <ArticleCard key={a.slug} article={a} />)}
        </div>
      )}
    </>
  );
}
