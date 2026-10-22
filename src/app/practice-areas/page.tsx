import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { absoluteUrl, peopleInArea, practiceAreas } from "@/lib/content";

export const metadata: Metadata = {
  title: "Practice areas",
  description: "The legal services Farrell-Morhenn offers to individuals and businesses across Los Santos and Blaine County.",
  alternates: { canonical: absoluteUrl("/practice-areas/") },
};

export default function PracticeAreasPage() {
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
          <div className="practice-list">
            {practiceAreas().map((a) => {
              const team = peopleInArea(a.slug).length;
              return (
                <Link key={a.slug} href={`/practice-areas/${a.slug}`} className="practice-item">
                  <h3>{a.name}</h3>
                  <p>{a.shortDescription}</p>
                  {team > 0 && (
                    <p className="small muted" style={{ marginTop: "0.75rem" }}>
                      {team} {team === 1 ? "team member" : "team members"}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="notice" style={{ marginTop: "2rem" }}>
            <p>
              Not sure which area your matter falls under? <Link href="/contact">Contact the office</Link> and we will put
              you in touch with the right attorney.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
