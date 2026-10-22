import Link from "next/link";
import type { ReactNode } from "react";
import { asset } from "@/lib/env";
import { colorOf, listStyleOf, parseBBCode, safeEmail, safeHref, safeImage, sizeOf, type BBNode, type BBTag } from "@/lib/bbcode";

/**
 * Renders BBCode as page content. Blank lines start a new paragraph and single
 * line breaks are kept. Links, images, colours and sizes that fail their checks
 * are shown as plain text, so a mistake is visible in the preview rather than
 * silently producing something unsafe.
 */
export function BBCode({ children, className = "prose bbcode" }: { children: string; className?: string }) {
  return <div className={className}>{flow(parseBBCode(children), "r")}</div>;
}

const BLOCKS = new Set(["h2", "h3", "quote", "list", "center", "right", "table", "hr"]);

/** Groups inline content into paragraphs between block elements. */
function flow(nodes: BBNode[], key: string, bare = false): ReactNode[] {
  const out: ReactNode[] = [];
  let para: BBNode[] = [];
  const flush = () => {
    const trimmed = trimNewlines(para);
    para = [];
    if (trimmed.length === 0) return;
    const k = `${key}-p${out.length}`;
    out.push(bare ? <span key={k}>{inline(trimmed, k)}</span> : <p key={k}>{inline(trimmed, k)}</p>);
  };
  for (const n of nodes) {
    if (n.type === "text") {
      const parts = n.text.split(/\n[ \t]*\n\s*/);
      parts.forEach((t, i) => {
        if (i > 0) flush();
        if (t) para.push({ type: "text", text: t });
      });
    } else if (BLOCKS.has(n.name)) {
      flush();
      out.push(block(n, `${key}-b${out.length}`));
    } else {
      para.push(n);
    }
  }
  flush();
  return out;
}

/** A list item or table cell holding a single paragraph doesn't need a <p>. */
function cellFlow(nodes: BBNode[], key: string) {
  const blocks = nodes.some((n) => n.type === "tag" && BLOCKS.has(n.name));
  const paragraphs = nodes.some((n) => n.type === "text" && /\n[ \t]*\n/.test(n.text.trim()));
  if (paragraphs) return flow(nodes, key);
  return blocks ? flow(nodes, key, true) : inline(trimNewlines(nodes), key);
}

function trimNewlines(nodes: BBNode[]): BBNode[] {
  const copy = nodes.map((n) => (n.type === "text" ? { ...n } : n));
  const first = copy[0];
  if (first?.type === "text") first.text = first.text.replace(/^\s+/, "");
  const last = copy[copy.length - 1];
  if (last?.type === "text") last.text = last.text.replace(/\s+$/, "");
  return copy.filter((n) => n.type !== "text" || n.text !== "");
}

function block(n: BBTag, key: string): ReactNode {
  switch (n.name) {
    case "h2":
      return <h2 key={key}>{inline(trimNewlines(n.children), key)}</h2>;
    case "h3":
      return <h3 key={key}>{inline(trimNewlines(n.children), key)}</h3>;
    case "hr":
      return <hr key={key} />;
    case "center":
      return <div key={key} className="bb-center">{flow(n.children, key)}</div>;
    case "right":
      return <div key={key} className="bb-right">{flow(n.children, key)}</div>;
    case "quote":
      return (
        <figure key={key} className="bb-quote">
          <blockquote>{flow(n.children, key)}</blockquote>
          {n.attr && <figcaption>{n.attr}</figcaption>}
        </figure>
      );
    case "list": {
      const style = listStyleOf(n.attr);
      const lis = itemsOf(n.children, "*").map((item, i) => <li key={i}>{cellFlow(item.children, `${key}-${i}`)}</li>);
      return style ? <ol key={key} type={style}>{lis}</ol> : <ul key={key}>{lis}</ul>;
    }
    case "table":
      return (
        <div key={key} className="bb-table">
          <table>
            <tbody>
              {itemsOf(n.children, "tr").map((row, r) => (
                <tr key={r}>
                  {itemsOf(row.children, "td", "th").map((cell, c) => {
                    const Cell = cell.name === "th" ? "th" : "td";
                    return <Cell key={c}>{cellFlow(cell.children, `${key}-${r}-${c}`)}</Cell>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

/**
 * Children of a list or table as items. Content outside an item (other than
 * blank space) becomes an item of its own rather than disappearing.
 */
function itemsOf(nodes: BBNode[], ...names: string[]): { name: string; children: BBNode[] }[] {
  const items: { name: string; children: BBNode[] }[] = [];
  for (const n of nodes) {
    if (n.type === "tag" && names.includes(n.name)) items.push({ name: n.name, children: n.children });
    else if (n.type === "text" && !n.text.trim()) continue;
    else items.push({ name: names[0], children: [n] });
  }
  return items;
}

function inline(nodes: BBNode[], key: string): ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}-${i}`;
    if (n.type === "text") return lines(n.text, k);
    const kids = () => inline(n.children, k);
    switch (n.name) {
      case "b":
        return <strong key={k}>{kids()}</strong>;
      case "i":
        return <em key={k}>{kids()}</em>;
      case "u":
        return <u key={k}>{kids()}</u>;
      case "s":
        return <s key={k}>{kids()}</s>;
      case "color": {
        const c = colorOf(n.attr);
        return c ? <span key={k} className={`bb-color-${c}`}>{kids()}</span> : <span key={k}>{kids()}</span>;
      }
      case "size": {
        const s = sizeOf(n.attr);
        return s ? <span key={k} className={`bb-size-${s}`}>{kids()}</span> : <span key={k}>{kids()}</span>;
      }
      case "url": {
        const href = safeHref(n.attr || textOf(n.children));
        if (!href) return <span key={k}>{kids()}</span>;
        if (href.startsWith("/")) return <Link key={k} href={href}>{kids()}</Link>;
        const external = /^https?:/i.test(href);
        return (
          <a key={k} href={href} {...(external ? { rel: "noopener noreferrer nofollow", target: "_blank" } : {})}>
            {kids()}
          </a>
        );
      }
      case "email": {
        const email = safeEmail(n.attr || textOf(n.children));
        return email ? <a key={k} href={`mailto:${email}`}>{kids()}</a> : <span key={k}>{kids()}</span>;
      }
      case "img": {
        const src = safeImage(textOf(n.children));
        if (!src) return <span key={k}>{`[image: ${textOf(n.children)}]`}</span>;
        return <img key={k} src={asset(src)} alt={n.attr} loading="lazy" className="bb-img" />;
      }
      default:
        // Structural tags out of place, or a block that slipped through, render their content.
        return <span key={k}>{kids()}</span>;
    }
  });
}

function lines(text: string, key: string): ReactNode {
  const parts = text.split("\n");
  if (parts.length === 1) return text;
  return parts.flatMap((p, i) => (i === 0 ? [p] : [<br key={`${key}-br${i}`} />, p]));
}

function textOf(nodes: BBNode[]): string {
  return nodes.map((n) => (n.type === "text" ? n.text : textOf(n.children))).join("");
}
