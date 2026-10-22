import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { parseIntakeFields } from "@/lib/intake";
import { requirePermission } from "@/server/auth";
import { AreaForm } from "../area-form";
import { peopleOptions } from "../data";

export const metadata = { title: "Edit practice area" };

export default async function EditArea({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("content.practice_areas");
  const { id } = await params;
  const a = await prisma.practiceArea.findUnique({ where: { id }, include: { attorneys: { select: { id: true } } } });
  if (!a) notFound();
  return (
    <>
      <AdminHead
        back={{ href: "/admin/content/practice-areas", label: "Practice areas" }}
        title={a.name}
        actions={a.isPublished && <Link href={`/practice-areas/${a.slug}`} className="btn btn-ghost btn-sm" target="_blank">View live</Link>}
      />
      <section className="panel">
        <AreaForm
          people={await peopleOptions()}
          values={{
            id: a.id, name: a.name, slug: a.slug, shortDescription: a.shortDescription, overview: a.overview, matterTypes: a.matterTypes.join("\n"),
            services: a.services.join("\n"), metaDescription: a.metaDescription, sortOrder: a.sortOrder, isPublished: a.isPublished, isFeatured: a.isFeatured,
            intakeFields: parseIntakeFields(a.intakeFields), attorneyIds: a.attorneys.map((x) => x.id),
          }}
        />
      </section>
    </>
  );
}
