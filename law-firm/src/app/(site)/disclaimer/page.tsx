import { LegalPage, legalPageMetadata } from "@/components/legal-page";

export const generateMetadata = () => legalPageMetadata("disclaimer");

export default function Page() {
  return <LegalPage slug="disclaimer" />;
}
