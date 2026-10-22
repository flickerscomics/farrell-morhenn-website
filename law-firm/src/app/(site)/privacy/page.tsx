import { LegalPage, legalPageMetadata } from "@/components/legal-page";

export const generateMetadata = () => legalPageMetadata("privacy");

export default function Page() {
  return <LegalPage slug="privacy" />;
}
