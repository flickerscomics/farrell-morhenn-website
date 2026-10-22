// Permissions and the built-in roles. Shared by the server (which enforces
// them) and the admin screens (which only use them to hide what a person
// can't do).

export const PERMISSIONS = [
  { id: "profile.edit_own", label: "Edit their own profile", help: "Changes wait for approval unless they can also publish profile changes." },
  { id: "profile.edit_any", label: "Edit anyone's profile", help: "Changes wait for approval unless they can also publish profile changes." },
  { id: "profile.edit_details", label: "Change names, job titles, roles, status, web addresses and directory settings on profiles", help: "" },
  { id: "profile.publish", label: "Publish profile changes without approval", help: "" },
  { id: "profile.approve", label: "Approve or reject other people's profile changes", help: "" },
  { id: "press.write", label: "Write and edit press releases as drafts", help: "" },
  { id: "press.publish", label: "Publish, schedule and archive press releases", help: "" },
  { id: "pages.edit", label: "Edit website pages, practice areas, news, FAQs, careers and categories", help: "" },
  { id: "settings.edit", label: "Edit firm settings", help: "Address, phone, opening hours, menu, homepage and press office." },
  { id: "staff.manage", label: "Manage staff: add and remove profiles and accounts, send invitations and password resets", help: "" },
  { id: "roles.manage", label: "Create and edit roles and their permissions", help: "" },
  { id: "audit.view", label: "View the activity log", help: "" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["id"];
export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((p) => p.id);

export function isPermission(p: unknown): p is Permission {
  return typeof p === "string" && (ALL_PERMISSIONS as string[]).includes(p);
}

export const BUILT_IN_ROLES = [
  { id: "admin", name: "Admin", description: "Full control of the website, staff accounts and roles.", permissions: ALL_PERMISSIONS, isAdmin: true },
  { id: "press-editor", name: "Press editor", description: "Writes and publishes press releases, and edits their own profile.", permissions: ["profile.edit_own", "press.write", "press.publish"] as Permission[], isAdmin: false },
  { id: "staff", name: "Staff member", description: "Edits their own profile. Changes are approved by an admin.", permissions: ["profile.edit_own"] as Permission[], isAdmin: false },
];

/** Profile fields that need "profile.edit_details"; everything else on a profile is the person's own to edit. */
export const PROFILE_DETAIL_FIELDS = ["fullName", "slug", "title", "role", "status", "published", "order", "isLeadership", "isFeatured", "acceptsConsultations"];
