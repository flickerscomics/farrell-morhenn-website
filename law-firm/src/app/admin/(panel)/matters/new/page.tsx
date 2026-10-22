import { AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { can, requirePermission } from "@/server/auth";
import { staffWith } from "@/server/staff-directory";
import { createMatterAction } from "../actions";
import { MatterForm } from "../matter-form";

export const metadata = { title: "Open a matter" };

export default async function NewMatterPage() {
  const staff = await requirePermission("matters.create");
  const [areas, team] = await Promise.all([
    prisma.practiceArea.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    staffWith("matters.view_assigned", "matters.view_all"),
  ]);
  return (
    <>
      <AdminHead back={{ href: "/admin/matters", label: "Matters" }} title="Open a matter" description="To open a matter from an enquiry instead, use the conversion option on the enquiry so its history is linked." />
      <section className="panel">
        <MatterForm
          action={createMatterAction}
          submitLabel="Open matter"
          areas={areas.map((a) => ({ value: a.id, label: a.name }))}
          team={team.map((t) => ({ value: t.id, label: `${t.name} (${t.roleName})` }))}
          canArchive={can(staff, "matters.archive")}
          values={{ title: "", clientName: "", clientContact: "", practiceAreaId: "", leadAttorneyId: staff.id, description: "", status: "INTAKE", priority: "NORMAL", isRestricted: false, followUpAt: "", memberIds: [] }}
        />
      </section>
    </>
  );
}
