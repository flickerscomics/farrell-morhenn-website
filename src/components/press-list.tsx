"use client";

import type { Category, PressListItem } from "@/lib/types";
import { PressCard } from "./cards";
import { EmptyState } from "./ui";
import { matches, useUrlFilters } from "./use-url-filters";

export function PressList({ releases, categories }: { releases: PressListItem[]; categories: Category[] }) {
  const { values, update, clear, active } = useUrlFilters(["q", "year", "category", "tag"] as const);
  const years = [...new Set(releases.map((r) => r.releaseDate.slice(0, 4)))];
  const used = categories.filter((c) => releases.some((r) => r.category === c.slug));
  const featured = releases.find((r) => r.isFeatured);
  const shown = releases.filter(
    (r) =>
      (!values.q || matches(r.searchText, values.q)) &&
      (!values.year || r.releaseDate.startsWith(values.year)) &&
      (!values.category || r.category === values.category) &&
      (!values.tag || r.tags.includes(values.tag)),
  );
  const list = active || !featured ? shown : shown.filter((r) => r !== featured);

  return (
    <>
      <form className="filters" role="search" aria-label="Search press releases" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-grow">
          <label className="label" htmlFor="q">Search press releases</label>
          <input id="q" className="input" value={values.q} onChange={(e) => update({ q: e.target.value })} placeholder="Keyword" />
        </div>
        <div className="field">
          <label className="label" htmlFor="year">Year</label>
          <select id="year" className="select" value={values.year} onChange={(e) => update({ year: e.target.value })}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="category">Category</label>
          <select id="category" className="select" value={values.category} onChange={(e) => update({ category: e.target.value })}>
            <option value="">All categories</option>
            {used.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
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
      {!active && featured && (
        <div style={{ marginBottom: "1.5rem" }}>
          <PressCard release={featured} featured />
        </div>
      )}
      <p className="small muted" aria-live="polite">
        {shown.length} {shown.length === 1 ? "press release" : "press releases"}
      </p>
      {releases.length === 0 ? (
        <EmptyState title="No press releases yet">
          <p>Please check back soon.</p>
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState title="No press releases match your search">
          <p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={clear}>Show all press releases</button>
          </p>
        </EmptyState>
      ) : (
        <div className="press-list">
          {list.map((r) => (
            <PressCard key={r.slug} release={r} />
          ))}
        </div>
      )}
    </>
  );
}
