import Link from "next/link";
import { AdminHead } from "@/components/admin/panels";
import { EmptyState, Pagination, StatusBadge, pageParam, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatShortDate } from "@/lib/time";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Client accounts" };
const PER_PAGE = 30;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("clients.manage");
  const sp = await searchParams;
  const q = strParam(sp.q, 80).trim();
  const page = pageParam(sp.page);
  const settings = await getSettings();
  const where = q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { characterName: { contains: q, mode: "insensitive" as const } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.clientAccount.count({ where }),
    prisma.clientAccount.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { matters: true, enquiries: true } } } }),
  ]);
  return (
    <>
      <AdminHead title="Client portal accounts" description="Clients register themselves. Share a matter with a client from the matter page using their portal email." />
      <form className="filters" method="get">
        <div className="field field-grow"><label className="label" htmlFor="q">Search</label><input id="q" name="q" className="input input-sm" defaultValue={q} placeholder="Email or character name" /></div>
        <div className="row"><button className="btn btn-primary btn-sm" type="submit">Search</button></div>
      </form>
      {rows.length === 0 ? <EmptyState title="No portal accounts" /> : (
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Client</th><th>Status</th><th className="num">Matters</th><th className="num">Enquiries</th><th>Registered</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td data-label="Client"><Link href={`/admin/clients/${c.id}`}>{c.characterName}</Link><span className="sub">{c.email}</span></td>
                  <td data-label="Status"><StatusBadge status={c.isActive ? "ACTIVE" : "INACTIVE"} label={c.isActive ? "Active" : "Deactivated"} /></td>
                  <td data-label="Matters" className="num">{c._count.matters}</td>
                  <td data-label="Enquiries" className="num">{c._count.enquiries}</td>
                  <td data-label="Registered">{formatShortDate(c.createdAt, settings.timezone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/clients" params={{ q }} />
    </>
  );
}
