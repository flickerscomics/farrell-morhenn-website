import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { prisma } from "@/lib/db";
import { getSettings } from "@/server/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, practiceAreas] = await Promise.all([
    getSettings(),
    prisma.practiceArea.findMany({
      where: { isPublished: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      select: { slug: true, name: true },
      take: 6,
    }),
  ]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader settings={settings} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter settings={settings} practiceAreas={practiceAreas} />
    </>
  );
}
