import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHero } from "@/components/ui";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Practice areas",
  description: "The legal services Calder Whitmore offers to individuals and businesses in Los Santos (fictional, GTA World roleplay).",
  alternates: { canonical: "/practice-areas" },
};

export default async function PracticeAreasPage() {
  const areas = await prisma.practiceArea.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      shortDescription: true,
      _count: { select: { attorneys: { where: { isPublished: true, status: { in: ["ACTIVE", "ON_LEAVE"] } } } } },
    },
  });

  return (
    <>
      <PageHero
        eyebrow="Practice areas"
        title="How we can help"
        lead="Our attorneys advise and represent clients across criminal, civil, family, property and business matters. Choose an area to learn what it covers and who handles it."
        crumbs={[{ label: "Practice areas" }]}
      />
      <section className="section-tight">
        <div className="container">
          {areas.length === 0 ? (
            <EmptyState title="No practice areas are published yet">
              <p>Please contact the office to discuss your matter.</p>
            </EmptyState>
          ) : (
            <div className="practice-list">
              {areas.map((a) => (
                <Link key={a.slug} href={`/practice-areas/${a.slug}`} className="practice-item">
                  <h3>{a.name}</h3>
                  <p>{a.shortDescription}</p>
                  {a._count.attorneys > 0 && (
                    <p className="small muted" style={{ marginTop: "0.75rem" }}>
                      {a._count.attorneys} {a._count.attorneys === 1 ? "team member" : "team members"}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
          <div className="notice" style={{ marginTop: "2rem" }}>
            <p>
              Not sure which area your matter falls under? <Link href="/enquiry">Send a general enquiry</Link> and we will
              route it to the right attorney.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
