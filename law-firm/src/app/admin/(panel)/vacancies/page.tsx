import Link from "next/link";
import { AdminHead } from "@/components/admin/panels";
import { EmptyState, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { VACANCY_STATUS_LABELS } from "@/lib/labels";
import { formatShortDate } from "@/lib/time";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Vacancies" };

export default async function VacanciesPage() {
  await requirePermission("content.vacancies");
  const settings = await getSettings();
  const rows = await prisma.vacancy.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], include: { _count: { select: { applications: true } } } });
  return (
    <>
      <AdminHead title="Vacancies" description="Open vacancies appear on the public careers page and accept applications." actions={<Link href="/admin/vacancies/new" className="btn btn-primary btn-sm">New vacancy</Link>} />
      {rows.length === 0 ? <EmptyState title="No vacancies yet" /> : (
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Title</th><th>Status</th><th>Closes</th><th className="num">Applications</th><th><span className="sr-only">Public page</span></th></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td data-label="Title"><Link href={`/admin/vacancies/${v.id}`}>{v.title}</Link><span className="sub">{v.department}</span></td>
                  <td data-label="Status"><StatusBadge status={v.status} label={VACANCY_STATUS_LABELS[v.status]} /></td>
                  <td data-label="Closes">{v.closesAt ? formatShortDate(v.closesAt, settings.timezone) : "—"}</td>
                  <td data-label="Applications" className="num">{v._count.applications}</td>
                  <td data-label="">{v.status !== "DRAFT" && <Link href={`/careers/${v.slug}`} target="_blank">View</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
