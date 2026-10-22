// Fictional roleplay characters. Qualifications and admissions are established
// in character only. Edit through Admin → Content → People.

import type { StaffRole, StaffStatus } from "@prisma/client";

type SeedStaff = {
  slug: string;
  fullName: string;
  title: string;
  role: StaffRole;
  status?: StaffStatus;
  isPublished?: boolean;
  isLeadership?: boolean;
  isFeatured?: boolean;
  acceptsConsultations?: boolean;
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
  practiceAreas: string[];
};

export const staff: SeedStaff[] = [
  {
    slug: "eleanor-calder",
    fullName: "Eleanor Calder",
    title: "Managing Partner",
    role: "MANAGING_PARTNER",
    isLeadership: true,
    isFeatured: true,
    acceptsConsultations: true,
    shortBio:
      "Founder of the firm. Eleanor leads the criminal defence and civil rights practices and sets the firm's standards for client care.",
    biography: `Eleanor Calder founded the firm after a decade as a trial lawyer in the Los Santos public defender's office. She built the practice on a simple idea: clients deserve a lawyer who tells them the truth about their case and then fights for them.

She leads the firm's criminal defence and constitutional rights work and personally reviews every new serious criminal matter. Colleagues describe her as exacting, patient and very difficult to surprise in a courtroom.`,
    background:
      "Former trial attorney with the Los Santos County public defender's office. Opened the firm's first office in Little Seoul before moving to Pillbox Hill.",
    qualifications: "J.D., University of San Andreas, Los Santos (in character)",
    barAdmissions: "State Bar of San Andreas (in character)",
    languages: ["English", "French"],
    notableCases:
      "Led the defence in a widely reported vehicle-search case in which the evidence was excluded and the charges were dismissed. Client details are confidential.",
    achievements: "Chair of the firm's pro bono committee.",
    email: "e.calder@calderwhitmore.sa",
    joinedYear: 2016,
    practiceAreas: ["criminal-defence", "constitutional-and-civil-rights", "police-misconduct", "appeals-and-post-conviction"],
  },
  {
    slug: "marcus-whitmore",
    fullName: "Marcus Whitmore",
    title: "Partner",
    role: "PARTNER",
    isLeadership: true,
    isFeatured: true,
    acceptsConsultations: true,
    shortBio:
      "Marcus heads the civil litigation and business practices, advising Los Santos companies and the people who run them.",
    biography: `Marcus Whitmore joined Eleanor Calder as a named partner after several years in commercial practice downtown. He leads the firm's civil litigation, corporate and contract work.

Marcus is known for his preparation and for settling cases on good terms because the other side knows he is ready for trial. He also advises a number of small Los Santos businesses as their outside general counsel.`,
    background: "Commercial litigator in downtown Los Santos before joining the firm as a named partner.",
    qualifications: "J.D., Los Santos School of Law (in character)\nB.A. Economics (in character)",
    barAdmissions: "State Bar of San Andreas (in character)",
    languages: ["English"],
    achievements: "Regular speaker at the firm's small-business legal clinics.",
    email: "m.whitmore@calderwhitmore.sa",
    joinedYear: 2018,
    practiceAreas: ["civil-litigation", "corporate-and-business", "contract-disputes", "administrative-and-regulatory"],
  },
  {
    slug: "daniela-reyes",
    fullName: "Daniela Reyes",
    title: "Senior Attorney",
    role: "SENIOR_ATTORNEY",
    isFeatured: true,
    acceptsConsultations: true,
    shortBio:
      "Daniela advises on family law, divorce and custody, and residency matters, in English and Spanish.",
    biography: `Daniela Reyes leads the firm's family practice. She represents parents, spouses and guardians in negotiation and in the family court, with a strong preference for resolving matters in a way that protects children from conflict.

Raised in La Mesa, Daniela also advises on residency and documentation questions and works with clients in both English and Spanish.`,
    qualifications: "J.D., University of San Andreas, Los Santos (in character)\nCertificate in Family Mediation (in character)",
    barAdmissions: "State Bar of San Andreas (in character)",
    languages: ["English", "Spanish"],
    email: "d.reyes@calderwhitmore.sa",
    joinedYear: 2019,
    practiceAreas: ["family-law", "divorce-and-custody", "immigration-and-residency", "estate-planning-and-probate"],
  },
  {
    slug: "theo-okafor",
    fullName: "Theo Okafor",
    title: "Associate Attorney",
    role: "ASSOCIATE_ATTORNEY",
    isFeatured: true,
    acceptsConsultations: true,
    shortBio:
      "Theo represents people injured through negligence and those whose rights were violated by law enforcement.",
    biography: `Theo Okafor handles personal injury and police misconduct claims. Before law school he worked as a claims investigator, which shapes the careful, evidence-first way he builds each case.

He works closely with the firm's investigator to secure footage, reports and witness accounts early, while they are still available.`,
    background: "Former insurance claims investigator.",
    qualifications: "J.D., Los Santos School of Law (in character)",
    barAdmissions: "State Bar of San Andreas (in character)",
    languages: ["English", "Yoruba"],
    email: "t.okafor@calderwhitmore.sa",
    joinedYear: 2022,
    practiceAreas: ["personal-injury", "police-misconduct", "constitutional-and-civil-rights", "employment-and-labour"],
  },
  {
    slug: "grace-ashworth",
    fullName: "Grace Ashworth",
    title: "Associate Attorney",
    role: "ASSOCIATE_ATTORNEY",
    acceptsConsultations: true,
    shortBio: "Grace advises on property transactions, landlord and tenant disputes, and wills and estates.",
    biography: `Grace Ashworth advises individuals and small landlords on property purchases, leases and housing disputes, and prepares wills and trusts for clients across the county.

She is meticulous with documents and patient with clients who are dealing with a property or estate matter for the first time.`,
    qualifications: "J.D., University of San Andreas, Los Santos (in character)",
    barAdmissions: "State Bar of San Andreas (in character)",
    languages: ["English"],
    email: "g.ashworth@calderwhitmore.sa",
    joinedYear: 2023,
    practiceAreas: ["property-and-real-estate", "landlord-and-tenant", "estate-planning-and-probate", "consultation-and-document-drafting"],
  },
  {
    slug: "samuel-brandt",
    fullName: "Samuel Brandt",
    title: "Senior Attorney",
    role: "SENIOR_ATTORNEY",
    status: "ON_LEAVE",
    acceptsConsultations: false,
    shortBio: "Samuel handles appeals, post-conviction relief and administrative law. Currently on leave.",
    biography: `Samuel Brandt leads the firm's appellate work, reviewing trial records for legal error and preparing written arguments for the appellate courts. He also advises on licensing and regulatory matters.

Samuel is currently on leave. His matters are being handled by other members of the team in the meantime.`,
    qualifications: "J.D., Los Santos School of Law (in character)\nLL.M. in Appellate Practice (in character)",
    barAdmissions: "State Bar of San Andreas (in character)",
    languages: ["English", "German"],
    joinedYear: 2020,
    practiceAreas: ["appeals-and-post-conviction", "administrative-and-regulatory"],
  },
  {
    slug: "priya-raman",
    fullName: "Priya Raman",
    title: "Senior Paralegal",
    role: "PARALEGAL",
    shortBio: "Priya manages case files, court deadlines and document preparation for the litigation team.",
    biography: `Priya Raman keeps the litigation team's matters moving. She tracks court deadlines, prepares filing bundles and is often the first person clients speak to about the progress of their case.`,
    languages: ["English", "Tamil"],
    joinedYear: 2019,
    practiceAreas: ["civil-litigation", "criminal-defence"],
  },
  {
    slug: "callum-price",
    fullName: "Callum Price",
    title: "Legal Clerk",
    role: "LEGAL_CLERK",
    shortBio: "Callum supports the attorneys with research, records requests and courthouse filings.",
    biography: `Callum Price handles legal research and courthouse filings and manages the firm's records requests to public agencies.`,
    languages: ["English"],
    joinedYear: 2024,
    practiceAreas: [],
  },
  {
    slug: "jonah-mercer",
    fullName: "Jonah Mercer",
    title: "Investigator",
    role: "INVESTIGATOR",
    shortBio: "Jonah gathers evidence, locates witnesses and reviews footage for the firm's litigation matters.",
    biography: `Jonah Mercer works with the attorneys to establish the facts: visiting scenes, locating witnesses and securing footage before it is overwritten.`,
    languages: ["English"],
    joinedYear: 2021,
    practiceAreas: ["criminal-defence", "personal-injury", "police-misconduct"],
  },
  {
    slug: "lucia-moretti",
    fullName: "Lucia Moretti",
    title: "Office Manager",
    role: "OFFICE_MANAGER",
    shortBio: "Lucia runs the office, scheduling and billing, and oversees the firm's administrative staff.",
    biography: `Lucia Moretti keeps the office running: the appointment book, client accounts and the administrative team all report to her.`,
    languages: ["English", "Italian"],
    joinedYear: 2018,
    practiceAreas: [],
  },
  {
    slug: "tessa-vaughn",
    fullName: "Tessa Vaughn",
    title: "Receptionist",
    role: "RECEPTIONIST",
    shortBio: "Tessa is the first point of contact at the front desk and handles new enquiries and appointments.",
    biography: `Tessa Vaughn welcomes visitors to the Pillbox Hill office, answers the main line and routes new enquiries to the right attorney.`,
    languages: ["English"],
    joinedYear: 2024,
    practiceAreas: [],
  },
  {
    slug: "robert-hale",
    fullName: "Robert Hale",
    title: "Associate Attorney",
    role: "ASSOCIATE_ATTORNEY",
    status: "DEPARTED",
    isPublished: false,
    shortBio: "Former associate. This profile is retained for the firm's records and is not shown publicly.",
    biography: "Robert Hale was an associate in the civil litigation team.",
    languages: ["English"],
    joinedYear: 2020,
    practiceAreas: ["civil-litigation"],
  },
];
