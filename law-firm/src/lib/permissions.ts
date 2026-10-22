// Permission keys are stored on roles in the database. Roles are editable in
// the admin area; this file only defines which permissions exist and the
// defaults used when seeding.

export const PERMISSION_GROUPS = [
  {
    label: "General",
    permissions: [{ key: "dashboard.view", label: "View the dashboard overview" }],
  },
  {
    label: "Enquiries & intake",
    permissions: [
      { key: "enquiries.view", label: "View enquiries and intake submissions" },
      { key: "enquiries.manage", label: "Assign, update and add notes to enquiries" },
    ],
  },
  {
    label: "Appointments",
    permissions: [
      { key: "appointments.view", label: "View consultation requests and appointments" },
      { key: "appointments.manage", label: "Confirm, reschedule and update appointments" },
    ],
  },
  {
    label: "Matters",
    permissions: [
      { key: "matters.view_assigned", label: "View matters they lead or support" },
      { key: "matters.view_all", label: "View every unrestricted matter (restricted matters stay limited to their team)" },
      { key: "matters.create", label: "Open new matters and convert enquiries" },
      { key: "matters.edit", label: "Update matters, timelines and assignments they can view" },
      { key: "matters.notes", label: "Read and write private matter notes" },
      { key: "matters.documents", label: "Upload and download matter documents" },
      { key: "matters.archive", label: "Archive matters" },
    ],
  },
  {
    label: "Recruitment",
    permissions: [
      { key: "recruitment.view", label: "View recruitment applications" },
      { key: "recruitment.manage", label: "Update applications, notes and decisions" },
      { key: "content.vacancies", label: "Create and publish vacancies" },
    ],
  },
  {
    label: "Website content",
    permissions: [
      { key: "content.articles", label: "Write and edit articles" },
      { key: "content.publish", label: "Publish, unpublish and archive articles" },
      { key: "content.pages", label: "Edit website pages and milestones" },
      { key: "content.practice_areas", label: "Manage practice areas and intake forms" },
      { key: "content.staff", label: "Manage attorney and staff profiles" },
      { key: "content.faqs", label: "Manage FAQs" },
      { key: "media.manage", label: "Manage the public media library" },
    ],
  },
  {
    label: "Administration",
    permissions: [
      { key: "clients.manage", label: "Manage client portal accounts" },
      { key: "settings.manage", label: "Edit website configuration" },
      { key: "users.manage", label: "Manage staff accounts" },
      { key: "roles.manage", label: "Manage roles and permissions" },
      { key: "audit.view", label: "View the audit log" },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

/** Wildcard granted only to the super administrator role. */
export const WILDCARD = "*";

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

export function hasPermission(granted: readonly string[], permission: Permission): boolean {
  return granted.includes(WILDCARD) || granted.includes(permission);
}

export function hasAnyPermission(granted: readonly string[], permissions: readonly Permission[]) {
  return permissions.some((p) => hasPermission(granted, p));
}

const contentAll: Permission[] = [
  "content.articles",
  "content.publish",
  "content.pages",
  "content.practice_areas",
  "content.staff",
  "content.faqs",
  "content.vacancies",
  "media.manage",
];

export const DEFAULT_ROLES: {
  key: string;
  name: string;
  description: string;
  permissions: string[];
}[] = [
  {
    key: "super_admin",
    name: "Super administrator",
    description: "Unrestricted access, including roles and permissions. Keep this to one or two people.",
    permissions: [WILDCARD],
  },
  {
    key: "managing_partner",
    name: "Managing partner",
    description: "Runs the firm: every operational, content and staffing area except role definitions.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "roles.manage"),
  },
  {
    key: "partner",
    name: "Partner",
    description: "Full matter access and oversight of intake, recruitment and published content.",
    permissions: [
      "dashboard.view",
      "enquiries.view",
      "enquiries.manage",
      "appointments.view",
      "appointments.manage",
      "matters.view_assigned",
      "matters.view_all",
      "matters.create",
      "matters.edit",
      "matters.notes",
      "matters.documents",
      "matters.archive",
      "recruitment.view",
      "recruitment.manage",
      "content.articles",
      "content.publish",
      "clients.manage",
      "audit.view",
    ],
  },
  {
    key: "attorney",
    name: "Attorney",
    description: "Handles intake and works the matters they lead or support.",
    permissions: [
      "dashboard.view",
      "enquiries.view",
      "enquiries.manage",
      "appointments.view",
      "appointments.manage",
      "matters.view_assigned",
      "matters.create",
      "matters.edit",
      "matters.notes",
      "matters.documents",
      "content.articles",
      "clients.manage",
    ],
  },
  {
    key: "paralegal",
    name: "Paralegal / legal assistant",
    description: "Supports assigned matters and the intake queue. Cannot open or archive matters.",
    permissions: [
      "dashboard.view",
      "enquiries.view",
      "enquiries.manage",
      "appointments.view",
      "appointments.manage",
      "matters.view_assigned",
      "matters.edit",
      "matters.notes",
      "matters.documents",
    ],
  },
  {
    key: "receptionist",
    name: "Receptionist",
    description: "Front desk: incoming enquiries and the appointment book. No access to matters.",
    permissions: [
      "dashboard.view",
      "enquiries.view",
      "enquiries.manage",
      "appointments.view",
      "appointments.manage",
    ],
  },
  {
    key: "content_editor",
    name: "Content editor",
    description: "Maintains the public website. No access to client or recruitment records.",
    permissions: ["dashboard.view", ...contentAll],
  },
];

export const PERMISSION_LIST: { key: Permission; label: string }[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => ({ key: p.key as Permission, label: p.label as string })),
);
