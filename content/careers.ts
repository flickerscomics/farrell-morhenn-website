// Fictional vacancies. Status OPEN shows the vacancy with application
// instructions, CLOSED shows it as closed, DRAFT hides it.

import type { Vacancy } from "./types";

export const vacancies: Vacancy[] = [
  {
    slug: "associate-attorney-litigation",
    title: "Associate Attorney — Litigation",
    department: "Litigation",
    employmentType: "Full-time (in character)",
    summary: "Handle a caseload of civil and criminal matters under the supervision of a partner.",
    description:
      "We are looking for an associate attorney to join the litigation team. You will run your own matters with partner supervision, appear in court and work directly with clients.",
    responsibilities: [
      "Manage a caseload of civil and criminal matters",
      "Prepare pleadings, motions and correspondence",
      "Appear at hearings and trials",
      "Meet clients and keep them informed",
    ],
    requirements: [
      "Admitted to the State Bar of San Andreas in character, or due to sit the bar",
      "Strong written roleplay and clear legal writing",
      "Regular availability during Pacific Time evenings",
    ],
    status: "OPEN",
  },
  {
    slug: "paralegal",
    title: "Paralegal",
    department: "Litigation",
    employmentType: "Part-time or full-time (in character)",
    summary: "Support attorneys with case preparation, deadlines and client communication.",
    description:
      "Our paralegals keep matters moving. No prior legal experience is required in character; we will train you. Attention to detail and reliability matter most.",
    responsibilities: [
      "Track deadlines and court dates",
      "Prepare document bundles and filings",
      "Assist with client intake and updates",
    ],
    requirements: ["Clear, careful writing", "Reliable availability", "Interest in legal roleplay"],
    status: "OPEN",
  },
  {
    slug: "receptionist",
    title: "Receptionist",
    department: "Office",
    employmentType: "Part-time (in character)",
    summary: "Welcome visitors, answer the main line and manage the appointment book.",
    description: "This position has been filled. Thank you to everyone who applied.",
    responsibilities: ["Greet visitors", "Answer the main line", "Manage the appointment book"],
    requirements: ["Friendly, professional manner", "Organised"],
    status: "CLOSED",
  },
  {
    slug: "investigator",
    title: "Investigator",
    department: "Litigation",
    employmentType: "Part-time (in character)",
    summary: "Gather evidence and interview witnesses for litigation matters.",
    description: "Draft vacancy — not yet published.",
    responsibilities: ["Visit scenes", "Interview witnesses", "Obtain records and footage"],
    requirements: ["Investigative roleplay experience"],
    status: "DRAFT",
  },
];

