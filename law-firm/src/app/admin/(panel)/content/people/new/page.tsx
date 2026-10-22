import { AdminHead } from "@/components/admin/panels";
import { requirePermission } from "@/server/auth";
import { profileOptions } from "../data";
import { ProfileForm } from "../profile-form";

export const metadata = { title: "New profile" };

export default async function NewProfile() {
  await requirePermission("content.staff");
  return (
    <>
      <AdminHead back={{ href: "/admin/content/people", label: "People profiles" }} title="New profile" />
      <section className="panel">
        <ProfileForm
          {...(await profileOptions())}
          values={{ fullName: "", slug: "", title: "", role: "ASSOCIATE_ATTORNEY", status: "ACTIVE", shortBio: "", biography: "", background: "", qualifications: "", barAdmissions: "", languages: "English", notableCases: "", achievements: "", email: "", phone: "", joinedYear: "", sortOrder: 100, portraitId: null, isPublished: false, isFeatured: false, isLeadership: false, acceptsConsultations: false, practiceAreaIds: [] }}
        />
      </section>
    </>
  );
}
