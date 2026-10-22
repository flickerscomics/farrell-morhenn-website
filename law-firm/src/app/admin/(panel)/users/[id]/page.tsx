import { notFound } from "next/navigation";
import { ActivityPanel, AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { userFormOptions } from "../data";
import { UserForm, UserTools } from "../forms";

export const metadata = { title: "Staff account" };

export default async function EditUser({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("users.manage");
  const { id } = await params;
  const u = await prisma.user.findUnique({ where: { id }, include: { _count: { select: { sessions: true } } } });
  if (!u) notFound();
  const [opts, settings, events] = await Promise.all([
    userFormOptions(),
    getSettings(),
    prisma.auditEvent.findMany({ where: { OR: [{ actorId: id }, { entityType: "User", entityId: id }] }, orderBy: { createdAt: "desc" }, take: 25 }),
  ]);
  return (
    <>
      <AdminHead back={{ href: "/admin/users", label: "Staff accounts" }} title={u.name} description={`Last sign-in: ${u.lastLoginAt ? formatDateTime(u.lastLoginAt, settings.timezone) : "never"} · ${u._count.sessions} session record(s)`} />
      <div className="detail-grid">
        <div>
          <section className="panel"><UserForm {...opts} values={{ id: u.id, name: u.name, email: u.email, roleId: u.roleId, staffProfileId: u.staffProfileId ?? "", isActive: u.isActive }} /></section>
          <ActivityPanel events={events} timezone={settings.timezone} title="Recent activity by or about this account" />
        </div>
        <section className="panel"><h2>Access tools</h2><UserTools id={u.id} /></section>
      </div>
    </>
  );
}
