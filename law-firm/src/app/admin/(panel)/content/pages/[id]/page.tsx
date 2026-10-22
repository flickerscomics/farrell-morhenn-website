import { notFound } from "next/navigation";
import { AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/server/auth";
import { pageSections } from "@/server/public";
import { PageForm } from "../page-form";

export const metadata = { title: "Edit page" };

const SECTION_HELP: Record<string, string> = {
  home: "Each section is one step in the homepage's 'From first enquiry to representation' process.",
  about: "Each section is shown as a block on the About page (history, mission, values, client approach).",
};

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("content.pages");
  const p = await prisma.page.findUnique({ where: { id: (await params).id } });
  if (!p) notFound();
  return (
    <>
      <AdminHead back={{ href: "/admin/content/pages", label: "Pages" }} title={p.slug === "home" ? "Homepage introduction" : p.title} description={p.slug === "home" ? "The title, summary (eyebrow) and body form the 'Our approach' block. Hero text is in Website settings." : undefined} />
      <section className="panel">
        <PageForm
          core={["about", "privacy", "terms", "disclaimer", "home", "contact", "careers"].includes(p.slug)}
          sectionsHelp={SECTION_HELP[p.slug] ?? "Optional additional sections."}
          values={{ id: p.id, title: p.title, summary: p.summary, body: p.body, metaDescription: p.metaDescription, isPublished: p.isPublished, sections: pageSections(p.sections) }}
        />
      </section>
    </>
  );
}
