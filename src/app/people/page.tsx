import type { Metadata } from "next";
import { PeopleDirectory } from "@/components/people-directory";
import { PageHero } from "@/components/ui";
import { absoluteUrl, people, practiceAreas } from "@/lib/content";

export const metadata: Metadata = {
  title: "Our people",
  description: "Attorneys and staff of Calder Whitmore LLP, a fictional Los Santos law firm in the GTA World roleplay community.",
  alternates: { canonical: absoluteUrl("/people/") },
};

export default function PeoplePage() {
  return (
    <>
      <PageHero
        eyebrow="Our people"
        title="Attorneys and staff"
        lead="Search by name, or filter by role or practice area. Each profile explains the person's background and how to reach them."
        crumbs={[{ label: "People" }]}
      />
      <section className="section-tight">
        <div className="container">
          <PeopleDirectory people={people()} areas={practiceAreas().map((a) => ({ slug: a.slug, name: a.name }))} />
        </div>
      </section>
    </>
  );
}
