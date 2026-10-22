import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/app";
import { site } from "@/lib/content";
import { asset } from "@/lib/env";

export const metadata: Metadata = {
  title: "Staff area",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp logo={site.logo ? asset(site.logo) : null} />;
}
