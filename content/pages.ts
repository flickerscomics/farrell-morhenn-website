// Text for the site's fixed pages. Body and section text is Markdown.

import type { Page } from "./types";

export const pages: Page[] = [
  {
    slug: "home",
    title: "Independent counsel, prepared properly.",
    summary: "Our approach",
    metaDescription: "",
    body: `We are a mid-sized firm by design. Large enough to field a team for a serious trial, small enough that every client knows the name of the attorney responsible for their matter.

We begin every matter with an honest assessment of where you stand, explain the options in plain language, and agree the scope and cost of the work before it starts. Then we prepare as though the case will be tried, because that is how good settlements are won too.`,
    updatedOn: "2026-10-22",
    sections: [
      { heading: "Tell us what happened", body: "Call, email or visit the office in character. A short summary of your situation is enough to begin." },
      { heading: "We review it promptly", body: "A member of staff reviews each enquiry, usually within one in-character business day, and checks for conflicts of interest." },
      { heading: "Meet an attorney", body: "If we can help, we arrange a consultation to discuss your options, the likely course of the matter and what it will involve." },
      { heading: "Agree the engagement", body: "If you decide to proceed, we confirm the scope and fees in writing and a named attorney takes responsibility for your matter." },
    ],
  },
  {
    slug: "about",
    title: "About the firm",
    summary:
      "An independent Los Santos law firm built on candid advice, careful preparation and steady representation.",
    metaDescription: "The history, mission and values of Calder Whitmore LLP, a fictional Los Santos law firm in the GTA World roleplay community.",
    body: "",
    updatedOn: "2026-10-22",
    sections: [
      {
        heading: "Our history",
        body: `Calder Whitmore began in 2016 as a two-attorney criminal defence practice above a pharmacy in Little Seoul. Eleanor Calder had spent ten years as a public defender and wanted a firm where clients would always know where they stood.

Marcus Whitmore joined as a named partner in 2018, bringing a commercial litigation practice and a list of small-business clients. The firm has grown steadily since, adding family, property and personal injury practices, and in 2021 moved to the Arcadius Business Center in Pillbox Hill.`,
      },
      {
        heading: "Mission",
        body: "To give the people and businesses of Los Santos honest legal advice and determined representation, whatever the size of their matter.",
      },
      {
        heading: "Our values",
        body: `- **Candour.** We tell clients what we think, including when it is not what they hoped to hear.
- **Preparation.** Good outcomes come from knowing the file better than anyone else in the room.
- **Discretion.** What clients tell us stays with us.
- **Accessibility.** Plain language, clear fees agreed in advance and a lawyer who returns calls.`,
      },
      {
        heading: "How we work with clients",
        body: `Every matter has a named attorney who is responsible for it. At the start of an engagement we agree the scope of the work, how we will communicate and what it will cost, in character. We keep clients informed at each significant step and explain the options before decisions are made.`,
      },
    ],
  },
  {
    slug: "careers",
    title: "Careers at Calder Whitmore",
    summary: "Join a firm that values careful work, good writing and genuine teamwork.",
    metaDescription: "Current vacancies and how to apply to join Calder Whitmore LLP (fictional, GTA World roleplay).",
    body: `We are a small firm, which means everyone's work matters and everyone is known by name. New attorneys handle real matters early, with a partner always available for guidance. Paralegals and administrative staff are part of the team, not an afterthought.

We look for people who write clearly, prepare carefully and treat clients and colleagues with respect. Experience is welcome but character counts for more.`,
    sections: [],
    updatedOn: "2026-10-22",
  },
  {
    slug: "contact",
    title: "Contact the office",
    summary: "Reach our Pillbox Hill office in character by phone, email, forum message or in person.",
    metaDescription: "Office address, telephone, opening hours and how to get in touch with Calder Whitmore LLP (fictional, GTA World roleplay).",
    body: `## Before you get in touch

It helps us respond quickly if you can tell us:

- A short summary of what happened and when
- The names of the other people or businesses involved, in character
- Any upcoming court dates or deadlines
- What you would like us to help with
- Which attorney you would like to see, if any

General details are enough. Please do not send genuine confidential documents or real-world personal information.`,
    sections: [],
    updatedOn: "2026-10-22",
  },
  {
    slug: "privacy",
    title: "Privacy notice",
    summary: "What this roleplay website does, and does not do, with information about visitors.",
    metaDescription: "Privacy notice for the Calder Whitmore LLP roleplay website.",
    sections: [],
    updatedOn: "2026-10-22",
    body: `This website supports a fictional law firm within the GTA World roleplay community. It is a static website: it has no forms, accounts or database, and it does not collect information about you.

## What we collect

Nothing. The website does not use cookies, analytics, advertising or tracking scripts, and it does not ask you to submit any information.

## Hosting

The site is hosted on GitHub Pages. GitHub may record technical information such as IP addresses in its server logs for security purposes. See GitHub's own privacy statement for details.

## Contacting the firm

When you contact the firm in character (by in-game phone, email, forum message or in person), that conversation happens on the GTA World platforms, not on this website. Please do not share real-world personal information or genuine legal documents.`,
  },
  {
    slug: "terms",
    title: "Terms of use",
    summary: "The rules that apply when you use this website.",
    metaDescription: "Terms of use for the Calder Whitmore LLP roleplay website.",
    sections: [],
    updatedOn: "2026-10-22",
    body: `By using this website you agree to the following terms.

1. **Fictional purpose.** The website exists to support in-character roleplay within the GTA World community. It does not offer real legal services.
2. **No real-world advice.** Nothing on this site is legal advice for any real jurisdiction. Do not rely on it for real legal decisions.
3. **Roleplay conduct.** When contacting the firm in character, follow the GTA World community rules and do not share real-world personal information.
4. **Availability.** The site is provided as-is by community volunteers and may change or be unavailable at any time.`,
  },
  {
    slug: "disclaimer",
    title: "Roleplay disclaimer",
    summary: "This firm, its people and its cases are fictional.",
    metaDescription: "Calder Whitmore LLP is a fictional law firm in the GTA World roleplay community.",
    sections: [],
    updatedOn: "2026-10-22",
    body: `**Calder Whitmore LLP is a fictional law firm.** It exists only within the GTA World roleplay community and the fictional state of San Andreas.

- The attorneys and staff described on this site are fictional characters. Their qualifications and bar admissions exist in character only.
- Articles describe the fictional legal framework of the roleplay setting. They are not real-world legal advice.
- Case announcements describe fictional in-character events.
- Addresses, telephone numbers and email addresses are fictional and work only in character.
- This website is not affiliated with Rockstar Games, Take-Two Interactive or any real law firm.

If you need help with a real legal matter, please contact a licensed attorney in your own jurisdiction.`,
  },
];
