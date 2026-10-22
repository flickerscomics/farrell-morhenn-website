import Link from "next/link";
import { AdminHead } from "@/components/admin/panels";
import { ConfirmSubmit, SubmitButton } from "@/components/client-ui";
import { EmptyState, StatusBadge, strParam } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/server/auth";
import { faqCategoryAction, faqOpAction } from "./actions";

export const metadata = { title: "FAQs" };

export default async function FaqsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("content.faqs");
  const archived = strParam((await searchParams).archived, 2) === "1";
  const [cats, faqs] = await Promise.all([
    prisma.faqCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { faqs: true } } } }),
    prisma.faq.findMany({ where: { archivedAt: archived ? { not: null } : null }, orderBy: [{ sortOrder: "asc" }], include: { practiceArea: { select: { name: true } } } }),
  ]);
  const groups = [...cats.map((c) => ({ id: c.id, name: c.name })), { id: null as string | null, name: "Uncategorised" }]
    .map((g) => ({ ...g, items: faqs.filter((f) => f.categoryId === g.id) }))
    .filter((g) => g.items.length);

  return (
    <>
      <AdminHead title="FAQs" description="Questions shown on the FAQ page and on practice area pages." actions={<Link href="/admin/content/faqs/new" className="btn btn-primary btn-sm">New question</Link>} />
      <nav className="tabs" aria-label="FAQ views">
        <Link href="/admin/content/faqs" aria-current={!archived ? "page" : undefined}>Current</Link>
        <Link href="/admin/content/faqs?archived=1" aria-current={archived ? "page" : undefined}>Archived</Link>
      </nav>
      {groups.length === 0 && <EmptyState title={archived ? "No archived questions" : "No questions yet"} />}
      {groups.map((g) => (
        <section key={g.id ?? "none"} className="panel">
          <h2>{g.name}</h2>
          <div className="table-wrap">
            <table className="table table-stack">
              <tbody>
                {g.items.map((f, i) => (
                  <tr key={f.id}>
                    <td data-label="Order" style={{ width: 90 }}>
                      {!archived && (
                        <form action={faqOpAction} className="row" style={{ gap: "0.2rem" }}>
                          <input type="hidden" name="id" value={f.id} />
                          <SubmitButton className="btn btn-ghost btn-sm" name="op" value="up" disabled={i === 0} pendingLabel="…">↑<span className="sr-only"> Move up</span></SubmitButton>
                          <SubmitButton className="btn btn-ghost btn-sm" name="op" value="down" disabled={i === g.items.length - 1} pendingLabel="…">↓<span className="sr-only"> Move down</span></SubmitButton>
                        </form>
                      )}
                    </td>
                    <td data-label="Question"><Link href={`/admin/content/faqs/${f.id}`}>{f.question}</Link>{f.practiceArea && <span className="sub">Shown on: {f.practiceArea.name}</span>}</td>
                    <td data-label="Status"><StatusBadge status={f.isPublished ? "PUBLISHED" : "DRAFT"} label={f.isPublished ? "Published" : "Hidden"} /></td>
                    <td data-label="">
                      <form action={faqOpAction} className="row" style={{ gap: "0.25rem" }}>
                        <input type="hidden" name="id" value={f.id} />
                        {!archived && <SubmitButton className="btn btn-ghost btn-sm" name="op" value="toggle" pendingLabel="…">{f.isPublished ? "Hide" : "Publish"}</SubmitButton>}
                        {archived ? (
                          <SubmitButton className="btn btn-ghost btn-sm" name="op" value="archive" pendingLabel="…">Restore</SubmitButton>
                        ) : (
                          <ConfirmSubmit className="btn btn-ghost btn-sm" title="Archive this question?" message="It will be removed from the website. You can restore it later." confirmLabel="Archive" tone="primary" name="op" value="archive">Archive</ConfirmSubmit>
                        )}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <section className="panel">
        <h2>Categories</h2>
        {cats.map((c) => (
          <form key={c.id} action={faqCategoryAction} className="inline-form" style={{ marginBottom: "0.5rem" }}>
            <input type="hidden" name="id" value={c.id} />
            <div className="field"><label className="label sr-only" htmlFor={`fc-${c.id}`}>Category name</label><input id={`fc-${c.id}`} name="name" className="input input-sm" defaultValue={c.name} maxLength={80} required /></div>
            <span className="small muted">{c._count.faqs} questions</span>
            <SubmitButton className="btn btn-secondary btn-sm" name="op" value="save">Rename</SubmitButton>
            <ConfirmSubmit title={`Delete "${c.name}"?`} message="Its questions become uncategorised." name="op" value="delete">Delete</ConfirmSubmit>
          </form>
        ))}
        <form action={faqCategoryAction} className="inline-form" style={{ marginTop: "1rem" }}>
          <div className="field"><label className="label" htmlFor="fc-new">New category</label><input id="fc-new" name="name" className="input input-sm" maxLength={80} required /></div>
          <SubmitButton className="btn btn-primary btn-sm" name="op" value="create">Add category</SubmitButton>
        </form>
      </section>
    </>
  );
}
