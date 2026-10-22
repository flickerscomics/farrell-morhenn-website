import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, StaffRole } from "@prisma/client";
import { PersonCard } from "@/components/cards";
import { EmptyState, PageHero, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { STAFF_ROLE_LABELS } from "@/lib/labels";
import { publicStaffWhere, staffCardSelect } from "@/server/public";

export const metadata: Metadata = {
  title: "Our people",
  description: "Attorneys and staff of Calder Whitmore LLP, a fictional Los Santos law firm in the GTA World roleplay community.",
  alternates: { canonical: "/people" },
};

const ROLE_GROUPS: { key: string; label: string; roles: StaffRole[] }[] = [
  { key: "partners", label: "Partners", roles: ["MANAGING_PARTNER", "PARTNER"] },
  { key: "attorneys", label: "Attorneys", roles: ["SENIOR_ATTORNEY", "ASSOCIATE_ATTORNEY"] },
  { key: "legal", label: "Paralegals, clerks & investigators", roles: ["PARALEGAL", "LEGAL_CLERK", "INVESTIGATOR"] },
  { key: "office", label: "Office & administration", roles: ["OFFICE_MANAGER", "RECEPTIONIST", "ADMINISTRATIVE"] },
];

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = strParam(sp.q, 80).trim();
  const role = strParam(sp.role, 40);
  const area = strParam(sp.area, 80);

  const where: Prisma.StaffProfileWhereInput = { ...publicStaffWhere };
  const and: Prisma.StaffProfileWhereInput[] = [];
  if (q) and.push({ OR: [{ fullName: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }] });
  const group = ROLE_GROUPS.find((g) => g.key === role);
  if (group) and.push({ role: { in: group.roles } });
  if (area) and.push({ practiceAreas: { some: { slug: area } } });
  if (and.length) where.AND = and;

  const [people, areas] = await Promise.all([
    prisma.staffProfile.findMany({ where, orderBy: [{ sortOrder: "asc" }, { fullName: "asc" }], select: staffCardSelect }),
    prisma.practiceArea.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  const filtered = Boolean(q || group || area);

  return (
    <>
      <PageHero
        eyebrow="Our people"
        title="Attorneys and staff"
        lead="Search by name, or filter by role or practice area. Each profile explains the person's background and how to arrange a consultation."
        crumbs={[{ label: "People" }]}
      />
      <section className="section-tight">
        <div className="container">
          <form className="filters" method="get" role="search" aria-label="Filter people">
            <div className="field field-grow">
              <label className="label" htmlFor="q">Name or title</label>
              <input id="q" name="q" className="input" defaultValue={q} placeholder="e.g. Reyes" />
            </div>
            <div className="field">
              <label className="label" htmlFor="role">Role</label>
              <select id="role" name="role" className="select" defaultValue={group?.key ?? ""}>
                <option value="">All roles</option>
                {ROLE_GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="area">Practice area</label>
              <select id="area" name="area" className="select" defaultValue={area}>
                <option value="">All practice areas</option>
                {areas.map((a) => (
                  <option key={a.slug} value={a.slug}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary">Search</button>
              {filtered && <Link href="/people" className="btn btn-ghost">Clear</Link>}
            </div>
          </form>

          <p className="small muted" aria-live="polite">
            {people.length} {people.length === 1 ? "person" : "people"}
            {filtered ? " match your search" : ""}
          </p>

          {people.length === 0 ? (
            <EmptyState title="No one matches those filters">
              <p>
                Try a different name or <Link href="/people">show everyone</Link>.
              </p>
            </EmptyState>
          ) : filtered ? (
            <div className="grid grid-4">
              {people.map((p) => <PersonCard key={p.id} person={p} />)}
            </div>
          ) : (
            ROLE_GROUPS.map((g) => {
              const members = people.filter((p) => g.roles.includes(p.role));
              if (!members.length) return null;
              return (
                <div key={g.key} style={{ marginBottom: "3rem" }}>
                  <h2 style={{ fontSize: "1.4rem" }}>{g.label}</h2>
                  <div className="grid grid-4">
                    {members.map((p) => <PersonCard key={p.id} person={p} />)}
                  </div>
                </div>
              );
            })
          )}
          <p className="small muted">
            Roles shown: {Object.values(STAFF_ROLE_LABELS).join(", ")}. All people listed are fictional roleplay characters.
          </p>
        </div>
      </section>
    </>
  );
}
