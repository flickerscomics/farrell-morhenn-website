import { AdminHead } from "@/components/admin/panels";
import { requirePermission } from "@/server/auth";
import { imageLibrary } from "@/server/content-helpers";
import { getSettings } from "@/server/settings";
import { staffWith } from "@/server/staff-directory";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Website settings" };

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const [s, assignees, library] = await Promise.all([getSettings(), staffWith("enquiries.manage"), imageLibrary()]);
  const links = (l: { label: string; href: string }[]) => l.map((x) => `${x.label} | ${x.href}`).join("\n");
  return (
    <>
      <AdminHead title="Website settings" description="Branding, contact details, office hours, navigation and scheduling rules. Page text is edited under Pages." />
      <section className="panel">
        <SettingsForm
          assignees={assignees.map((a) => ({ value: a.id, label: `${a.name} (${a.roleName})` }))}
          library={library}
          values={{
            firmName: s.firmName, shortName: s.shortName, tagline: s.tagline, colorPrimary: s.colorPrimary, colorAccent: s.colorAccent,
            phone: s.phone, email: s.email, addressLines: s.addressLines.join("\n"), locationNote: s.locationNote, footerText: s.footerText,
            heroEyebrow: s.heroEyebrow, heroTitle: s.heroTitle, heroText: s.heroText, navigation: links(s.navigation), socialLinks: links(s.socialLinks),
            contactMethods: s.contactMethods.join("\n"), consultationTypes: s.consultationTypes.join("\n"), enquiryNotice: s.enquiryNotice,
            defaultAssigneeId: s.defaultAssigneeId ?? "", timezone: s.timezone, slotMinutes: s.slotMinutes, minNoticeHours: s.minNoticeHours,
            maxAdvanceDays: s.maxAdvanceDays, appointmentMinutes: s.appointmentMinutes, acceptingEnquiries: s.acceptingEnquiries,
            acceptingBookings: s.acceptingBookings, logoId: s.logoId, officeHours: s.officeHours, homeSections: s.homeSections,
          }}
        />
      </section>
    </>
  );
}
