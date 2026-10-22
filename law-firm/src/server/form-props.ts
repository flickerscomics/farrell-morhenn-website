import "server-only";
import { env } from "@/lib/env";
import { parseIntakeFields } from "@/lib/intake";
import { bookableAttorneys, publishedPracticeAreas } from "./public";
import { issueFormToken } from "./security";
import { getSettings } from "./settings";

export async function enquiryFormProps(areaSlug?: string) {
  const [settings, areas, attorneys] = await Promise.all([getSettings(), publishedPracticeAreas(), bookableAttorneys()]);
  const initial = areaSlug ? areas.find((a) => a.slug === areaSlug) : undefined;
  return {
    token: issueFormToken("enquiry"),
    areas: areas.map((a) => ({ id: a.id, slug: a.slug, name: a.name, intakeFields: parseIntakeFields(a.intakeFields) })),
    attorneys: attorneys.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      title: a.title,
      practiceAreaIds: a.practiceAreas.map((p) => p.id),
    })),
    contactMethods: settings.contactMethods,
    notice: settings.enquiryNotice,
    initialAreaId: initial?.id ?? "",
    initialAreaName: initial?.name,
    maxUploadMb: Math.round(env.maxUploadBytes / 1024 / 1024),
    accepting: settings.acceptingEnquiries,
  };
}
