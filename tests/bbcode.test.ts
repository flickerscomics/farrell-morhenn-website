import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BBCode } from "@/components/bbcode";
import { bbcodeToText, parseBBCode, safeHref } from "@/lib/bbcode";

const html = (source: string) => renderToStaticMarkup(BBCode({ className: "x", children: source })).replace(/^<div class="x">|<\/div>$/g, "");

describe("BBCode formatting", () => {
  it("formats text styles", () => {
    expect(html("[b]bold[/b] [i]italic[/i] [u]under[/u] [s]gone[/s]")).toBe(
      "<p><strong>bold</strong> <em>italic</em> <u>under</u> <s>gone</s></p>",
    );
  });

  it("is case-insensitive and nests", () => {
    expect(html("[B]a [I]b[/i][/B]")).toBe("<p><strong>a <em>b</em></strong></p>");
  });

  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(html("one\ntwo\n\nthree")).toBe("<p>one<br/>two</p><p>three</p>");
  });

  it("renders headings, quotes, alignment and dividers as blocks", () => {
    expect(html("intro\n[h2]Title[/h2]\nbody")).toBe("<p>intro</p><h2>Title</h2><p>body</p>");
    expect(html("[quote=Jane Doe, Partner]Words[/quote]")).toBe(
      '<figure class="bb-quote"><blockquote><p>Words</p></blockquote><figcaption>Jane Doe, Partner</figcaption></figure>',
    );
    expect(html("[center]Mid[/center][right]End[/right]")).toBe('<div class="bb-center"><p>Mid</p></div><div class="bb-right"><p>End</p></div>');
    expect(html("a[hr]b")).toBe("<p>a</p><hr/><p>b</p>");
  });

  it("builds bulleted, numbered and nested lists", () => {
    expect(html("[list]\n[*]One\n[*][b]Two[/b]\n[/list]")).toBe("<ul><li>One</li><li><strong>Two</strong></li></ul>");
    expect(html("[list=1][*]A[*]B[/list]")).toBe('<ol type="1"><li>A</li><li>B</li></ol>');
    expect(html("[list][*]A[list][*]A1[/list][*]B[/list]")).toBe("<ul><li><span>A</span><ul><li>A1</li></ul></li><li>B</li></ul>");
  });

  it("builds tables with header cells", () => {
    expect(html("[table][tr][th]H[/th][/tr][tr][td]C[/td][/tr][/table]")).toBe(
      '<div class="bb-table"><table><tbody><tr><th>H</th></tr><tr><td>C</td></tr></tbody></table></div>',
    );
  });

  it("allows only preset colours and sizes", () => {
    expect(html("[color=gold]g[/color][size=large]L[/size]")).toBe('<p><span class="bb-color-gold">g</span><span class="bb-size-large">L</span></p>');
    expect(html("[color=#ff0000]x[/color][size=99]y[/size]")).toBe("<p><span>x</span><span>y</span></p>");
  });

  it("links to web pages, email addresses and pages on this site", () => {
    expect(html("[url=https://example.com]site[/url]")).toBe(
      '<p><a href="https://example.com" rel="noopener noreferrer nofollow" target="_blank">site</a></p>',
    );
    expect(html("[url]https://example.com/a[/url]")).toContain('href="https://example.com/a"');
    expect(html("[url=/contact]Contact[/url]")).toBe('<p><a href="/contact">Contact</a></p>');
    expect(html("[email]press@example.com[/email]")).toBe('<p><a href="mailto:press@example.com">press@example.com</a></p>');
  });

  it("embeds only images uploaded to the site", () => {
    expect(html("[img=Team photo]/images/press/team.jpg[/img]")).toBe(
      '<p><img src="/images/press/team.jpg" alt="Team photo" loading="lazy" class="bb-img"/></p>',
    );
    expect(html("[img]https://evil.example/x.png[/img]")).toBe("<p><span>[image: https://evil.example/x.png]</span></p>");
    expect(html("[img]/images/../secret.png[/img]")).toContain("[image:");
  });

  it("leaves unknown tags, stray closing tags and noparse content as text", () => {
    expect(html("[foo]x[/foo] [/b]")).toBe("<p>[foo]x[/foo] [/b]</p>");
    expect(html("[noparse][b]raw[/b][/noparse]")).toBe("<p>[b]raw[/b]</p>");
    expect(html("[*]not in a list")).toBe("<p>[*]not in a list</p>");
  });

  it("closes unclosed tags and repairs bad nesting", () => {
    expect(html("[b]never closed")).toBe("<p><strong>never closed</strong></p>");
    expect(html("[b]bold [i]both[/b] after")).toBe("<p><strong>bold <em>both</em></strong> after</p>");
    expect(html("[b]x[h2]Head[/h2]")).toBe("<p><strong>x</strong></p><h2>Head</h2>");
  });
});

describe("BBCode safety", () => {
  it("never outputs raw HTML", () => {
    const out = html('<script>alert(1)</script><img src=x onerror="alert(1)">');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });

  it("refuses dangerous link targets", () => {
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,hi", "vbscript:x", "//evil.example", " javascript:x"]) {
      expect(safeHref(bad), bad).toBeNull();
      expect(html(`[url=${bad}]click[/url]`), bad).not.toContain("href");
    }
    expect(html("[url]javascript:alert(1)[/url]")).not.toContain("href");
  });

  it("cannot break out of attributes", () => {
    const out = html('[url="https://example.com" onclick="alert(1)"]x[/url][quote="><script>]y[/quote]');
    expect(out).not.toContain("onclick=");
    expect(out).not.toContain("<script");
  });
});

describe("BBCode helpers", () => {
  it("extracts plain text", () => {
    expect(bbcodeToText("[b]Hello[/b] [url=/x]world[/url]\n[list][*]one[*]two[/list][img]/images/a.png[/img]")).toBe("Hello world\none\ntwo");
  });

  it("parses to a tree", () => {
    expect(parseBBCode("[b]x[/b]")).toEqual([{ type: "tag", name: "b", attr: "", children: [{ type: "text", text: "x" }] }]);
  });
});
