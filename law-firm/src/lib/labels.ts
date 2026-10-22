// Human-readable labels for database enums. Safe to import in client components.

export const STAFF_ROLE_LABELS: Record<string, string> = {
  MANAGING_PARTNER: "Managing Partner",
  PARTNER: "Partner",
  SENIOR_ATTORNEY: "Senior Attorney",
  ASSOCIATE_ATTORNEY: "Associate Attorney",
  PARALEGAL: "Paralegal",
  LEGAL_CLERK: "Legal Clerk",
  INVESTIGATOR: "Investigator",
  OFFICE_MANAGER: "Office Manager",
  RECEPTIONIST: "Receptionist",
  ADMINISTRATIVE: "Administrative Staff",
};

export const ATTORNEY_ROLES = [
  "MANAGING_PARTNER",
  "PARTNER",
  "SENIOR_ATTORNEY",
  "ASSOCIATE_ATTORNEY",
] as const;

export const STAFF_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  INACTIVE: "Inactive",
  DEPARTED: "Departed",
};

export const ENQUIRY_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under review",
  AWAITING_INFORMATION: "Awaiting information",
  AWAITING_CLIENT_RESPONSE: "Awaiting client response",
  CONSULTATION_REQUESTED: "Consultation requested",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CLOSED: "Closed",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  RESCHEDULED: "Rescheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
  DECLINED: "Declined",
};

export const MATTER_STATUS_LABELS: Record<string, string> = {
  INTAKE: "Intake",
  CONFLICT_CHECK_PENDING: "Conflict check pending",
  AWAITING_ENGAGEMENT: "Awaiting engagement",
  ACTIVE: "Active",
  AWAITING_CLIENT: "Awaiting client",
  AWAITING_HEARING: "Awaiting hearing",
  ON_HOLD: "On hold",
  CONCLUDED: "Concluded",
  ARCHIVED: "Archived",
};

export const MATTER_EVENT_LABELS: Record<string, string> = {
  UPDATE: "Update",
  HEARING: "Hearing",
  DEADLINE: "Deadline",
  FILING: "Filing",
  MEETING: "Meeting",
  MILESTONE: "Milestone",
};

export const ARTICLE_TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT: "Firm announcement",
  LEGAL_ARTICLE: "Legal article",
  RECRUITMENT: "Recruitment",
  COMMUNITY: "Community information",
  CASE_ANNOUNCEMENT: "Case announcement",
};

export const PUBLISH_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const VACANCY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  UNDER_REVIEW: "Under review",
  INTERVIEW: "Interview",
  OFFERED: "Offered",
  HIRED: "Hired",
  UNSUCCESSFUL: "Unsuccessful",
  WITHDRAWN: "Withdrawn",
};

export const UPLOAD_PURPOSE_LABELS: Record<string, string> = {
  PORTRAIT: "Portrait",
  LOGO: "Logo",
  ARTICLE_IMAGE: "Article image",
  GENERAL_IMAGE: "Website image",
  ENQUIRY_ATTACHMENT: "Enquiry attachment",
  APPLICATION_ATTACHMENT: "Application attachment",
  MATTER_DOCUMENT: "Matter document",
  CLIENT_UPLOAD: "Client upload",
};

/** Maps a status value to a visual tone used by the StatusBadge component. */
export function statusTone(status: string): "neutral" | "info" | "warn" | "success" | "danger" | "muted" {
  switch (status) {
    case "NEW":
    case "REQUESTED":
    case "RECEIVED":
    case "INTAKE":
    case "DRAFT":
      return "info";
    case "UNDER_REVIEW":
    case "AWAITING_INFORMATION":
    case "AWAITING_CLIENT_RESPONSE":
    case "CONSULTATION_REQUESTED":
    case "CONFLICT_CHECK_PENDING":
    case "AWAITING_ENGAGEMENT":
    case "AWAITING_CLIENT":
    case "AWAITING_HEARING":
    case "RESCHEDULED":
    case "INTERVIEW":
    case "ON_HOLD":
    case "ON_LEAVE":
    case "HIGH":
      return "warn";
    case "ACCEPTED":
    case "CONFIRMED":
    case "ACTIVE":
    case "PUBLISHED":
    case "OPEN":
    case "OFFERED":
    case "HIRED":
    case "COMPLETED":
      return "success";
    case "DECLINED":
    case "CANCELLED":
    case "NO_SHOW":
    case "UNSUCCESSFUL":
    case "URGENT":
      return "danger";
    case "CLOSED":
    case "CONCLUDED":
    case "ARCHIVED":
    case "WITHDRAWN":
    case "INACTIVE":
    case "DEPARTED":
    case "LOW":
      return "muted";
    default:
      return "neutral";
  }
}
