// Firm identity, contact details and site-wide settings. All details are
// fictional and work only in character within the GTA World roleplay.

export type DayHours = { closed: boolean; open: string; close: string };

export const site = {
  firmName: "Calder Whitmore LLP",
  shortName: "Calder Whitmore",
  tagline: "Steady counsel for Los Santos.",
  /** Brand colours (six-digit hex). */
  colorPrimary: "#15233b",
  colorAccent: "#a8864f",

  phone: "555-0147",
  email: "reception@calderwhitmore.sa",
  addressLines: ["Arcadius Business Center, Suite 2210", "Pillbox Hill", "Los Santos, San Andreas"],
  locationNote:
    "On the 22nd floor of the Arcadius Business Center. Visitor parking is available in the building garage; check in at the ground-floor security desk.",
  /** Ways to reach the firm in character. */
  contactMethods: [
    "Call the office on 555-0147 (in character)",
    "Email reception@calderwhitmore.sa (in character)",
    "Send a GTA World forum private message to the firm",
    "Visit the office in person during opening hours",
  ],
  consultationTypes: ["Initial consultation", "Case review", "Document review", "Follow-up meeting", "Court preparation"],
  appointmentMinutes: 45,

  timezone: "America/Los_Angeles",
  /** Index 0 = Sunday … 6 = Saturday. Times are in `timezone`. */
  officeHours: [
    { closed: true, open: "10:00", close: "16:00" },
    { closed: false, open: "09:00", close: "18:00" },
    { closed: false, open: "09:00", close: "18:00" },
    { closed: false, open: "09:00", close: "18:00" },
    { closed: false, open: "09:00", close: "18:00" },
    { closed: false, open: "09:00", close: "17:00" },
    { closed: false, open: "10:00", close: "14:00" },
  ] as DayHours[],

  navigation: [
    { label: "About", href: "/about" },
    { label: "Practice Areas", href: "/practice-areas" },
    { label: "People", href: "/people" },
    { label: "News & Insights", href: "/news" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  /** Shown in the footer. Use full https:// URLs. */
  socialLinks: [] as { label: string; href: string }[],
  footerText:
    "Calder Whitmore LLP is a fictional law firm within the GTA World roleplay community. Nothing on this website is real-world legal advice.",

  heroEyebrow: "Attorneys at law · Pillbox Hill, Los Santos",
  heroTitle: "Steady counsel when the stakes are high.",
  heroText:
    "Calder Whitmore represents individuals and businesses across Los Santos and Blaine County in criminal, civil, family and commercial matters. We tell you where you stand, and then we go to work.",
  homeSections: {
    showPracticeAreas: true,
    showAttorneys: true,
    showProcess: true,
    showArticles: true,
    showCareers: true,
    showContact: true,
  },
  roleplayNotice:
    "This is an in-character service. Never share genuine confidential legal material or real-world personal information with the firm.",
};
