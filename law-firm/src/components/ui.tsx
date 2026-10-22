import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { ReactNode } from "react";
import { statusTone } from "@/lib/labels";
import { WEEKDAY_NAMES, type OfficeHours, zonedParts } from "@/lib/time";

/** Renders trusted-format Markdown safely: raw HTML is never rendered. */
export function Markdown({ children, className = "prose" }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children: c }) => {
            const external = !!href && /^https?:\/\//.test(href);
            return (
              <a href={href} {...(external ? { rel: "noopener noreferrer nofollow", target: "_blank" } : {})}>
                {c}
              </a>
            );
          },
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`badge badge-${statusTone(status)}`}>{label ?? status.replace(/_/g, " ").toLowerCase()}</span>;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  crumbs?: { label: string; href?: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="container">
        {crumbs && <Breadcrumbs items={[{ label: "Home", href: "/" }, ...crumbs]} />}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Portrait({
  name,
  portraitId,
  className = "portrait",
}: {
  name: string;
  portraitId?: string | null;
  className?: string;
}) {
  if (portraitId) {
    return <img src={`/media/${portraitId}`} alt={`Portrait of ${name}`} className={className} loading="lazy" />;
  }
  return (
    <div className={`portrait-placeholder ${className}`} role="img" aria-label={`${name} (no portrait)`}>
      <span aria-hidden="true">{initials(name)}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state" role="status">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function OfficeHoursTable({ hours, timezone }: { hours: OfficeHours; timezone: string }) {
  const today = zonedParts(new Date(), timezone).weekday;
  // Start the week on Monday for display.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <table className="hours-table">
      <caption className="sr-only">Office hours ({timezone})</caption>
      <tbody>
        {order.map((d) => (
          <tr key={d} className={d === today ? "today" : undefined}>
            <th scope="row">
              {WEEKDAY_NAMES[d]}
              {d === today && <span className="sr-only"> (today)</span>}
            </th>
            <td>{hours[d].closed ? "Closed" : `${hours[d].open} – ${hours[d].close}`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Builds pagination links preserving the current query string. */
export function Pagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>
        Page {page} of {pageCount}
      </span>
      <span className="row">
        {page > 1 ? (
          <Link className="btn btn-secondary btn-sm" href={href(page - 1)} rel="prev">
            ← Previous
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm" aria-disabled="true">
            ← Previous
          </span>
        )}
        {page < pageCount ? (
          <Link className="btn btn-secondary btn-sm" href={href(page + 1)} rel="next">
            Next →
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm" aria-disabled="true">
            Next →
          </span>
        )}
      </span>
    </nav>
  );
}

export function pageParam(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}

export function strParam(value: string | string[] | undefined, max = 100) {
  const v = Array.isArray(value) ? value[0] : value;
  return (v ?? "").slice(0, max);
}
