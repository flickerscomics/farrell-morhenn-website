import { AdminHead } from "@/components/admin/panels";
import { requirePermission } from "@/server/auth";
import { AreaForm } from "../area-form";
import { peopleOptions } from "../data";

export const metadata = { title: "New practice area" };

export default async function NewArea() {
  await requirePermission("content.practice_areas");
  return (
    <>
      <AdminHead back={{ href: "/admin/content/practice-areas", label: "Practice areas" }} title="New practice area" />
      <section className="panel">
        <AreaForm people={await peopleOptions()} values={{ name: "", slug: "", shortDescription: "", overview: "", matterTypes: "", services: "", metaDescription: "", sortOrder: 100, isPublished: false, isFeatured: false, intakeFields: [], attorneyIds: [] }} />
      </section>
    </>
  );
}
