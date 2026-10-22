import Link from "next/link";
import { AdminHead } from "@/components/admin/panels";
import { ConfirmSubmit, SubmitButton } from "@/components/client-ui";
import { StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { parseIntakeFields } from "@/lib/intake";
import { requirePermission } from "@/server/auth";
import { practiceAreaOpAction } from "./actions";

export const metadata = { title: "Practice areas" };

export default async function PracticeAreasAdmin() {
  await requirePermission("content.practice_areas");
  const areas = await prisma.practiceArea.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { attorneys: true, faqs: true, enquiries: true } } },
  });
  return (
    <>
      <AdminHead title="Practice areas" description="Hidden practice areas disappear from the website and the enquiry form but keep their history." actions={<Link href="/admin/content/practice-areas/new" className="btn btn-primary btn-sm">New practice area</Link>} />
      <div className="table-wrap">
        <table className="table table-stack">
          <thead><tr><th>Order</th><th>Name</th><th>Status</th><th className="num">People</th><th className="num">Intake questions</th><th className="num">Enquiries</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {areas.map((a, i) => (
              <tr key={a.id}>
                <td data-label="Order">
                  <form action={practiceAreaOpAction} className="row" style={{ gap: "0.2rem" }}>
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton className="btn btn-ghost btn-sm" name="op" value="up" disabled={i === 0} pendingLabel="…">↑<span className="sr-only"> Move {a.name} up</span></SubmitButton>
                    <SubmitButton className="btn btn-ghost btn-sm" name="op" value="down" disabled={i === areas.length - 1} pendingLabel="…">↓<span className="sr-only"> Move {a.name} down</span></SubmitButton>
                  </form>
                </td>
                <td data-label="Name"><Link href={`/admin/content/practice-areas/${a.id}`}>{a.name}</Link><span className="sub">/{a.slug}{a.isFeatured ? " · featured" : ""}</span></td>
                <td data-label="Status"><StatusBadge status={a.isPublished ? "PUBLISHED" : "DRAFT"} label={a.isPublished ? "Published" : "Hidden"} /></td>
                <td data-label="People" className="num">{a._count.attorneys}</td>
                <td data-label="Intake questions" className="num">{parseIntakeFields(a.intakeFields).length}</td>
                <td data-label="Enquiries" className="num">{a._count.enquiries}</td>
                <td data-label="">
                  <form action={practiceAreaOpAction} className="row" style={{ gap: "0.25rem" }}>
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton className="btn btn-ghost btn-sm" name="op" value="toggle" pendingLabel="…">{a.isPublished ? "Hide" : "Publish"}</SubmitButton>
                    {a._count.enquiries === 0 && <ConfirmSubmit className="btn btn-ghost btn-sm" title={`Delete ${a.name}?`} message="This permanently removes the practice area." name="op" value="delete">Delete</ConfirmSubmit>}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
