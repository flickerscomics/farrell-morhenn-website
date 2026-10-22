import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/client-ui";
import { AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { toLocalInput } from "@/lib/time";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { deleteVacancyAction } from "../actions";
import { VacancyForm } from "../vacancy-form";

export const metadata = { title: "Edit vacancy" };

export default async function EditVacancyPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("content.vacancies");
  const { id } = await params;
  const v = await prisma.vacancy.findUnique({ where: { id }, include: { _count: { select: { applications: true } } } });
  if (!v) notFound();
  const settings = await getSettings();
  return (
    <>
      <AdminHead back={{ href: "/admin/vacancies", label: "Vacancies" }} title={v.title} description={`${v._count.applications} applications received.`} />
      <section className="panel">
        <VacancyForm
          values={{
            id: v.id, title: v.title, slug: v.slug, department: v.department, employmentType: v.employmentType, summary: v.summary,
            description: v.description, responsibilities: v.responsibilities.join("\n"), requirements: v.requirements.join("\n"),
            status: v.status, closesAt: toLocalInput(v.closesAt, settings.timezone), sortOrder: v.sortOrder,
          }}
        />
      </section>
      {v._count.applications === 0 && (
        <section className="panel">
          <h2>Delete vacancy</h2>
          <p className="small muted">Only vacancies without applications can be deleted. Otherwise, set the status to Closed.</p>
          <form action={deleteVacancyAction}>
            <input type="hidden" name="id" value={v.id} />
            <ConfirmSubmit title="Delete this vacancy?" message="This cannot be undone." confirmLabel="Delete vacancy">Delete vacancy</ConfirmSubmit>
          </form>
        </section>
      )}
    </>
  );
}
