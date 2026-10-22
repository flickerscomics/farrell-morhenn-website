import type { Metadata } from "next";
import { MediaContact } from "@/components/press-release-view";
import { PressList } from "@/components/press-list";
import { PageHero } from "@/components/ui";
import { absoluteUrl, currentPressReleases, pressCategories, pressListItem, pressOffice, site } from "@/lib/content";
import { asset } from "@/lib/env";

export const metadata: Metadata = {
  title: "Press releases",
  description: `Official announcements and statements from ${site.firmName}.`,
  alternates: { canonical: absoluteUrl("/press/"), types: { "application/rss+xml": absoluteUrl("/press/feed.xml") } },
};

export default function PressPage() {
  return (
    <>
      <PageHero
        eyebrow="Press office"
        title="Press releases"
        lead={`Official announcements and statements from ${site.firmName}. Journalists can reach the press office using the details on this page.`}
        crumbs={[{ label: "Press releases" }]}
      />
      <section className="section-tight">
        <div className="container split split-aside">
          <div>
            <PressList releases={currentPressReleases().map(pressListItem)} categories={pressCategories} />
          </div>
          <aside className="stack">
            <MediaContact contact={pressOffice()} />
            <div className="card">
              <h3 style={{ fontSize: "1.1rem" }}>Follow our releases</h3>
              <p className="small" style={{ margin: 0 }}>
                Subscribe to the <a href={asset("/press/feed.xml")}>press release feed (RSS)</a> in any feed reader.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
