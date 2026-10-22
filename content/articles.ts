// Fictional articles for the GTA World roleplay setting. Add a new object to
// publish an article; set `draft: true` to keep it off the site.

import type { Article } from "./types";

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

export const articles: Article[] = [
  {
    slug: "traffic-stops-in-los-santos-what-to-expect",
    title: "Traffic stops in Los Santos: what to expect and what to say",
    summary:
      "A practical guide to traffic stops in the roleplay setting: your obligations, your rights and why staying calm matters.",
    type: "LEGAL_ARTICLE",
    category: "know-your-rights",
    tags: ["traffic", "police", "rights"],
    author: "eleanor-calder",
    publishedOn: "2026-10-18",
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
    publishedOn: "2026-10-11",
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
    publishedOn: "2026-10-04",
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
    publishedOn: "2026-10-16",
    practiceAreas: [],
    body: `Calder Whitmore is recruiting for two positions in the litigation team: an associate attorney and a paralegal.

We are looking for people who write clearly, prepare carefully and enjoy working with clients. Prior experience in character is welcome but not required for the paralegal role; we train the right people.

Read the full descriptions and how to apply on our [careers page](/careers). Every application is reviewed by a partner.`,
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
    publishedOn: "2026-09-27",
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
    publishedOn: "2026-09-19",
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
    draft: true,
    publishedOn: "2026-10-22",
    practiceAreas: [],
    body: `From the start of next month, the Pillbox Hill office will open on Saturdays from 10:00 to 14:00 Pacific Time for consultations by request.`,
  },
];

