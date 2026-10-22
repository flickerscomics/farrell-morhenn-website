import { LegalPage, legalPageMetadata } from "@/components/legal-page";

export const generateMetadata = () => legalPageMetadata("terms");

export default function Page() {
  return <LegalPage slug="terms" />;
}
