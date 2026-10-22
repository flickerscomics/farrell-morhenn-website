// Reads the editable content in /content at build time. Files are YAML, or
// Markdown with a YAML header (the format Pages CMS edits). Anything missing
// or malformed stops the build with a message naming the file, so a bad edit
// never reaches the live site.

import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Article, ArticleType, Category, Faq, Milestone, Page, Person, PracticeArea, Settings, StaffRole, StaffStatus, Vacancy } from "./types";

const ROOT = path.join(process.cwd(), "content");

export class ContentError extends Error {}

type Raw = Record<string, unknown>;

function readYaml(rel: string): Raw {
  const file = path.join(ROOT, rel);
  try {
    const data = YAML.parse(fs.readFileSync(file, "utf8"));
    if (!data || typeof data !== "object") throw new Error("expected a set of fields");
    return data as Raw;
  } catch (e) {
    throw new ContentError(`content/${rel}: ${(e as Error).message}`);
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function readMarkdown(rel: string): { data: Raw; body: string } {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const m = FRONTMATTER.exec(text);
  if (!m) throw new ContentError(`content/${rel}: missing the "---" header block`);
  try {
    const data = (YAML.parse(m[1]) ?? {}) as Raw;
    return { data, body: m[2].trim() };
  } catch (e) {
    throw new ContentError(`content/${rel}: ${(e as Error).message}`);
  }
}

function collection(dir: string) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({ file: `${dir}/${f}`, base: f.replace(/\.md$/, ""), ...readMarkdown(`${dir}/${f}`) }));
}

// ─── Field helpers ──────────────────────────────────────────────────────────

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function str(d: Raw, key: string, file: string, required = false): string {
  const v = d[key];
  if (v === undefined || v === null || v === "") {
    if (required) throw new ContentError(`content/${file}: "${key}" is required`);
    return "";
  }
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  throw new ContentError(`content/${file}: "${key}" should be text`);
}

function bool(d: Raw, key: string, fallback: boolean): boolean {
  const v = d[key];
  return typeof v === "boolean" ? v : fallback;
}

function num(d: Raw, key: string, fallback: number): number {
  const v = Number(d[key]);
  return d[key] === undefined || d[key] === null || d[key] === "" || !Number.isFinite(v) ? fallback : v;
}

function list(d: Raw, key: string): string[] {
  const v = d[key];
  if (v === undefined || v === null || v === "") return [];
  if (!Array.isArray(v)) return [String(v)];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function slugOf(d: Raw, base: string, file: string) {
  const slug = str(d, "slug", file) || base;
  if (!SLUG.test(slug)) throw new ContentError(`content/${file}: slug "${slug}" may only use lowercase letters, numbers and hyphens`);
  return slug;
}

function oneOf<T extends string>(d: Raw, key: string, allowed: readonly T[], fallback: T, file: string): T {
  const v = str(d, key, file) || fallback;
  if (!(allowed as readonly string[]).includes(v)) {
    throw new ContentError(`content/${file}: "${key}" must be one of ${allowed.join(", ")} (found "${v}")`);
  }
  return v as T;
}

function date(d: Raw, key: string, file: string, required: boolean) {
  const v = str(d, key, file, required);
  if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v.slice(0, 10))) throw new ContentError(`content/${file}: "${key}" must be a date like 2026-10-22`);
  return v.slice(0, 10);
}

function objects(v: unknown): Raw[] {
  return Array.isArray(v) ? v.filter((x): x is Raw => !!x && typeof x === "object") : [];
}

// ─── Loaders ────────────────────────────────────────────────────────────────

const ROLES: readonly StaffRole[] = [
  "MANAGING_PARTNER", "PARTNER", "SENIOR_ATTORNEY", "ASSOCIATE_ATTORNEY", "PARALEGAL",
  "LEGAL_CLERK", "INVESTIGATOR", "OFFICE_MANAGER", "RECEPTIONIST", "ADMINISTRATIVE",
];
const STATUSES: readonly StaffStatus[] = ["ACTIVE", "ON_LEAVE", "INACTIVE", "DEPARTED"];
const ARTICLE_TYPES: readonly ArticleType[] = ["ANNOUNCEMENT", "LEGAL_ARTICLE", "RECRUITMENT", "COMMUNITY", "CASE_ANNOUNCEMENT"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

export function loadSettings(): Settings {
  const f = "settings.yml";
  const d = readYaml(f);
  const hours = objects(d.officeHours);
  if (hours.length !== 7) throw new ContentError(`content/${f}: officeHours needs exactly 7 days (Sunday first)`);
  const officeHours = hours.map((h, i) => {
    const open = str(h, "open", f) || "09:00";
    const close = str(h, "close", f) || "17:00";
    const closed = bool(h, "closed", false);
    if (!closed && (!TIME.test(open) || !TIME.test(close) || open >= close)) {
      throw new ContentError(`content/${f}: office hours for day ${i + 1} need times like 09:00 and 17:00, opening before closing`);
    }
    return { closed, open, close };
  });
  const links = (key: string) =>
    objects(d[key]).map((l) => ({ label: str(l, "label", f, true), href: str(l, "href", f, true) }));
  const colour = (key: string, fallback: string) => {
    const v = str(d, key, f) || fallback;
    if (!HEX.test(v)) throw new ContentError(`content/${f}: "${key}" must be a colour like #15233b`);
    return v;
  };
  const home = (d.homeSections ?? {}) as Raw;
  return {
    firmName: str(d, "firmName", f, true),
    shortName: str(d, "shortName", f) || str(d, "firmName", f, true),
    tagline: str(d, "tagline", f),
    colorPrimary: colour("colorPrimary", "#15233b"),
    colorAccent: colour("colorAccent", "#a8864f"),
    phone: str(d, "phone", f),
    email: str(d, "email", f),
    addressLines: list(d, "addressLines"),
    locationNote: str(d, "locationNote", f),
    timezone: str(d, "timezone", f) || "America/Los_Angeles",
    officeHours,
    contactMethods: list(d, "contactMethods"),
    consultationTypes: list(d, "consultationTypes"),
    appointmentMinutes: num(d, "appointmentMinutes", 45),
    navigation: links("navigation"),
    socialLinks: links("socialLinks"),
    footerText: str(d, "footerText", f),
    heroEyebrow: str(d, "heroEyebrow", f),
    heroTitle: str(d, "heroTitle", f, true),
    heroText: str(d, "heroText", f),
    homeSections: {
      showPracticeAreas: bool(home, "showPracticeAreas", true),
      showAttorneys: bool(home, "showAttorneys", true),
      showProcess: bool(home, "showProcess", true),
      showArticles: bool(home, "showArticles", true),
      showCareers: bool(home, "showCareers", true),
      showContact: bool(home, "showContact", true),
    },
    confidentialityNotice: str(d, "confidentialityNotice", f),
  };
}

export function loadPracticeAreas(): PracticeArea[] {
  return collection("practice-areas").map(({ file, base, data, body }) => ({
    slug: slugOf(data, base, file),
    order: num(data, "order", 999),
    name: str(data, "name", file, true),
    shortDescription: str(data, "shortDescription", file, true),
    overview: body,
    matterTypes: list(data, "matterTypes"),
    services: list(data, "services"),
    isFeatured: bool(data, "isFeatured", false),
    published: bool(data, "published", true),
  }));
}

export function loadPeople(): Person[] {
  return collection("people").map(({ file, base, data, body }) => ({
    slug: slugOf(data, base, file),
    order: num(data, "order", 999),
    fullName: str(data, "fullName", file, true),
    title: str(data, "title", file, true),
    role: oneOf(data, "role", ROLES, "ADMINISTRATIVE", file),
    status: oneOf(data, "status", STATUSES, "ACTIVE", file),
    published: bool(data, "published", true),
    isLeadership: bool(data, "isLeadership", false),
    isFeatured: bool(data, "isFeatured", false),
    acceptsConsultations: bool(data, "acceptsConsultations", false),
    portrait: str(data, "portrait", file) || undefined,
    shortBio: str(data, "shortBio", file),
    biography: body,
    background: str(data, "background", file),
    qualifications: str(data, "qualifications", file),
    barAdmissions: str(data, "barAdmissions", file),
    languages: list(data, "languages"),
    notableCases: str(data, "notableCases", file),
    achievements: str(data, "achievements", file),
    email: str(data, "email", file),
    phone: str(data, "phone", file),
    joinedYear: num(data, "joinedYear", 0) || undefined,
    practiceAreas: list(data, "practiceAreas"),
  }));
}

export function loadArticles(): Article[] {
  return collection("articles").map(({ file, base, data, body }) => ({
    slug: slugOf(data, base, file),
    title: str(data, "title", file, true),
    summary: str(data, "summary", file, true),
    body,
    type: oneOf(data, "type", ARTICLE_TYPES, "LEGAL_ARTICLE", file),
    category: str(data, "category", file, true),
    tags: list(data, "tags"),
    author: str(data, "author", file) || null,
    publishedOn: date(data, "publishedOn", file, true),
    draft: bool(data, "draft", false),
    isFeatured: bool(data, "isFeatured", false),
    practiceAreas: list(data, "practiceAreas"),
  }));
}

export function loadVacancies(): Vacancy[] {
  return collection("careers").map(({ file, base, data, body }) => ({
    slug: slugOf(data, base, file),
    order: num(data, "order", 999),
    title: str(data, "title", file, true),
    department: str(data, "department", file),
    employmentType: str(data, "employmentType", file),
    summary: str(data, "summary", file, true),
    description: body,
    responsibilities: list(data, "responsibilities"),
    requirements: list(data, "requirements"),
    status: oneOf(data, "status", ["OPEN", "CLOSED", "DRAFT"] as const, "DRAFT", file),
    closesOn: date(data, "closesOn", file, false) || undefined,
  }));
}

export function loadPages(): Page[] {
  return collection("pages").map(({ file, base, data, body }) => ({
    slug: base,
    title: str(data, "title", file, true),
    summary: str(data, "summary", file),
    metaDescription: str(data, "metaDescription", file),
    updatedOn: date(data, "updatedOn", file, false) || "2026-10-22",
    sections: objects(data.sections).map((s) => ({ heading: str(s, "heading", file), body: str(s, "body", file) })),
    body,
  }));
}

export function loadFaqs(): { categories: Category[]; questions: Faq[] } {
  const f = "faqs.yml";
  const d = readYaml(f);
  return {
    categories: objects(d.categories).map((c) => ({ slug: str(c, "slug", f, true), name: str(c, "name", f, true) })),
    questions: objects(d.questions).map((q) => ({
      category: str(q, "category", f, true),
      question: str(q, "question", f, true),
      answer: str(q, "answer", f, true),
      practiceArea: str(q, "practiceArea", f) || undefined,
    })),
  };
}

export function loadArticleCategories(): Category[] {
  const f = "article-categories.yml";
  return objects(readYaml(f).categories).map((c) => ({ slug: str(c, "slug", f, true), name: str(c, "name", f, true) }));
}

export function loadMilestones(): Milestone[] {
  const f = "milestones.yml";
  return objects(readYaml(f).milestones).map((m) => ({
    year: str(m, "year", f, true),
    title: str(m, "title", f, true),
    description: str(m, "description", f),
  }));
}
