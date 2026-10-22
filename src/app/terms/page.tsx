import { LegalPage, legalPageMetadata } from "@/components/legal-page";

export const metadata = legalPageMetadata("terms");

export default function Page() {
  return <LegalPage slug="terms" />;
}
