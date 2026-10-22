import type { Metadata } from "next";
import { NewsList } from "@/components/news-list";
import { PageHero } from "@/components/ui";
import { absoluteUrl, articleCategories, articles } from "@/lib/content";

export const metadata: Metadata = {
  title: "News & insights",
  description: "Firm announcements, legal articles and community information from Farrell-Morhenn.",
  alternates: { canonical: absoluteUrl("/news/") },
};

export default function NewsPage() {
  return (
    <>
      <PageHero
        eyebrow="News & insights"
        title="Announcements and legal articles"
        lead="Firm news, plain-language guides and community legal information. Articles are general information, not legal advice."
        crumbs={[{ label: "News & insights" }]}
      />
      <section className="section-tight">
        <div className="container">
          <NewsList articles={articles()} categories={articleCategories} />
        </div>
      </section>
    </>
  );
}
