import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { prisma } from "@/lib/db";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Page not found", robots: { index: false } };

export default async function NotFound() {
  const [settings, areas] = await Promise.all([
    getSettings(),
    prisma.practiceArea.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true }, take: 6 }),
  ]);
  return (
    <>
      <SiteHeader settings={settings} />
      <main id="main">
        <section className="section">
          <div className="container confirmation">
            <p className="eyebrow" style={{ justifyContent: "center" }}>Error 404</p>
            <h1>We could not find that page</h1>
            <p className="lead" style={{ margin: "0 auto" }}>
              The page may have moved, or the link may be out of date. These pages might help:
            </p>
            <div className="row" style={{ justifyContent: "center", marginTop: "2rem" }}>
              <Link href="/" className="btn btn-primary">Homepage</Link>
              <Link href="/practice-areas" className="btn btn-secondary">Practice areas</Link>
              <Link href="/people" className="btn btn-secondary">Our people</Link>
              <Link href="/contact" className="btn btn-secondary">Contact</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter settings={settings} practiceAreas={areas} />
    </>
  );
}
