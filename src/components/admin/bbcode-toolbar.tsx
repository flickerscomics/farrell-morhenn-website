"use client";

// Formatting buttons for BBCode text boxes. Each button wraps the selected
// text in a tag (or inserts one), and "Image" uploads a picture and inserts it.

import { useRef, useState, type RefObject } from "react";
import { api, fileToBase64 } from "./api";

type Edit = (text: string, start: number, end: number) => { text: string; start: number; end: number };

function wrap(open: string, close: string, placeholder = ""): Edit {
  return (text, start, end) => {
    const inner = text.slice(start, end) || placeholder;
    const out = text.slice(0, start) + open + inner + close + text.slice(end);
    return { text: out, start: start + open.length, end: start + open.length + inner.length };
  };
}

/** Inserts after the cursor or selection, never replacing selected text. */
function insert(snippet: string): Edit {
  return (text, _start, end) => {
    const out = text.slice(0, end) + snippet + text.slice(end);
    return { text: out, start: end + snippet.length, end: end + snippet.length };
  };
}

/** Puts a block on its own line after the paragraph the cursor is in. */
function afterParagraph(block: string): Edit {
  return (text, _start, end) => {
    const next = text.indexOf("\n", end);
    const at = next === -1 ? text.length : next;
    const snippet = `\n\n${block}\n`;
    const out = text.slice(0, at) + snippet + text.slice(at);
    return { text: out, start: at + snippet.length, end: at + snippet.length };
  };
}

/** Turns the selected lines into list items. */
function list(numbered: boolean): Edit {
  return (text, start, end) => {
    const lines = (text.slice(start, end) || "First item\nSecond item").split("\n").filter((l) => l.trim());
    const block = `[list${numbered ? "=1" : ""}]\n${lines.map((l) => `[*]${l.trim()}`).join("\n")}\n[/list]`;
    const out = text.slice(0, start) + block + text.slice(end);
    return { text: out, start, end: start + block.length };
  };
}

const STYLE: Record<string, React.CSSProperties> = {
  Bold: { fontWeight: 800 },
  Italic: { fontStyle: "italic", fontFamily: "var(--font-serif)" },
  Underline: { textDecoration: "underline" },
  Strikethrough: { textDecoration: "line-through" },
};

export function BBCodeToolbar({
  target,
  value,
  onChange,
  upload,
}: {
  target: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  /** Where pictures for this text are uploaded; without it there's no Image button. */
  upload?: { section: string; field: string };
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  function apply(edit: Edit) {
    const el = target.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const r = edit(value, start, end);
    onChange(r.text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(r.start, r.end);
    });
  }

  function link() {
    const url = window.prompt("Link to (a web address starting with https://, or a page on this site such as /contact):", "https://");
    if (!url || url === "https://") return;
    apply(wrap(`[url=${url.trim()}]`, "[/url]", "link text"));
  }

  async function image(file: File | undefined) {
    if (!file || !upload) return;
    if (file.size > 3 * 1024 * 1024) {
      setStatus("Images can be up to 3 MB.");
      return;
    }
    const description = window.prompt("Briefly describe the picture (read out to people using screen readers):", "") ?? "";
    setStatus("Uploading…");
    try {
      const r = await api<{ path: string }>("POST", "upload", { ...upload, name: file.name, data: await fileToBase64(file) });
      apply(afterParagraph(`[img=${description.replace(/[\]\n]/g, " ").trim()}]${r.path}[/img]`));
      setStatus("Image added. It appears on the website once you save.");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const buttons: [string, string, () => void][] = [
    ["B", "Bold", () => apply(wrap("[b]", "[/b]", "bold text"))],
    ["I", "Italic", () => apply(wrap("[i]", "[/i]", "italic text"))],
    ["U", "Underline", () => apply(wrap("[u]", "[/u]", "underlined text"))],
    ["S", "Strikethrough", () => apply(wrap("[s]", "[/s]", "struck-out text"))],
    ["H", "Heading", () => apply(wrap("\n[h2]", "[/h2]\n", "Heading"))],
    ["h", "Subheading", () => apply(wrap("\n[h3]", "[/h3]\n", "Subheading"))],
    ["Link", "Link", link],
    ["“ ”", "Quote", () => apply(wrap("\n[quote=Name, Title]", "[/quote]\n", "Quoted words"))],
    ["• List", "Bulleted list", () => apply(list(false))],
    ["1. List", "Numbered list", () => apply(list(true))],
    ["Centre", "Centre", () => apply(wrap("[center]", "[/center]", "centred text"))],
    ["—", "Divider line", () => apply(insert("\n[hr]\n"))],
  ];

  return (
    <div className="bb-toolbar" role="toolbar" aria-label="Formatting">
      {buttons.map(([text, label, run]) => (
        <button key={label} type="button" className="btn btn-ghost btn-sm" title={label} aria-label={label} onClick={run}>
          <span aria-hidden="true" style={STYLE[label]}>{text}</span>
        </button>
      ))}
      {upload && (
        <>
          <button type="button" className="btn btn-ghost btn-sm" title="Insert image" onClick={() => fileInput.current?.click()}>
            Image
          </button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => void image(e.target.files?.[0])} />
        </>
      )}
      {status && <span className="small muted" role="status">{status}</span>}
    </div>
  );
}

/** Ctrl/Cmd+B and Ctrl/Cmd+I in a BBCode text box. */
export function bbcodeShortcut(e: React.KeyboardEvent<HTMLTextAreaElement>, value: string, onChange: (v: string) => void) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const tag = e.key.toLowerCase() === "b" ? "b" : e.key.toLowerCase() === "i" ? "i" : e.key.toLowerCase() === "u" ? "u" : null;
  if (!tag) return;
  e.preventDefault();
  const el = e.currentTarget;
  const r = wrap(`[${tag}]`, `[/${tag}]`)(value, el.selectionStart, el.selectionEnd);
  onChange(r.text);
  requestAnimationFrame(() => el.setSelectionRange(r.start, r.end));
}
