import { notFound } from "next/navigation";
import { AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/server/auth";
import { faqOptions } from "../data";
import { FaqForm } from "../faq-form";

export const metadata = { title: "Edit FAQ" };

export default async function EditFaq({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("content.faqs");
  const f = await prisma.faq.findUnique({ where: { id: (await params).id } });
  if (!f) notFound();
  return (
    <>
      <AdminHead back={{ href: "/admin/content/faqs", label: "FAQs" }} title="Edit question" />
      <section className="panel">
        <FaqForm {...(await faqOptions())} values={{ id: f.id, question: f.question, answer: f.answer, categoryId: f.categoryId ?? "", practiceAreaId: f.practiceAreaId ?? "", isPublished: f.isPublished }} />
      </section>
    </>
  );
}
