import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { PageHero } from "@/components/ui";
import { absoluteUrl, faqCategories, generalFaqs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about consultations, contacting the firm, appointments and careers at Farrell-Morhenn.",
  alternates: { canonical: absoluteUrl("/faq/") },
};

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="Help" title="Frequently asked questions" lead="How consultations and appointments work, how to reach an attorney, and how to apply to join the firm." crumbs={[{ label: "FAQ" }]} />
      <section className="section-tight">
        <div className="container container-narrow">
          <FaqList faqs={generalFaqs()} categories={faqCategories} />
          <div className="notice">
            <p>
              Still have a question? <Link href="/contact">Contact the office</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
