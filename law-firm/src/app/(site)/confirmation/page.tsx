import type { Metadata } from "next";
import Link from "next/link";
import { strParam } from "@/components/ui";
import { REFERENCE_PATTERN } from "@/server/references";

export const metadata: Metadata = { title: "Submission received", robots: { index: false } };

const COPY: Record<string, { title: string; body: string; next: string }> = {
  enquiry: {
    title: "Thank you — your enquiry has been received",
    body: "A member of staff will review it, usually within one in-character business day, and contact you by your preferred method.",
    next: "If you need to follow up, quote your reference number.",
  },
  appointment: {
    title: "Your consultation request has been received",
    body: "This is a request, not a confirmed appointment. Staff will confirm the time with you or suggest an alternative.",
    next: "Quote your reference number if you need to change or cancel the request.",
  },
  application: {
    title: "Thank you for your application",
    body: "Your application has been passed to the hiring partner. Every application receives a decision.",
    next: "Keep your reference number in case you need to contact us about your application.",
  },
};

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const type = strParam(sp.type, 20);
  const ref = strParam(sp.ref, 30);
  const copy = COPY[type];
  const validRef = REFERENCE_PATTERN.test(ref);

  if (!copy || !validRef) {
    return (
      <section className="section">
        <div className="container confirmation">
          <h1>Nothing to confirm</h1>
          <p className="lead" style={{ margin: "0 auto" }}>This page shows a reference number after you submit a form.</p>
          <p style={{ marginTop: "1.5rem" }}><Link href="/" className="btn btn-primary">Back to the homepage</Link></p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container confirmation" role="status">
        <p className="eyebrow" style={{ justifyContent: "center" }}>Submission received</p>
        <h1>{copy.title}</h1>
        {sp.duplicate && (
          <div className="notice notice-info" style={{ textAlign: "left" }}>
            <p>We had already received this submission, so it has not been duplicated. The original reference is shown below.</p>
          </div>
        )}
        <p>Your reference number is</p>
        <div className="reference-box" aria-label={`Reference number ${ref.split("").join(" ")}`}>{ref}</div>
        <p className="lead" style={{ margin: "0 auto 1rem" }}>{copy.body}</p>
        <p className="muted">{copy.next}</p>
        <div className="row" style={{ justifyContent: "center", marginTop: "2rem" }}>
          <Link href="/" className="btn btn-primary">Return to the homepage</Link>
          <Link href="/faq" className="btn btn-secondary">Read the FAQ</Link>
        </div>
      </div>
    </section>
  );
}
