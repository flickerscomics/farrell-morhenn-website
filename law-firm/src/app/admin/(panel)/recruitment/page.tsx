import Link from "next/link";
import type { ApplicationStatus, Prisma } from "@prisma/client";
import { AdminHead } from "@/components/admin/panels";
import { EmptyState, Pagination, StatusBadge, pageParam, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { APPLICATION_STATUS_LABELS } from "@/lib/labels";
import { formatShortDate } from "@/lib/time";
import { can, requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Applications" };
const PER_PAGE = 25;

export default async function RecruitmentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await requirePermission("recruitment.view");
  const sp = await searchParams;
  const q = strParam(sp.q, 80).trim();
  const status = strParam(sp.status, 20);
  const vacancy = strParam(sp.vacancy, 40);
  const role = strParam(sp.role, 80).trim();
  const archived = strParam(sp.archived, 5) === "1";
  const page = pageParam(sp.page);
  const settings = await getSettings();

  const and: Prisma.ApplicationWhereInput[] = [{ archivedAt: archived ? { not: null } : null }];
  if (q) and.push({ OR: [{ reference: { contains: q, mode: "insensitive" } }, { characterName: { contains: q, mode: "insensitive" } }] });
  if (status in APPLICATION_STATUS_LABELS) and.push({ status: status as ApplicationStatus });
  if (vacancy === "general") and.push({ vacancyId: null });
  else if (vacancy) and.push({ vacancyId: vacancy });
  if (role) and.push({ desiredRole: { contains: role, mode: "insensitive" } });
  const where = { AND: and };

  const [total, rows, vacancies] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { vacancy: { select: { title: true } } } }),
    prisma.vacancy.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <>
      <AdminHead
        title="Recruitment applications"
        description="Visible only to staff with recruitment access."
        actions={can(staff, "content.vacancies") && <Link href="/admin/vacancies" className="btn btn-secondary btn-sm">Manage vacancies</Link>}
      />
      <nav className="tabs" aria-label="Application views">
        <Link href="/admin/recruitment" aria-current={!archived ? "page" : undefined}>Current</Link>
        <Link href="/admin/recruitment?archived=1" aria-current={archived ? "page" : undefined}>Archived</Link>
      </nav>
      <form className="filters" method="get" aria-label="Filter applications">
        {archived && <input type="hidden" name="archived" value="1" />}
        <div className="field field-grow">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" className="input input-sm" defaultValue={q} placeholder="Reference or name" />
        </div>
        <div className="field">
          <label className="label" htmlFor="role">Desired role</label>
          <input id="role" name="role" className="input input-sm" defaultValue={role} placeholder="e.g. Paralegal" />
        </div>
        <div className="field">
          <label className="label" htmlFor="vacancy">Vacancy</label>
          <select id="vacancy" name="vacancy" className="select select-sm" defaultValue={vacancy}>
            <option value="">All</option>
            <option value="general">General applications</option>
            {vacancies.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="select select-sm" defaultValue={status}>
            <option value="">Any</option>
            {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="row">
          <button className="btn btn-primary btn-sm" type="submit">Apply</button>
          <Link href={archived ? "/admin/recruitment?archived=1" : "/admin/recruitment"} className="btn btn-ghost btn-sm">Reset</Link>
        </div>
      </form>
      {rows.length === 0 ? <EmptyState title="No applications match these filters" /> : (
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Applicant</th><th>Role</th><th>Vacancy</th><th>Status</th><th>Received</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td data-label="Applicant"><Link href={`/admin/recruitment/${a.id}`}>{a.characterName}</Link><span className="sub mono">{a.reference}</span></td>
                  <td data-label="Role">{a.desiredRole}</td>
                  <td data-label="Vacancy">{a.vacancy?.title ?? <span className="muted">General</span>}</td>
                  <td data-label="Status"><StatusBadge status={a.status} label={APPLICATION_STATUS_LABELS[a.status]} /></td>
                  <td data-label="Received">{formatShortDate(a.createdAt, settings.timezone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/recruitment" params={{ q, status, vacancy, role, archived: archived ? "1" : "" }} />
    </>
  );
}
