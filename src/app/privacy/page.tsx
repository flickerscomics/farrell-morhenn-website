import { LegalPage, legalPageMetadata } from "@/components/legal-page";

export const metadata = legalPageMetadata("privacy");

export default function Page() {
  return <LegalPage slug="privacy" />;
}
