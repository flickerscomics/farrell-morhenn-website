"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isValidTimeString, isValidTimeZone, type OfficeHours } from "@/lib/time";
import { emailSchema, hexColorSchema, isSafeHref, lines, zodFieldErrors, type FormState } from "@/lib/validation";
import { audit, staffActor } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { resolveImage } from "@/server/content-helpers";
import { setFlash } from "@/server/flash";
import { DEFAULT_HOME_SECTIONS, type HomeSections } from "@/server/settings";
import { staffWith } from "@/server/staff-directory";

const schema = z.object({
  firmName: z.string().trim().min(2).max(120),
  shortName: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(160),
  colorPrimary: hexColorSchema,
  colorAccent: hexColorSchema,
  phone: z.string().trim().min(3).max(40),
  email: emailSchema,
  addressLines: z.string().trim().min(3, "Enter the office address.").max(400),
  locationNote: z.string().trim().max(600),
  footerText: z.string().trim().max(600),
  heroEyebrow: z.string().trim().max(120),
  heroTitle: z.string().trim().min(5).max(160),
  heroText: z.string().trim().min(10).max(600),
  navigation: z.string().max(2000),
  socialLinks: z.string().max(2000),
  contactMethods: z.string().max(1000),
  consultationTypes: z.string().max(1000),
  enquiryNotice: z.string().trim().max(500),
  defaultAssigneeId: z.string().max(40),
  timezone: z.string().refine(isValidTimeZone, "Unknown timezone."),
  slotMinutes: z.coerce.number().int().refine((n) => [15, 20, 30, 60].includes(n), "Choose 15, 20, 30 or 60."),
  minNoticeHours: z.coerce.number().int().min(0).max(336),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  appointmentMinutes: z.coerce.number().int().min(15).max(240),
});

function parseLinks(text: string, field: string): { ok: true; links: { label: string; href: string }[] } | { ok: false; error: string } {
  const links: { label: string; href: string }[] = [];
  for (const line of lines(text, 12)) {
    const [label, href] = line.split("|").map((s) => s.trim());
    if (!label || !href || !isSafeHref(href)) return { ok: false, error: `${field}: use "Label | /path" or "Label | https://…" on each line.` };
    links.push({ label: label.slice(0, 40), href: href.slice(0, 300) });
  }
  return { ok: true, links };
}

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("settings.manage");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: zodFieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;

  const nav = parseLinks(d.navigation, "Navigation");
  if (!nav.ok) return { ok: false, errors: { navigation: nav.error } };
  const social = parseLinks(d.socialLinks, "Social links");
  if (!social.ok) return { ok: false, errors: { socialLinks: social.error } };

  const officeHours: OfficeHours = [];
  for (let day = 0; day < 7; day++) {
    const closed = formData.get(`hours_${day}_closed`) === "on";
    const open = String(formData.get(`hours_${day}_open`) ?? "");
    const close = String(formData.get(`hours_${day}_close`) ?? "");
    if (!closed && (!isValidTimeString(open) || !isValidTimeString(close) || open >= close)) {
      return { ok: false, errors: { officeHours: "Each open day needs an opening time before its closing time." } };
    }
    officeHours.push({ closed, open: isValidTimeString(open) ? open : "09:00", close: isValidTimeString(close) ? close : "17:00" });
  }

  const contactMethods = lines(d.contactMethods, 12).map((l) => l.slice(0, 60));
  const consultationTypes = lines(d.consultationTypes, 12).map((l) => l.slice(0, 80));
  if (!consultationTypes.length) return { ok: false, errors: { consultationTypes: "List at least one consultation type." } };

  if (d.defaultAssigneeId && !(await staffWith("enquiries.manage")).some((u) => u.id === d.defaultAssigneeId)) {
    return { ok: false, errors: { defaultAssigneeId: "Choose a staff member who can manage enquiries." } };
  }
  const logo = await resolveImage(formData, "logo", { purpose: "LOGO", uploadedById: staff.id, altText: `${d.firmName} logo`, maxEdge: 600 });
  if (!logo.ok) return { ok: false, errors: { logoFile: logo.error } };

  const homeSections = Object.fromEntries(
    Object.keys(DEFAULT_HOME_SECTIONS).map((k) => [k, formData.get(`home_${k}`) === "on"]),
  ) as HomeSections;

  await prisma.siteSettings.update({
    where: { id: 1 },
    data: {
      firmName: d.firmName,
      shortName: d.shortName,
      tagline: d.tagline,
      colorPrimary: d.colorPrimary.toLowerCase(),
      colorAccent: d.colorAccent.toLowerCase(),
      phone: d.phone,
      email: d.email,
      addressLines: lines(d.addressLines, 6),
      locationNote: d.locationNote,
      footerText: d.footerText,
      heroEyebrow: d.heroEyebrow,
      heroTitle: d.heroTitle,
      heroText: d.heroText,
      navigation: nav.links,
      socialLinks: social.links,
      officeHours,
      homeSections,
      contactMethods,
      consultationTypes,
      enquiryNotice: d.enquiryNotice,
      defaultAssigneeId: d.defaultAssigneeId || null,
      timezone: d.timezone,
      slotMinutes: d.slotMinutes,
      minNoticeHours: d.minNoticeHours,
      maxAdvanceDays: d.maxAdvanceDays,
      appointmentMinutes: d.appointmentMinutes,
      acceptingEnquiries: formData.get("acceptingEnquiries") === "on",
      acceptingBookings: formData.get("acceptingBookings") === "on",
      logoId: logo.id,
    },
  });
  await audit(staffActor(staff), { action: "settings.updated", entityType: "SiteSettings", entityId: "1", summary: "Updated website settings" });
  await setFlash("Settings saved.");
  redirect("/admin/settings");
}
