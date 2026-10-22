import { LegalPage, legalPageMetadata } from "@/components/legal-page";

export const metadata = legalPageMetadata("disclaimer");

export default function Page() {
  return <LegalPage slug="disclaimer" />;
}
