import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { ReactNode } from "react";
import { asset } from "@/lib/env";
import { WEEKDAY_NAMES, type OfficeHours } from "@/lib/time";

/** Renders Markdown safely: raw HTML is never rendered and images are ignored. */
export function Markdown({ children, className = "prose" }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children: c }) => {
            if (href?.startsWith("/")) return <Link href={href}>{c}</Link>;
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

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={i}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>
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

export function Portrait({ name, src, className = "portrait" }: { name: string; src?: string; className?: string }) {
  if (src) return <img src={asset(src)} alt={`Portrait of ${name}`} className={className} loading="lazy" />;
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
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday first
  return (
    <table className="hours-table">
      <caption className="sr-only">Office hours ({timezone})</caption>
      <tbody>
        {order.map((d) => (
          <tr key={d}>
            <th scope="row">{WEEKDAY_NAMES[d]}</th>
            <td>{hours[d].closed ? "Closed" : `${hours[d].open} – ${hours[d].close}`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Explains how to reach the firm. Used wherever the full app had a form. */
export function ContactOptions({ methods, intro }: { methods: string[]; intro?: string }) {
  return (
    <div className="card">
      {intro && <p>{intro}</p>}
      <ul className="list-check">
        {methods.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
