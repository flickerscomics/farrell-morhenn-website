// Shapes of the site content. Everything under /content is fictional sample
// material for the GTA World roleplay setting and can be edited freely.

export type StaffRole =
  | "MANAGING_PARTNER"
  | "PARTNER"
  | "SENIOR_ATTORNEY"
  | "ASSOCIATE_ATTORNEY"
  | "PARALEGAL"
  | "LEGAL_CLERK"
  | "INVESTIGATOR"
  | "OFFICE_MANAGER"
  | "RECEPTIONIST"
  | "ADMINISTRATIVE";

/** ACTIVE and ON_LEAVE profiles are shown; INACTIVE and DEPARTED are hidden. */
export type StaffStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE" | "DEPARTED";

export type Person = {
  slug: string;
  fullName: string;
  title: string;
  role: StaffRole;
  status?: StaffStatus;
  published?: boolean;
  isLeadership?: boolean;
  isFeatured?: boolean;
  acceptsConsultations?: boolean;
  /** Optional portrait path under /public, e.g. "/images/people/eleanor-calder.jpg". */
  portrait?: string;
  shortBio: string;
  biography: string;
  background?: string;
  qualifications?: string;
  barAdmissions?: string;
  languages?: string[];
  notableCases?: string;
  achievements?: string;
  email?: string;
  phone?: string;
  joinedYear?: number;
  /** Practice area slugs. */
  practiceAreas: string[];
};

export type PracticeArea = {
  slug: string;
  name: string;
  shortDescription: string;
  /** Markdown. */
  overview: string;
  matterTypes: string[];
  services: string[];
  isFeatured?: boolean;
  published?: boolean;
};

export type ArticleType = "ANNOUNCEMENT" | "LEGAL_ARTICLE" | "RECRUITMENT" | "COMMUNITY" | "CASE_ANNOUNCEMENT";

export type Article = {
  slug: string;
  title: string;
  summary: string;
  /** Markdown. */
  body: string;
  type: ArticleType;
  /** Category slug. */
  category: string;
  tags: string[];
  /** Person slug, or null for "the firm". */
  author: string | null;
  /** YYYY-MM-DD. Articles dated in the future or marked draft are not published. */
  publishedOn: string;
  draft?: boolean;
  isFeatured?: boolean;
  /** Practice area slugs. */
  practiceAreas: string[];
};

export type Faq = { category: string; question: string; answer: string; practiceArea?: string };

export type Vacancy = {
  slug: string;
  title: string;
  department: string;
  employmentType: string;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  status: "OPEN" | "CLOSED" | "DRAFT";
  closesOn?: string;
};

export type PageSection = { heading: string; body: string };

export type Page = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  sections: PageSection[];
  metaDescription: string;
  updatedOn: string;
};
