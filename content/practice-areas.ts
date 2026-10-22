// Fictional practice areas for the GTA World roleplay setting.
// Edit, reorder or remove entries here; set `published: false` to hide one.

import type { PracticeArea } from "./types";

export const practiceAreas: PracticeArea[] = [
  {
    slug: "criminal-defence",
    name: "Criminal Defence",
    isFeatured: true,
    shortDescription:
      "Representation from first contact with the Los Santos Police Department through charging decisions, hearings and trial.",
    overview: `Being arrested or questioned in Los Santos is disorienting, and the decisions made in the first few hours often shape everything that follows. Our criminal defence team represents people at every stage of a San Andreas criminal matter, from the first interview at Mission Row to trial before the Superior Court.

We start by understanding what actually happened and what the prosecution can prove. We examine the stop, the search, the arrest report and any body-camera or dash-camera footage, and we test whether the charges filed match the evidence.

Where a matter can be resolved early — through dismissal, diversion or a negotiated outcome — we will tell you plainly whether that is in your interest. Where it cannot, we prepare for trial from the outset.`,
    matterTypes: [
      "Misdemeanour and felony charges",
      "Traffic and DUI offences",
      "Weapons and firearms charges",
      "Narcotics allegations",
      "Bail and pre-trial release",
      "Warrants and arrest-related questions",
    ],
    services: [
      "Attendance at police interviews",
      "Bail and release applications",
      "Review of arrest reports and footage",
      "Plea negotiation with the District Attorney's office",
      "Trial preparation and advocacy",
    ],
  },
  {
    slug: "civil-litigation",
    name: "Civil Litigation",
    isFeatured: true,
    shortDescription:
      "Disputes between individuals and businesses, handled with a clear view of cost, risk and the outcome you actually need.",
    overview: `Civil disputes in Los Santos range from unpaid invoices to complex commercial disagreements. We represent claimants and defendants in negotiations, demand correspondence and proceedings before the San Andreas civil courts.

Litigation is rarely the first or best option. We assess the strength of a claim, the realistic prospects of recovery and the cost of getting there before recommending a course of action. Many matters resolve through a well-prepared letter or a structured settlement discussion.

When a dispute does go to court, we handle pleadings, discovery, motions and hearings, and we keep you informed at each stage.`,
    matterTypes: [
      "Debt recovery and unpaid invoices",
      "Breach of contract claims",
      "Property damage claims",
      "Defamation and reputational disputes",
      "Partnership and shareholder disputes",
    ],
    services: [
      "Case assessment and strategy",
      "Demand letters and pre-action correspondence",
      "Settlement negotiation",
      "Court filings and hearings",
      "Enforcement of judgments",
    ],
  },
  {
    slug: "personal-injury",
    name: "Personal Injury",
    isFeatured: true,
    shortDescription:
      "Claims arising from road collisions, unsafe premises and other injuries caused by someone else's negligence.",
    overview: `Injuries change plans, finances and families. We represent people injured on the roads and freeways of Los Santos County, on unsafe premises, and through the negligence of businesses and individuals.

Our role is to establish what happened, who is responsible and what the injury has genuinely cost. We gather medical summaries, collision reports and witness accounts, and we present the claim to insurers and opposing parties with the evidence to support it.

Most personal injury matters settle. We prepare each one as though it will not.`,
    matterTypes: [
      "Vehicle and motorcycle collisions",
      "Pedestrian and cyclist injuries",
      "Slip, trip and premises liability",
      "Workplace injuries",
      "Injuries involving commercial vehicles",
    ],
    services: [
      "Liability assessment",
      "Insurance claim handling",
      "Compensation valuation",
      "Negotiation and settlement",
      "Litigation where settlement fails",
    ],
  },
  {
    slug: "family-law",
    name: "Family Law",
    shortDescription:
      "Calm, practical advice on family arrangements, separation, support and protective orders.",
    overview: `Family matters are personal and often urgent. We advise on separation, financial support, protective orders and arrangements for children, always with an eye on reducing conflict where that is possible.

We explain the options under San Andreas family law in plain terms, help you decide what you want to achieve and represent you in negotiation, mediation or the family court.`,
    matterTypes: [
      "Separation agreements",
      "Child and spousal support",
      "Protective and restraining orders",
      "Guardianship",
      "Prenuptial and postnuptial agreements",
    ],
    services: [
      "Initial advice sessions",
      "Negotiation and mediation support",
      "Agreement drafting",
      "Family court representation",
    ],
  },
  {
    slug: "divorce-and-custody",
    name: "Divorce and Custody Disputes",
    shortDescription:
      "Representation in divorce proceedings, property division and custody arrangements that put children first.",
    overview: `Divorce involves legal, financial and emotional decisions at once. We guide clients through the dissolution process, the division of marital property and the arrangements for children's care and contact.

Where parents can agree, we help them reach and formalise a parenting plan that will hold. Where they cannot, we prepare a clear, evidence-based case for the court.`,
    matterTypes: [
      "Contested and uncontested divorce",
      "Division of property and assets",
      "Custody and visitation",
      "Modification of existing orders",
      "Relocation disputes",
    ],
    services: [
      "Divorce petitions and responses",
      "Parenting plans",
      "Asset and property negotiations",
      "Custody hearings",
    ],
  },
  {
    slug: "corporate-and-business",
    name: "Corporate and Business Law",
    isFeatured: true,
    shortDescription:
      "Formation, governance and day-to-day legal support for Los Santos businesses, from sole traders to established companies.",
    overview: `Los Santos businesses need practical legal support that keeps pace with how they operate. We advise owners and directors on forming and structuring companies, governance, commercial agreements and the regulatory issues that come with trading in San Andreas.

We aim to be the firm a business calls before a problem becomes a dispute: reviewing contracts, documenting partnerships properly and helping owners understand their obligations.`,
    matterTypes: [
      "Business formation and structure",
      "Partnership and shareholder agreements",
      "Commercial contracts",
      "Business licensing questions",
      "Sale and purchase of businesses",
    ],
    services: [
      "Entity formation",
      "Contract drafting and review",
      "Governance documents",
      "Ongoing general counsel support",
    ],
  },
  {
    slug: "contract-disputes",
    name: "Contract Disputes",
    shortDescription:
      "Enforcing and defending agreements, from supplier contracts and service agreements to loans between individuals.",
    overview: `Contracts break down for many reasons: missed deliveries, unpaid work, unclear terms. We analyse the agreement and the conduct of both sides, advise on rights and remedies and pursue or defend the claim through negotiation or the courts.

We also review contracts before they are signed, which is almost always cheaper than disputing them afterwards.`,
    matterTypes: [
      "Non-payment and late payment",
      "Defective goods or services",
      "Termination disputes",
      "Loan and repayment disagreements",
    ],
    services: ["Contract analysis", "Demand correspondence", "Negotiated settlement", "Court proceedings"],
  },
  {
    slug: "employment-and-labour",
    name: "Employment and Labour Law",
    shortDescription:
      "Advice for employees and employers on wages, dismissals, workplace conduct and employment agreements.",
    overview: `Employment problems affect income and livelihoods. We advise employees on unpaid wages, unfair treatment and dismissal, and we help employers draft fair policies and handle workplace issues properly.

We are realistic about outcomes and costs, and we look for resolutions that let people move on.`,
    matterTypes: [
      "Unpaid wages and benefits",
      "Wrongful or retaliatory dismissal",
      "Workplace harassment and discrimination",
      "Employment contracts and handbooks",
    ],
    services: ["Employee advice", "Employer policy drafting", "Negotiated exits", "Claims and hearings"],
  },
  {
    slug: "property-and-real-estate",
    name: "Property and Real Estate Law",
    shortDescription:
      "Purchases, sales, title questions and property disputes across Los Santos and Blaine County.",
    overview: `Property is often the largest asset a person or business holds. We advise on the purchase and sale of residential and commercial property, title issues, boundary disagreements and disputes with contractors and neighbours.

From Vinewood Hills residences to Paleto Bay commercial units, we make sure the paperwork reflects the deal and that our clients understand what they are signing.`,
    matterTypes: [
      "Residential purchases and sales",
      "Commercial property transactions",
      "Title and ownership disputes",
      "Construction and contractor disputes",
    ],
    services: ["Transaction review", "Title review", "Dispute resolution", "Document drafting"],
  },
  {
    slug: "landlord-and-tenant",
    name: "Landlord and Tenant Disputes",
    shortDescription: "Leases, deposits, repairs and evictions, for tenants and landlords alike.",
    overview: `Housing disputes move quickly and the consequences can be serious. We advise tenants facing eviction, unfair deposit deductions or unsafe conditions, and landlords dealing with arrears or lease breaches.

We know the procedural requirements and timelines that apply, and we help clients act within them.`,
    matterTypes: ["Evictions", "Security deposit disputes", "Repairs and habitability", "Lease drafting and review"],
    services: ["Lease review", "Negotiation with the other party", "Eviction defence", "Court representation"],
  },
  {
    slug: "estate-planning-and-probate",
    name: "Estate Planning and Probate",
    shortDescription: "Wills, trusts and the administration of estates, handled with care and discretion.",
    overview: `Planning ahead protects the people who matter most. We prepare wills and trusts, advise on powers of attorney and guide executors through the probate process when a family member has passed away.

We take time to understand family circumstances and explain each step in plain language.`,
    matterTypes: ["Wills", "Trusts", "Powers of attorney", "Probate and estate administration", "Estate disputes"],
    services: ["Will drafting", "Trust preparation", "Executor guidance", "Probate filings"],
  },
  {
    slug: "immigration-and-residency",
    name: "Immigration and Residency",
    shortDescription:
      "Guidance on residency status, documentation and related proceedings within the San Andreas roleplay framework.",
    overview: `Residency questions can affect work, travel and family life. We advise on documentation, status applications and proceedings as they exist in the community's roleplay framework, and we help clients prepare the information they need.

This practice area operates entirely within the fictional setting and does not provide advice on real-world immigration law.`,
    matterTypes: ["Residency documentation", "Status applications", "Family-based applications", "Hearings and reviews"],
    services: ["Status assessment", "Application preparation", "Hearing representation"],
  },
  {
    slug: "constitutional-and-civil-rights",
    name: "Constitutional and Civil Rights",
    shortDescription: "Protecting speech, assembly, due process and equal treatment against government overreach.",
    overview: `Constitutional rights mean little if they cannot be enforced. We act for individuals and groups whose rights to speech, assembly, privacy, due process or equal treatment have been infringed by state or local government in San Andreas.

These matters can be complex and slow. We are candid about that and about the prospects of each case.`,
    matterTypes: ["Free speech and assembly", "Unlawful search and seizure", "Due process violations", "Discrimination by public bodies"],
    services: ["Rights assessment", "Complaints to public bodies", "Civil rights litigation"],
  },
  {
    slug: "police-misconduct",
    name: "Police Misconduct and Civil Liability",
    shortDescription:
      "Holding law enforcement agencies accountable for excessive force, unlawful arrest and other misconduct.",
    overview: `When officers of the LSPD, the Los Santos County Sheriff's Department or the San Andreas State Police act outside the law, the people affected are entitled to answers and, where appropriate, compensation.

We help clients file internal affairs complaints, request records and footage, and bring civil claims for excessive force, false arrest and malicious prosecution. We approach these matters carefully and with respect for the facts.`,
    matterTypes: ["Excessive force", "False arrest and imprisonment", "Malicious prosecution", "Property damage during searches"],
    services: ["Internal affairs complaints", "Records requests", "Civil liability claims", "Settlement negotiation"],
  },
  {
    slug: "appeals-and-post-conviction",
    name: "Appeals and Post-Conviction",
    shortDescription: "Reviewing convictions and sentences for legal error, and pursuing appeals and post-conviction relief.",
    overview: `A conviction is not always the end of a case. We review trial records for legal error, advise on the prospects of appeal and prepare written arguments for the appellate courts.

We also assist with post-conviction relief, including sentence review and record expungement where the framework allows it. Appeal deadlines are strict, so early contact matters.`,
    matterTypes: ["Criminal appeals", "Civil appeals", "Sentence review", "Expungement and record sealing"],
    services: ["Record review", "Appeal briefs", "Oral argument", "Post-conviction petitions"],
  },
  {
    slug: "administrative-and-regulatory",
    name: "Administrative and Regulatory Law",
    shortDescription: "Licensing, permits and dealings with San Andreas government agencies and boards.",
    overview: `Dealing with government agencies can be slow and opaque. We help businesses and individuals with licensing applications, permit refusals, regulatory investigations and appeals to administrative boards.

We understand how agencies make decisions and how to present a case that addresses their criteria.`,
    matterTypes: ["Business and liquor licensing", "Firearm and professional licences", "Permit refusals", "Regulatory investigations"],
    services: ["Application support", "Responses to agency notices", "Administrative appeals"],
  },
  {
    slug: "consultation-and-document-drafting",
    name: "Legal Consultation and Document Drafting",
    isFeatured: true,
    shortDescription: "Fixed-scope advice sessions and carefully drafted documents for everyday legal needs.",
    overview: `Not every legal question needs a full engagement. We offer focused consultations for people who want to understand their position, and we draft and review documents ranging from simple agreements to formal letters.

The scope and fee are agreed in character before work begins.`,
    matterTypes: ["General legal questions", "Agreements between individuals", "Formal letters and notices", "Affidavits and declarations"],
    services: ["One-off consultations", "Document drafting", "Document review", "Notarial support where available"],
  },
];
