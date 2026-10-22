import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/client-ui";
import { AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/server/auth";
import { deleteProfileAction } from "../actions";
import { profileOptions } from "../data";
import { ProfileForm } from "../profile-form";

export const metadata = { title: "Edit profile" };

export default async function EditProfile({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("content.staff");
  const { id } = await params;
  const p = await prisma.staffProfile.findUnique({ where: { id }, include: { practiceAreas: { select: { id: true } } } });
  if (!p) notFound();
  return (
    <>
      <AdminHead
        back={{ href: "/admin/content/people", label: "People profiles" }}
        title={p.fullName}
        actions={p.isPublished && <Link href={`/people/${p.slug}`} className="btn btn-ghost btn-sm" target="_blank">View live</Link>}
      />
      <section className="panel">
        <ProfileForm
          {...(await profileOptions())}
          values={{
            id: p.id, fullName: p.fullName, slug: p.slug, title: p.title, role: p.role, status: p.status, shortBio: p.shortBio, biography: p.biography,
            background: p.background, qualifications: p.qualifications, barAdmissions: p.barAdmissions, languages: p.languages.join(", "),
            notableCases: p.notableCases, achievements: p.achievements, email: p.email, phone: p.phone, joinedYear: p.joinedYear ? String(p.joinedYear) : "",
            sortOrder: p.sortOrder, portraitId: p.portraitId, isPublished: p.isPublished, isFeatured: p.isFeatured, isLeadership: p.isLeadership,
            acceptsConsultations: p.acceptsConsultations, practiceAreaIds: p.practiceAreas.map((a) => a.id),
          }}
        />
      </section>
      <section className="panel">
        <h2>Delete profile</h2>
        <p className="small muted">For people who have left, prefer setting the status to Departed so history stays intact. Deleting removes the profile from articles and enquiries that reference it.</p>
        <form action={deleteProfileAction}>
          <input type="hidden" name="id" value={p.id} />
          <ConfirmSubmit title={`Delete ${p.fullName}'s profile?`} message="This cannot be undone." confirmLabel="Delete profile">Delete profile</ConfirmSubmit>
        </form>
      </section>
    </>
  );
}
