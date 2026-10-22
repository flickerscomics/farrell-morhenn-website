import Link from "next/link";
import { AdminHead } from "@/components/admin/panels";
import { ConfirmSubmit, SubmitButton } from "@/components/client-ui";
import { prisma } from "@/lib/db";
import { formatShortDate } from "@/lib/time";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { milestoneAction } from "./actions";

export const metadata = { title: "Pages & milestones" };

const PUBLIC_PATH: Record<string, string> = { home: "/", about: "/about", careers: "/careers", contact: "/contact", privacy: "/privacy", terms: "/terms", disclaimer: "/disclaimer" };

export default async function PagesAdmin() {
  await requirePermission("content.pages");
  const [pages, milestones, settings] = await Promise.all([
    prisma.page.findMany({ orderBy: { slug: "asc" } }),
    prisma.milestone.findMany({ orderBy: [{ sortOrder: "asc" }, { year: "asc" }] }),
    getSettings(),
  ]);
  return (
    <>
      <AdminHead title="Pages & milestones" description="Edit the text of the website's fixed pages. Contact details, hours and branding are in Website settings." />
      <div className="table-wrap" style={{ marginBottom: "1.5rem" }}>
        <table className="table table-stack">
          <thead><tr><th>Page</th><th>Address</th><th>Updated</th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td data-label="Page"><Link href={`/admin/content/pages/${p.id}`}>{p.slug === "home" ? "Homepage introduction & process" : p.title}</Link></td>
                <td data-label="Address"><a href={PUBLIC_PATH[p.slug] ?? `/${p.slug}`} target="_blank" rel="noreferrer" className="mono">{PUBLIC_PATH[p.slug] ?? `/${p.slug}`}</a></td>
                <td data-label="Updated">{formatShortDate(p.updatedAt, settings.timezone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel">
        <h2>Milestones (About page)</h2>
        {milestones.map((m) => (
          <form key={m.id} action={milestoneAction} className="inline-form" style={{ padding: "0.6rem 0", borderBottom: "1px solid var(--line-soft)" }}>
            <input type="hidden" name="id" value={m.id} />
            <div className="field" style={{ flex: "0 1 90px" }}><label className="label" htmlFor={`y-${m.id}`}>Year</label><input id={`y-${m.id}`} name="year" className="input input-sm" defaultValue={m.year} required maxLength={20} /></div>
            <div className="field"><label className="label" htmlFor={`t-${m.id}`}>Title</label><input id={`t-${m.id}`} name="title" className="input input-sm" defaultValue={m.title} required maxLength={160} /></div>
            <div className="field" style={{ flex: "2 1 260px" }}><label className="label" htmlFor={`d-${m.id}`}>Description</label><input id={`d-${m.id}`} name="description" className="input input-sm" defaultValue={m.description} maxLength={600} /></div>
            <div className="field" style={{ flex: "0 1 80px" }}><label className="label" htmlFor={`o-${m.id}`}>Order</label><input id={`o-${m.id}`} name="sortOrder" type="number" className="input input-sm" defaultValue={m.sortOrder} /></div>
            <label className="check"><input type="checkbox" name="isPublished" defaultChecked={m.isPublished} /> <span>Shown</span></label>
            <SubmitButton className="btn btn-secondary btn-sm" name="op" value="save">Save</SubmitButton>
            <ConfirmSubmit title="Delete this milestone?" message="This cannot be undone." name="op" value="delete">Delete</ConfirmSubmit>
          </form>
        ))}
        <h3 style={{ marginTop: "1.25rem", fontSize: "1rem" }}>Add a milestone</h3>
        <form action={milestoneAction} className="inline-form">
          <div className="field" style={{ flex: "0 1 90px" }}><label className="label" htmlFor="y-new">Year</label><input id="y-new" name="year" className="input input-sm" required maxLength={20} /></div>
          <div className="field"><label className="label" htmlFor="t-new">Title</label><input id="t-new" name="title" className="input input-sm" required maxLength={160} /></div>
          <div className="field" style={{ flex: "2 1 260px" }}><label className="label" htmlFor="d-new">Description</label><input id="d-new" name="description" className="input input-sm" maxLength={600} /></div>
          <input type="hidden" name="sortOrder" value={milestones.length} />
          <input type="hidden" name="isPublished" value="on" />
          <SubmitButton className="btn btn-primary btn-sm" name="op" value="create">Add</SubmitButton>
        </form>
      </section>
    </>
  );
}
