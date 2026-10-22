import { AdminHead } from "@/components/admin/panels";
import { requirePermission } from "@/server/auth";
import { VacancyForm } from "../vacancy-form";

export const metadata = { title: "New vacancy" };

export default async function NewVacancyPage() {
  await requirePermission("content.vacancies");
  return (
    <>
      <AdminHead back={{ href: "/admin/vacancies", label: "Vacancies" }} title="New vacancy" />
      <section className="panel">
        <VacancyForm values={{ title: "", slug: "", department: "", employmentType: "", summary: "", description: "", responsibilities: "", requirements: "", status: "DRAFT", closesAt: "", sortOrder: 0 }} />
      </section>
    </>
  );
}
