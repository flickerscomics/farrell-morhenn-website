import { AdminHead } from "@/components/admin/panels";
import { ConfirmSubmit, SubmitButton } from "@/components/client-ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/server/auth";
import { categoryAction } from "../actions";

export const metadata = { title: "Article categories" };

export default async function CategoriesPage() {
  await requirePermission("content.articles");
  const cats = await prisma.articleCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { articles: true } } } });
  return (
    <>
      <AdminHead back={{ href: "/admin/content/articles", label: "Articles" }} title="Article categories" />
      <section className="panel">
        {cats.map((c) => (
          <form key={c.id} action={categoryAction} className="inline-form" style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--line-soft)" }}>
            <input type="hidden" name="id" value={c.id} />
            <div className="field"><label className="label" htmlFor={`n-${c.id}`}>Name</label><input id={`n-${c.id}`} name="name" className="input input-sm" defaultValue={c.name} required maxLength={80} /></div>
            <div className="field" style={{ flex: "2 1 260px" }}><label className="label" htmlFor={`d-${c.id}`}>Description</label><input id={`d-${c.id}`} name="description" className="input input-sm" defaultValue={c.description} maxLength={300} /></div>
            <span className="small muted">{c._count.articles} articles</span>
            <SubmitButton className="btn btn-secondary btn-sm" name="op" value="save">Save</SubmitButton>
            <ConfirmSubmit title={`Delete "${c.name}"?`} message="Articles in this category become uncategorised." name="op" value="delete">Delete</ConfirmSubmit>
          </form>
        ))}
        <h2 style={{ marginTop: "1.5rem" }}>Add a category</h2>
        <form action={categoryAction} className="inline-form">
          <div className="field"><label className="label" htmlFor="new-name">Name</label><input id="new-name" name="name" className="input input-sm" required maxLength={80} /></div>
          <div className="field" style={{ flex: "2 1 260px" }}><label className="label" htmlFor="new-desc">Description</label><input id="new-desc" name="description" className="input input-sm" maxLength={300} /></div>
          <SubmitButton className="btn btn-primary btn-sm" name="op" value="create">Add</SubmitButton>
        </form>
      </section>
    </>
  );
}
