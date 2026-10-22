import { absoluteUrl, currentPressReleases, pressCategoryName, site } from "@/lib/content";

export const dynamic = "force-static";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed of current press releases. */
export function GET() {
  const items = currentPressReleases()
    .slice(0, 50)
    .map((r) => {
      const url = absoluteUrl(`/press/${r.slug}/`);
      return [
        "    <item>",
        `      <title>${escape(r.title)}</title>`,
        `      <link>${escape(url)}</link>`,
        `      <guid isPermaLink="true">${escape(url)}</guid>`,
        `      <pubDate>${new Date(r.releaseAt).toUTCString()}</pubDate>`,
        `      <category>${escape(pressCategoryName(r.category))}</category>`,
        `      <description>${escape(r.summary)}</description>`,
        "    </item>",
      ].join("\n");
    });
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escape(`${site.firmName} press releases`)}</title>`,
    `    <link>${escape(absoluteUrl("/press/"))}</link>`,
    `    <atom:link href="${escape(absoluteUrl("/press/feed.xml"))}" rel="self" type="application/rss+xml" />`,
    `    <description>${escape(`Official announcements and statements from ${site.firmName}.`)}</description>`,
    "    <language>en-us</language>",
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
