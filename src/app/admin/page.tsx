import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/app";

export const metadata: Metadata = {
  title: "Staff area",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
