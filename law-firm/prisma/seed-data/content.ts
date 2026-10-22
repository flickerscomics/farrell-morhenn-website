// Fictional sample content. Everything here describes the GTA World roleplay
// setting and is not real-world legal advice. Edit through the admin area.

import type { ArticleType, PublishStatus, VacancyStatus } from "@prisma/client";

export const ROLEPLAY_NOTE =
  "*This article describes the fictional legal framework of the GTA World roleplay community. It is not legal advice and does not apply to any real-world jurisdiction.*";

export const articleCategories = [
  { slug: "firm-news", name: "Firm news", description: "Announcements from Calder Whitmore." },
  { slug: "know-your-rights", name: "Know your rights", description: "Plain-language guides to common legal situations in Los Santos." },
  { slug: "business", name: "Business", description: "Legal topics for Los Santos businesses." },
  { slug: "careers", name: "Careers", description: "Recruitment news and opportunities." },
  { slug: "community", name: "Community", description: "Clinics, events and community legal information." },
  { slug: "case-notes", name: "Case notes", description: "Anonymised updates on concluded public matters." },
];

type SeedArticle = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  type: ArticleType;
  category: string;
  tags: string[];
  author: string | null;
  status: PublishStatus;
  daysAgo: number;
  isFeatured?: boolean;
  practiceAreas: string[];
};

export const articles: SeedArticle[] = [
  {
    slug: "traffic-stops-in-los-santos-what-to-expect",
    title: "Traffic stops in Los Santos: what to expect and what to say",
    summary:
      "A practical guide to traffic stops in the roleplay setting: your obligations, your rights and why staying calm matters.",
    type: "LEGAL_ARTICLE",
    category: "know-your-rights",
    tags: ["traffic", "police", "rights"],
    author: "eleanor-calder",
    status: "PUBLISHED",
    daysAgo: 4,
    isFeatured: true,
    practiceAreas: ["criminal-defence", "constitutional-and-civil-rights"],
    body: `${ROLEPLAY_NOTE}

Most encounters with law enforcement in Los Santos begin at the roadside. How a traffic stop unfolds can affect whether a minor matter stays minor.

## Your obligations

When signalled to stop, pull over safely and promptly. Turn off the engine, keep your hands visible and follow lawful instructions. You will usually be asked for a driver's licence, registration and proof of insurance.

## Your rights

- **You may remain silent.** Beyond identifying yourself where required, you do not have to answer questions about where you have been or where you are going.
- **You may decline a search.** Say clearly and calmly that you do not consent to a search of your vehicle. Do not physically resist if officers search anyway; the lawfulness of the search can be challenged later.
- **You may ask whether you are free to leave.** If you are not being detained, you may go.

## After the stop

Write down what happened as soon as you can: the time, the location, the officers' names or badge numbers and anything that was said. If you were cited or arrested, keep every document you were given.

## When to call a lawyer

If you were arrested, if your vehicle was searched, or if you believe you were treated unfairly, speak to a defence attorney before giving any further statement.`,
  },
  {
    slug: "what-to-bring-to-your-first-consultation",
    title: "What to bring to your first consultation",
    summary:
      "A short checklist to help you get the most from an initial meeting with one of our attorneys.",
    type: "COMMUNITY",
    category: "community",
    tags: ["consultations", "getting started"],
    author: "daniela-reyes",
    status: "PUBLISHED",
    daysAgo: 11,
    practiceAreas: ["consultation-and-document-drafting"],
    body: `${ROLEPLAY_NOTE}

An initial consultation is a chance for you to explain your situation and for us to tell you honestly how we can help. A little preparation makes it far more useful.

## Bring

1. **A short timeline.** Dates and events in order, in your own words.
2. **Names of the people involved**, as they exist in character.
3. **Any paperwork you have already received**, such as citations, notices or letters — in character only.
4. **Your questions.** Write them down so nothing is forgotten.

## Leave at home

Please do not bring or send genuine personal documents, real-world identification or anything that is not part of the roleplay. We will never ask for it.

## What happens next

At the end of the consultation we will explain the options we see, what we would recommend and what an engagement would involve. You are under no obligation to proceed.`,
  },
  {
    slug: "calder-whitmore-opens-paleto-bay-clinic",
    title: "Calder Whitmore to hold monthly legal clinics in Paleto Bay",
    summary:
      "From next month, our attorneys will hold a free walk-in clinic for Blaine County residents on the first Saturday of each month.",
    type: "ANNOUNCEMENT",
    category: "firm-news",
    tags: ["clinic", "Blaine County", "pro bono"],
    author: "marcus-whitmore",
    status: "PUBLISHED",
    daysAgo: 18,
    practiceAreas: [],
    body: `Residents of Blaine County often travel to Los Santos for even the simplest legal question. Starting next month, the firm will hold a free walk-in clinic in Paleto Bay on the first Saturday of every month.

## Details

- **Where:** Paleto Bay community centre (in character)
- **When:** First Saturday of the month, 11:00 to 14:00 Pacific Time
- **Who:** Any resident with a general legal question

Clinic sessions offer general information only. If a matter needs further work, we will explain how to make a formal enquiry.`,
  },
  {
    slug: "we-are-hiring-paralegals-and-associates",
    title: "We are recruiting: associate attorneys and paralegals",
    summary:
      "The firm is growing and is looking for an associate attorney and a paralegal to join the litigation team.",
    type: "RECRUITMENT",
    category: "careers",
    tags: ["recruitment", "careers"],
    author: "eleanor-calder",
    status: "PUBLISHED",
    daysAgo: 6,
    practiceAreas: [],
    body: `Calder Whitmore is recruiting for two positions in the litigation team: an associate attorney and a paralegal.

We are looking for people who write clearly, prepare carefully and enjoy working with clients. Prior experience in character is welcome but not required for the paralegal role; we train the right people.

Read the full descriptions and apply through our [careers page](/careers). Every application receives a reference number and is reviewed by a partner.`,
  },
  {
    slug: "small-business-contracts-five-clauses",
    title: "Five clauses every Los Santos small business contract should have",
    summary:
      "Clear payment terms, defined scope and a dispute process prevent most of the disagreements we see.",
    type: "LEGAL_ARTICLE",
    category: "business",
    tags: ["contracts", "small business"],
    author: "marcus-whitmore",
    status: "PUBLISHED",
    daysAgo: 25,
    practiceAreas: ["corporate-and-business", "contract-disputes"],
    body: `${ROLEPLAY_NOTE}

Most contract disputes we handle could have been avoided with a clearer agreement at the start. Whether you run a garage in La Mesa or a café in Vespucci, these five clauses are worth including.

## 1. Scope of work

Describe exactly what is being supplied, and what is not. Vague scope is the single most common source of disputes.

## 2. Price and payment terms

State the price, when it is due and what happens if payment is late.

## 3. Timing

Set out delivery dates and what happens if they are missed.

## 4. Termination

Explain how either side can end the agreement, and what is owed if they do.

## 5. Dispute resolution

Agree how disagreements will be handled — for example, a meeting between the owners, then mediation, before anyone goes to court.

If you would like an existing agreement reviewed, our business team offers fixed-scope document reviews.`,
  },
  {
    slug: "dismissal-in-vehicle-search-matter",
    title: "Charges dismissed after unlawful vehicle search",
    summary:
      "An anonymised note on a recently concluded criminal matter in which key evidence was excluded.",
    type: "CASE_ANNOUNCEMENT",
    category: "case-notes",
    tags: ["criminal defence", "search and seizure"],
    author: "eleanor-calder",
    status: "PUBLISHED",
    daysAgo: 33,
    practiceAreas: ["criminal-defence"],
    body: `${ROLEPLAY_NOTE}

The firm recently represented a client charged following a roadside vehicle search in South Los Santos. We argued that the search was conducted without consent, a warrant or a lawful basis.

The court agreed and excluded the evidence obtained during the search. The District Attorney's office subsequently dismissed the charges.

Details that could identify the client have been withheld. Past outcomes do not guarantee the result of any future matter; every case depends on its own facts.`,
  },
  {
    slug: "updated-office-hours-autumn",
    title: "Updated office hours",
    summary: "The Pillbox Hill office now opens on Saturday mornings for consultations by request.",
    type: "ANNOUNCEMENT",
    category: "firm-news",
    tags: ["office"],
    author: null,
    status: "DRAFT",
    daysAgo: 0,
    practiceAreas: [],
    body: `From the start of next month, the Pillbox Hill office will open on Saturdays from 10:00 to 14:00 Pacific Time for consultations by request.`,
  },
];

export const faqCategories = [
  { slug: "services", name: "Our services" },
  { slug: "consultations", name: "Requesting a consultation" },
  { slug: "enquiries", name: "Making an enquiry" },
  { slug: "after-submission", name: "After you submit" },
  { slug: "appointments", name: "Appointments" },
  { slug: "attorneys", name: "Contacting an attorney" },
  { slug: "careers", name: "Recruitment and applications" },
];

export const faqs: { category: string; question: string; answer: string }[] = [
  {
    category: "services",
    question: "Is Calder Whitmore a real law firm?",
    answer:
      "No. Calder Whitmore LLP is a fictional firm operating within the GTA World roleplay community. Nothing on this website is real-world legal advice, and we cannot represent anyone in a real legal matter.",
  },
  {
    category: "services",
    question: "What kinds of matters does the firm handle?",
    answer:
      "Our attorneys handle criminal defence, civil litigation, personal injury, family and business matters, property disputes and more. See the [practice areas](/practice-areas) page for the current list.",
  },
  {
    category: "services",
    question: "Do you take every case?",
    answer:
      "No. We review each enquiry and accept matters where we believe we can genuinely help. If we cannot take a matter, we will tell you promptly.",
  },
  {
    category: "consultations",
    question: "How do I request a consultation?",
    answer:
      "Use the [consultation request form](/consultation). Choose a preferred date and time and, if you like, a specific attorney. Requests are not confirmed until a member of staff contacts you.",
  },
  {
    category: "consultations",
    question: "Is there a charge for an initial consultation?",
    answer: "Initial consultations are free of charge in character. Any fee for further work is agreed with you before it starts.",
  },
  {
    category: "enquiries",
    question: "What should I include in an enquiry?",
    answer:
      "A short summary of what happened, the people involved (in character), any important dates and what you would like us to help with. General details are enough at this stage.",
  },
  {
    category: "enquiries",
    question: "Should I send documents with my enquiry?",
    answer:
      "Only if they are in-character documents that help explain the matter. Never send genuine confidential material or real-world personal information.",
  },
  {
    category: "after-submission",
    question: "What happens after I submit an enquiry?",
    answer:
      "You will receive a reference number straight away. A member of staff reviews every enquiry, usually within one in-character business day, and will contact you by your preferred method.",
  },
  {
    category: "after-submission",
    question: "I submitted the same form twice. Will that cause a problem?",
    answer:
      "No. Repeat submissions of the same form are recognised and linked to your original reference number.",
  },
  {
    category: "appointments",
    question: "What time zone are appointment times in?",
    answer: "All times on this website are shown in Pacific Time, the time zone of our Los Santos office.",
  },
  {
    category: "appointments",
    question: "Can I change or cancel an appointment?",
    answer:
      "Yes. Contact the office with your appointment reference number and we will reschedule or cancel it for you.",
  },
  {
    category: "attorneys",
    question: "How do I contact a particular attorney?",
    answer:
      "Each attorney's profile on the [people](/people) page has a button to request a consultation with them directly. You can also name a preferred attorney on the enquiry form.",
  },
  {
    category: "careers",
    question: "How do I apply to work at the firm?",
    answer:
      "Open vacancies are listed on the [careers](/careers) page, each with its own application form. You can also send a general application if no current vacancy fits.",
  },
  {
    category: "careers",
    question: "Will I hear back about my application?",
    answer:
      "Yes. Every application is reviewed and receives a decision. Keep your application reference number in case you need to contact us about it.",
  },
];

type SeedVacancy = {
  slug: string;
  title: string;
  department: string;
  employmentType: string;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  status: VacancyStatus;
};

export const vacancies: SeedVacancy[] = [
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

export const milestones = [
  { year: "2016", title: "The firm is founded", description: "Eleanor Calder opens a two-attorney criminal defence practice in Little Seoul." },
  { year: "2018", title: "Marcus Whitmore joins as named partner", description: "The firm becomes Calder Whitmore and opens its civil litigation and business practices." },
  { year: "2019", title: "Family practice opens", description: "Daniela Reyes joins to lead family law, divorce and custody work." },
  { year: "2021", title: "Move to Pillbox Hill", description: "The firm moves to the Arcadius Business Center to accommodate a growing team." },
  { year: "2024", title: "Blaine County clinics", description: "Monthly walk-in legal clinics begin in Paleto Bay." },
];

export const pages = [
  {
    slug: "home",
    title: "Independent counsel, prepared properly.",
    summary: "Our approach",
    metaDescription: "",
    body: `We are a mid-sized firm by design. Large enough to field a team for a serious trial, small enough that every client knows the name of the attorney responsible for their matter.

We begin every matter with an honest assessment of where you stand, explain the options in plain language, and agree the scope and cost of the work before it starts. Then we prepare as though the case will be tried, because that is how good settlements are won too.`,
    sections: [
      { heading: "Tell us what happened", body: "Send an enquiry or call the office. A short summary is enough to begin. Every enquiry receives a reference number." },
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
  },
  {
    slug: "contact",
    title: "Contact the office",
    summary: "Reach our Pillbox Hill office by phone, email or the enquiry form below.",
    metaDescription: "Office address, telephone, opening hours and enquiry form for Calder Whitmore LLP (fictional, GTA World roleplay).",
    body: `## Before you make an enquiry

It helps us respond quickly if you can include:

- A short summary of what happened and when
- The names of the other people or businesses involved, in character
- Any upcoming court dates or deadlines
- What you would like us to help with

General details are enough. Please do not send genuine confidential documents or real-world personal information.`,
    sections: [],
  },
  {
    slug: "privacy",
    title: "Privacy notice",
    summary: "How this roleplay website handles the information you submit.",
    metaDescription: "Privacy notice for the Calder Whitmore LLP roleplay website.",
    sections: [],
    body: `This website supports a fictional law firm within the GTA World roleplay community. This notice explains, in plain terms, what information the site handles and why.

## What we collect

- **Information you submit in forms**: character names, in-character contact details and descriptions of in-character matters.
- **Optional files** you choose to attach to an enquiry or application.
- **Accounts**: if you register for the client portal, your email address and a securely hashed password.
- **Technical data**: a one-way, keyed hash of your IP address is stored with submissions to prevent spam and abuse. We do not store your IP address itself.

We do not use advertising, analytics or tracking cookies. The only cookies set are those required to keep you signed in and to show short notifications.

## How it is used

Submissions are used only to run the roleplay: staff members of the firm read them and respond in character. Information is visible only to staff accounts with permission to see it.

## Real-world information

Please do not submit real-world personal information, genuine legal documents or anything confidential outside the game. If you have done so by mistake, contact the site administrators and it will be deleted.

## Retention and deletion

Records are kept while they are useful to the roleplay. You may ask the site administrators to delete your submissions or portal account at any time.`,
  },
  {
    slug: "terms",
    title: "Terms of use",
    summary: "The rules that apply when you use this website.",
    metaDescription: "Terms of use for the Calder Whitmore LLP roleplay website.",
    sections: [],
    body: `By using this website you agree to the following terms.

1. **Fictional purpose.** The website exists to support in-character roleplay within the GTA World community. It does not offer real legal services.
2. **No real-world advice.** Nothing on this site is legal advice for any real jurisdiction. Do not rely on it for real legal decisions.
3. **Acceptable use.** Do not submit unlawful, abusive or out-of-character harassing content, attempt to access accounts or records that are not yours, or interfere with the operation of the site.
4. **Your submissions.** You confirm that anything you submit is fictional roleplay content and that you have the right to share any files you upload.
5. **Availability.** The site is provided as-is by community volunteers and may change or be unavailable at any time.
6. **Accounts.** Keep your password private. Accounts may be suspended if these terms are broken.`,
  },
  {
    slug: "disclaimer",
    title: "Roleplay disclaimer",
    summary: "This firm, its people and its cases are fictional.",
    metaDescription: "Calder Whitmore LLP is a fictional law firm in the GTA World roleplay community.",
    sections: [],
    body: `**Calder Whitmore LLP is a fictional law firm.** It exists only within the GTA World roleplay community and the fictional state of San Andreas.

- The attorneys and staff described on this site are fictional characters. Their qualifications and bar admissions exist in character only.
- Articles describe the fictional legal framework of the roleplay setting. They are not real-world legal advice.
- Case announcements describe fictional in-character events.
- Addresses, telephone numbers and email addresses are fictional and work only in character.
- This website is not affiliated with Rockstar Games, Take-Two Interactive or any real law firm.

If you need help with a real legal matter, please contact a licensed attorney in your own jurisdiction.`,
  },
];
