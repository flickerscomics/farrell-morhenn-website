// BBCode for press releases. Text is parsed into a tree of whitelisted tags;
// anything not on the list stays as plain text. Nothing here produces HTML
// strings: the tree is rendered as React elements (components/bbcode.tsx),
// so typed markup can never become live HTML or script.

export type BBNode = { type: "text"; text: string } | BBTag;
export type BBTag = { type: "tag"; name: TagName; attr: string; children: BBNode[] };

const INLINE = ["b", "i", "u", "s", "color", "size", "url", "email", "img"] as const;
const BLOCK = ["h2", "h3", "quote", "list", "center", "right", "table", "hr"] as const;
const STRUCTURE = ["*", "tr", "td", "th"] as const;
export type TagName = (typeof INLINE)[number] | (typeof BLOCK)[number] | (typeof STRUCTURE)[number];

const KNOWN = new Set<string>([...INLINE, ...BLOCK, ...STRUCTURE, "noparse"]);
const BLOCK_SET = new Set<string>(BLOCK);
/** Tags whose content is a flow of paragraphs and blocks. */
const CONTAINERS = new Set<string>(["root", "quote", "center", "right", "*", "td", "th"]);

/** Colours and sizes are named presets so a release can't clash with the site's design. */
export const BB_COLORS = ["navy", "gold", "red", "green", "grey"] as const;
export const BB_SIZES = ["small", "large", "x-large"] as const;

const TOKEN = /\[(\/?)([a-z0-9*]+)(?:=("[^"\]]*"|[^\]]*))?\]/gi;

type Frame = { name: TagName | "root"; attr: string; children: BBNode[] };

export function parseBBCode(source: string): BBNode[] {
  const root: Frame = { name: "root", attr: "", children: [] };
  const stack: Frame[] = [root];
  const top = () => stack[stack.length - 1];
  const text = (t: string) => {
    if (!t) return;
    const kids = top().children;
    const last = kids[kids.length - 1];
    if (last?.type === "text") last.text += t;
    else kids.push({ type: "text", text: t });
  };
  const closeTo = (index: number) => {
    while (stack.length > index) {
      const f = stack.pop()!;
      top().children.push({ type: "tag", name: f.name as TagName, attr: f.attr, children: f.children });
    }
  };
  const find = (...names: string[]) => {
    for (let i = stack.length - 1; i > 0; i--) if (names.includes(stack[i].name)) return i;
    return -1;
  };
  /** Content up to the matching close tag, taken literally. */
  const raw = (name: string, from: number) => {
    const end = source.toLowerCase().indexOf(`[/${name}]`, from);
    return end === -1 ? { content: source.slice(from), next: source.length } : { content: source.slice(from, end), next: end + name.length + 3 };
  };

  let pos = 0;
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(source); m; m = TOKEN.exec(source)) {
    const [whole, slash, rawName, rawAttr] = m;
    const name = rawName.toLowerCase();
    if (!KNOWN.has(name)) continue; // unknown tags stay in the text
    text(source.slice(pos, m.index));
    pos = m.index + whole.length;
    const attr = (rawAttr ?? "").replace(/^"|"$/g, "").trim();

    if (slash) {
      const at = find(name);
      if (at === -1) text(whole);
      else closeTo(at);
      continue;
    }

    if (name === "noparse" || name === "img") {
      const { content, next } = raw(name, pos);
      if (name === "noparse") text(content);
      else top().children.push({ type: "tag", name: "img", attr, children: [{ type: "text", text: content.trim() }] });
      pos = TOKEN.lastIndex = next;
      continue;
    }

    if (name === "*" || name === "tr" || name === "td" || name === "th") {
      const parent = { "*": ["list"], tr: ["table"], td: ["tr"], th: ["tr"] }[name];
      const at = find(...parent);
      if (at === -1) {
        text(whole);
        continue;
      }
      closeTo(at + 1); // ends the previous item, row or cell
    } else if (BLOCK_SET.has(name)) {
      // A block can't sit inside inline formatting or a heading: close those first.
      while (!CONTAINERS.has(top().name)) closeTo(stack.length - 1);
    }

    if (name === "hr") top().children.push({ type: "tag", name: "hr", attr: "", children: [] });
    else stack.push({ name: name as TagName, attr, children: [] });
  }
  text(source.slice(pos));
  closeTo(1);
  return root.children;
}

// ─── Attribute checks shared by the renderer ────────────────────────────────

/** Allows web links, email links and links to pages on this site. Anything else (javascript:, data: …) is refused. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^https?:\/\/[^\s"<>]+$/i.test(h)) return h;
  if (/^mailto:[^\s"<>]+@[^\s"<>]+$/i.test(h)) return h;
  if (/^\/(?!\/)[^\s"<>]*$/.test(h)) return h;
  return null;
}

export function safeEmail(email: string): string | null {
  const e = email.trim();
  return /^[^\s@"<>[\]]+@[^\s@"<>[\]]+\.[a-z]{2,}$/i.test(e) ? e : null;
}

/** Only images uploaded to the site (under /images/) may be embedded. */
export function safeImage(src: string): string | null {
  const s = src.trim();
  return /^\/images\/[a-z0-9/_.-]+\.(?:jpe?g|png|webp|gif)$/i.test(s) && !s.includes("..") ? s : null;
}

export function colorOf(attr: string) {
  const c = attr.toLowerCase() === "gray" ? "grey" : attr.toLowerCase();
  return (BB_COLORS as readonly string[]).includes(c) ? c : null;
}

export function sizeOf(attr: string) {
  const s = attr.toLowerCase();
  return (BB_SIZES as readonly string[]).includes(s) ? s : null;
}

export function listStyleOf(attr: string): "1" | "a" | "i" | null {
  const a = attr.trim();
  return a === "1" || a === "a" || a === "i" ? a : null;
}

// ─── Plain text ─────────────────────────────────────────────────────────────

/** The words of a BBCode text without its tags, for search, summaries and feeds. */
export function bbcodeToText(source: string): string {
  const walk = (nodes: BBNode[]): string =>
    nodes
      .map((n) => {
        if (n.type === "text") return n.text;
        if (n.name === "img") return "";
        if (n.name === "hr") return "\n";
        const inner = walk(n.children);
        return BLOCK_SET.has(n.name) || n.name === "*" || n.name === "tr" ? `\n${inner}\n` : n.name === "td" || n.name === "th" ? ` ${inner} ` : inner;
      })
      .join("");
  return walk(parseBBCode(source))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n+/g, "\n")
    .trim();
}

/** Tag reference shown to editors. */
export const BBCODE_HELP: { code: string; result: string }[] = [
  { code: "[b]bold[/b]  [i]italic[/i]  [u]underline[/u]  [s]strike[/s]", result: "Text styles" },
  { code: "[h2]Heading[/h2]  [h3]Subheading[/h3]", result: "Headings" },
  { code: "[url=https://example.com]link text[/url]  [url=/contact]a page on this site[/url]", result: "Links" },
  { code: "[email]press@farrellmorhennlaw.com[/email]", result: "Email link" },
  { code: "[quote=Name, Title]Quoted words[/quote]", result: "Quotation" },
  { code: "[list][*]First[*]Second[/list]  [list=1]…[/list]", result: "Bulleted / numbered list" },
  { code: "[center]…[/center]  [right]…[/right]", result: "Alignment" },
  { code: "[color=gold]…[/color]  (navy, gold, red, green, grey)", result: "Colour" },
  { code: "[size=large]…[/size]  (small, large, x-large)", result: "Size" },
  { code: "[img=Description]/images/press/photo.jpg[/img]", result: "Uploaded image" },
  { code: "[table][tr][th]Heading[/th][/tr][tr][td]Cell[/td][/tr][/table]", result: "Table" },
  { code: "[hr]", result: "Divider line" },
  { code: "[noparse][b]shown as typed[/b][/noparse]", result: "Show BBCode literally" },
];
