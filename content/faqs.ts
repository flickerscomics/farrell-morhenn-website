// Fictional FAQs. Questions with a `practiceArea` slug appear on that
// practice area's page instead of the main FAQ page.

import type { Faq } from "./types";

export const faqCategories = [
  { slug: "services", name: "Our services" },
  { slug: "consultations", name: "Consultations" },
  { slug: "contacting", name: "Contacting the firm" },
  { slug: "appointments", name: "Appointments" },
  { slug: "attorneys", name: "Contacting an attorney" },
  { slug: "careers", name: "Recruitment and applications" },
];

export const faqs: Faq[] = [
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
      "Contact the office in character by phone, email, forum private message or in person (see [contact](/contact)). Tell us which attorney you would like to see, if any, and when you are available. A consultation is only confirmed once a member of staff agrees a time with you.",
  },
  {
    category: "consultations",
    question: "Is there a charge for an initial consultation?",
    answer: "Initial consultations are free of charge in character. Any fee for further work is agreed with you before it starts.",
  },
  {
    category: "contacting",
    question: "What should I tell the office when I first get in touch?",
    answer:
      "A short summary of what happened, the people involved (in character), any important dates and what you would like us to help with. General details are enough at this stage.",
  },
  {
    category: "contacting",
    question: "Should I send documents straight away?",
    answer:
      "Only in-character documents that help explain the matter, and only once an attorney asks for them. Never send genuine confidential material or real-world personal information.",
  },
  {
    category: "contacting",
    question: "What happens after I contact the office?",
    answer:
      "A member of staff reviews every enquiry, usually within one in-character business day, and contacts you by the method you used to reach us.",
  },
  {
    category: "appointments",
    question: "What time zone are appointment times in?",
    answer: "All times on this website are Pacific Time, the time zone of our Los Santos office.",
  },
  {
    category: "appointments",
    question: "Can I change or cancel an appointment?",
    answer: "Yes. Contact the office and we will reschedule or cancel it for you.",
  },
  {
    category: "attorneys",
    question: "How do I contact a particular attorney?",
    answer:
      "Each attorney's profile on the [people](/people) page lists how to reach them in character. You can also ask reception to put you in touch.",
  },
  {
    category: "careers",
    question: "How do I apply to work at the firm?",
    answer:
      "Open vacancies are listed on the [careers](/careers) page, each with instructions on how to apply in character. You are also welcome to send a general application if no current vacancy fits.",
  },
  {
    category: "careers",
    question: "Will I hear back about my application?",
    answer: "Yes. Every application is reviewed by a partner and receives a decision.",
  },
  {
    category: "services",
    practiceArea: "criminal-defence",
    question: "Should I speak to the police before talking to a lawyer?",
    answer:
      "You are entitled to remain silent and to ask for an attorney before answering questions. In the roleplay setting, it is almost always sensible to speak to defence counsel first.",
  },
  {
    category: "services",
    practiceArea: "personal-injury",
    question: "How long do I have to bring a personal injury claim?",
    answer:
      "Time limits apply under the community's legal framework. Contact us as early as possible so evidence can be preserved and deadlines are not missed.",
  },
  {
    category: "services",
    practiceArea: "civil-litigation",
    question: "Can you help if the other side has already filed in court?",
    answer: "Yes. Bring any papers you have been served (in character) to your consultation so we can check the deadlines.",
  },
];
