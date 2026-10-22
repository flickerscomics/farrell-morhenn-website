import { AdminHead } from "@/components/admin/panels";
import { requirePermission } from "@/server/auth";
import { faqOptions } from "../data";
import { FaqForm } from "../faq-form";

export const metadata = { title: "New FAQ" };

export default async function NewFaq() {
  await requirePermission("content.faqs");
  return (
    <>
      <AdminHead back={{ href: "/admin/content/faqs", label: "FAQs" }} title="New question" />
      <section className="panel"><FaqForm {...(await faqOptions())} values={{ question: "", answer: "", categoryId: "", practiceAreaId: "", isPublished: true }} /></section>
    </>
  );
}
