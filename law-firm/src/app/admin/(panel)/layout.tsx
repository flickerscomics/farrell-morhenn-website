import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "../admin.css";
import { Brand } from "@/components/brand";
import { AdminChrome, type NavGroup } from "@/components/admin/sidebar";
import { prisma } from "@/lib/db";
import { hasAnyPermission, hasPermission, type Permission } from "@/lib/permissions";
import { requireStaff } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { logoutAction } from "./account/actions";

export const metadata: Metadata = { title: { default: "Administration", template: "%s | Admin" }, robots: { index: false, follow: false } };

type Item = { href: string; label: string; any: Permission[]; count?: number };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const path = (await headers()).get("x-pathname") ?? "";
  if (staff.mustChangePassword && !path.startsWith("/admin/account")) redirect("/admin/account?required=1");
  const settings = await getSettings();
  const p = staff.permissions;

  const [newEnquiries, pendingAppointments, newApplications] = await Promise.all([
    hasPermission(p, "enquiries.view") ? prisma.enquiry.count({ where: { status: "NEW" } }) : 0,
    hasPermission(p, "appointments.view") ? prisma.appointment.count({ where: { status: "REQUESTED" } }) : 0,
    hasPermission(p, "recruitment.view") ? prisma.application.count({ where: { status: "RECEIVED", archivedAt: null } }) : 0,
  ]);

  const groups: { label: string; items: Item[] }[] = [
    { label: "Overview", items: [{ href: "/admin", label: "Dashboard", any: ["dashboard.view"] }] },
    {
      label: "Operations",
      items: [
        { href: "/admin/enquiries", label: "Enquiries", any: ["enquiries.view"], count: newEnquiries },
        { href: "/admin/appointments", label: "Appointments", any: ["appointments.view"], count: pendingAppointments },
        { href: "/admin/matters", label: "Matters", any: ["matters.view_assigned", "matters.view_all"] },
        { href: "/admin/recruitment", label: "Applications", any: ["recruitment.view"], count: newApplications },
        { href: "/admin/clients", label: "Client accounts", any: ["clients.manage"] },
      ],
    },
    {
      label: "Website",
      items: [
        { href: "/admin/content/articles", label: "Articles", any: ["content.articles"] },
        { href: "/admin/content/practice-areas", label: "Practice areas", any: ["content.practice_areas"] },
        { href: "/admin/content/people", label: "People profiles", any: ["content.staff"] },
        { href: "/admin/content/faqs", label: "FAQs", any: ["content.faqs"] },
        { href: "/admin/content/pages", label: "Pages & milestones", any: ["content.pages"] },
        { href: "/admin/vacancies", label: "Vacancies", any: ["content.vacancies"] },
        { href: "/admin/media", label: "Media library", any: ["media.manage"] },
      ],
    },
    {
      label: "Administration",
      items: [
        { href: "/admin/users", label: "Staff accounts", any: ["users.manage"] },
        { href: "/admin/roles", label: "Roles & permissions", any: ["roles.manage"] },
        { href: "/admin/settings", label: "Website settings", any: ["settings.manage"] },
        { href: "/admin/audit", label: "Audit log", any: ["audit.view"] },
      ],
    },
  ];

  const nav: NavGroup[] = groups
    .map((g) => ({
      label: g.label,
      items: g.items.filter((i) => hasAnyPermission(p, i.any)).map(({ href, label, count }) => ({ href, label, count })),
    }))
    .filter((g) => g.items.length);
  nav.push({ label: "You", items: [{ href: "/admin/account", label: "My account" }] });

  return (
    <AdminChrome
      groups={nav}
      brand={<Brand firmName={settings.firmName} shortName={settings.shortName} logoUrl={settings.logoUrl} sub="Administration" />}
      topbar={
        <>
          <span className="who">
            Signed in as <strong>{staff.name}</strong> · {staff.role.name}
          </span>
          <span className="row">
            <Link href="/" className="btn btn-ghost btn-sm" target="_blank">
              View website
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary btn-sm">
                Sign out
              </button>
            </form>
          </span>
        </>
      }
    >
      {children}
    </AdminChrome>
  );
}
