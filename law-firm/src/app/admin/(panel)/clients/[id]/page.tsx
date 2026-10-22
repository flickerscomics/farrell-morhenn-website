import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHead } from "@/components/admin/panels";
import { StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { ENQUIRY_STATUS_LABELS, MATTER_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";
import { can, requirePermission } from "@/server/auth";
import { matterAccessWhere } from "@/server/services/matters";
import { getSettings } from "@/server/settings";
import { ClientTools } from "../tools";

export const metadata = { title: "Client account" };

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("clients.manage");
  const { id } = await params;
  const c = await prisma.clientAccount.findUnique({ where: { id } });
  if (!c) notFound();
  const settings = await getSettings();
  const [matters, hiddenMatters, enquiries] = await Promise.all([
    prisma.matter.findMany({ where: { AND: [{ clientAccountId: id }, matterAccessWhere(staff)] }, select: { id: true, reference: true, title: true, status: true } }),
    prisma.matter.count({ where: { clientAccountId: id, NOT: { AND: [matterAccessWhere(staff)] } } }),
    can(staff, "enquiries.view") ? prisma.enquiry.findMany({ where: { clientAccountId: id }, select: { id: true, reference: true, subject: true, status: true } }) : [],
  ]);
  return (
    <>
      <AdminHead back={{ href: "/admin/clients", label: "Client accounts" }} title={c.characterName} description={`${c.email} · registered ${formatDateTime(c.createdAt, settings.timezone)} · last sign-in ${c.lastLoginAt ? formatDateTime(c.lastLoginAt, settings.timezone) : "never"}`} actions={<StatusBadge status={c.isActive ? "ACTIVE" : "INACTIVE"} label={c.isActive ? "Active" : "Deactivated"} />} />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>Shared matters</h2>
            {matters.length === 0 ? <p className="small muted">No matters you can access are shared with this client.</p> : (
              <ul className="feed">{matters.map((m) => <li key={m.id}><Link href={`/admin/matters/${m.id}`}>{m.reference}: {m.title}</Link> <StatusBadge status={m.status} label={MATTER_STATUS_LABELS[m.status]} /></li>)}</ul>
            )}
            {hiddenMatters > 0 && <p className="small muted">{hiddenMatters} further matter(s) are shared but restricted from you.</p>}
          </section>
          {enquiries.length > 0 && (
            <section className="panel">
              <h2>Enquiries submitted while signed in</h2>
              <ul className="feed">{enquiries.map((e) => <li key={e.id}><Link href={`/admin/enquiries/${e.id}`}>{e.reference}</Link> — {e.subject} <StatusBadge status={e.status} label={ENQUIRY_STATUS_LABELS[e.status]} /></li>)}</ul>
            </section>
          )}
        </div>
        <section className="panel"><h2>Account tools</h2><ClientTools id={c.id} active={c.isActive} /></section>
      </div>
    </>
  );
}
