"use client";

import type { Person } from "@/lib/types";
import { PersonCard } from "./cards";
import { EmptyState } from "./ui";
import { matches, useUrlFilters } from "./use-url-filters";

const ROLE_GROUPS = [
  { key: "partners", label: "Partners", roles: ["MANAGING_PARTNER", "PARTNER"] },
  { key: "attorneys", label: "Attorneys", roles: ["SENIOR_ATTORNEY", "ASSOCIATE_ATTORNEY"] },
  { key: "legal", label: "Paralegals, clerks & investigators", roles: ["PARALEGAL", "LEGAL_CLERK", "INVESTIGATOR"] },
  { key: "office", label: "Office & administration", roles: ["OFFICE_MANAGER", "RECEPTIONIST", "ADMINISTRATIVE"] },
];

export function PeopleDirectory({ people, areas }: { people: Person[]; areas: { slug: string; name: string }[] }) {
  const { values, update, clear, active } = useUrlFilters(["q", "role", "area"] as const);
  const group = ROLE_GROUPS.find((g) => g.key === values.role);
  const shown = people.filter(
    (p) =>
      (!values.q || matches(`${p.fullName} ${p.title}`, values.q)) &&
      (!group || group.roles.includes(p.role)) &&
      (!values.area || p.practiceAreas.includes(values.area)),
  );

  return (
    <>
      <form className="filters" role="search" aria-label="Filter people" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-grow">
          <label className="label" htmlFor="q">Name or title</label>
          <input id="q" className="input" value={values.q} onChange={(e) => update({ q: e.target.value })} placeholder="e.g. Bernardi" />
        </div>
        <div className="field">
          <label className="label" htmlFor="role">Role</label>
          <select id="role" className="select" value={values.role} onChange={(e) => update({ role: e.target.value })}>
            <option value="">All roles</option>
            {ROLE_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>{g.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="area">Practice area</label>
          <select id="area" className="select" value={values.area} onChange={(e) => update({ area: e.target.value })}>
            <option value="">All practice areas</option>
            {areas.map((a) => (
              <option key={a.slug} value={a.slug}>{a.name}</option>
            ))}
          </select>
        </div>
        {active && (
          <button type="button" className="btn btn-ghost" onClick={clear}>
            Clear filters
          </button>
        )}
      </form>

      <p className="small muted" aria-live="polite">
        {shown.length} {shown.length === 1 ? "person" : "people"}
        {active ? " match your search" : ""}
      </p>

      {shown.length === 0 ? (
        <EmptyState title="No one matches those filters">
          <p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={clear}>Show everyone</button>
          </p>
        </EmptyState>
      ) : active ? (
        <div className="grid grid-4">
          {shown.map((p) => <PersonCard key={p.slug} person={p} />)}
        </div>
      ) : (
        ROLE_GROUPS.map((g) => {
          const members = shown.filter((p) => g.roles.includes(p.role));
          if (!members.length) return null;
          return (
            <div key={g.key} style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontSize: "1.4rem" }}>{g.label}</h2>
              <div className="grid grid-4">
                {members.map((p) => <PersonCard key={p.slug} person={p} />)}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
