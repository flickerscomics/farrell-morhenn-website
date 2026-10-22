# Calder Whitmore LLP: GTA World roleplay law firm website

A full-stack website and practice-management system for **Calder Whitmore LLP**, a *fictional* law firm operating in Los Santos, San Andreas, within the GTA World text-based roleplay community.

> Everything here is fictional. The firm, its people, its qualifications, its addresses and its cases exist only in character. Nothing in this application is real-world legal advice, and it must not be used to handle genuine legal matters or real personal data.

It has three parts:

- **Public website:** home, about, practice areas, people directory and profiles, news and articles, FAQ, careers, contact, privacy, terms and a roleplay disclaimer.
- **Intake workflows:** general enquiries, practice-area intake questions, consultation requests and recruitment applications. Each one is stored in the database and gets a reference number.
- **Administration area:** dashboard, enquiries, appointments, matters (timeline, deadlines, private notes, documents, client messaging), recruitment, content management, staff accounts, roles and permissions, site settings, media library and an audit log.
- **Client portal:** clients register, see the matters the firm shares with them, read shared updates, exchange documents and message their legal team.

---

## Architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 15** (App Router, React 19, TypeScript) | One codebase for server-rendered pages, server actions and route handlers |
| Database | **PostgreSQL** via **Prisma 6** | Relational schema, migrations, type-safe queries (parameterised, so no SQL injection) |
| Validation | **Zod** | The same schemas run in the browser for quick feedback and on the server for enforcement |
| Styling | Hand-written CSS design system (`src/app/globals.css`, `src/app/admin/admin.css`) | Small, consistent and themeable from settings, with no UI framework |
| Fonts | Self-hosted Source Serif 4 and Public Sans (`@fontsource`) | No third-party font requests at runtime |
| Images | **sharp** | Uploaded images are validated, resized, re-encoded and stripped of metadata |
| Markdown | **react-markdown** (raw HTML disabled) | Safe rich text for articles, pages and profiles |
| Tests | **Vitest** (unit and integration against a real Postgres test DB), **Playwright** (end-to-end against the production build) | |

```
law-firm/
├── prisma/
│   ├── schema.prisma          Data model (users, roles, sessions, content, enquiries, appointments, matters, files, audit…)
│   ├── migrations/            SQL migrations
│   ├── seed.ts                Idempotent seed: settings, roles, sample content (and optional demo data)
│   └── seed-data/             Fictional practice areas, people, articles, FAQs, vacancies, pages
├── scripts/                   Admin bootstrap and password-reset CLIs
├── src/
│   ├── middleware.ts          Optimistic redirects for /admin and /portal (real checks happen server-side)
│   ├── app/
│   │   ├── (site)/            Public website, public form actions, client portal
│   │   ├── admin/(auth)/      Staff sign-in and password reset
│   │   ├── admin/(panel)/     Administration area (every page and action checks permissions)
│   │   ├── files/[id]/        Authenticated private-document downloads
│   │   ├── media/[id]/        Public image delivery
│   │   ├── sitemap.ts, robots.ts, icon.svg, not-found.tsx, error.tsx
│   ├── components/            Design-system components, forms, admin editors
│   ├── lib/                   Shared code: validation, permissions, time zones, labels, intake forms
│   └── server/                Server-only code: auth, sessions, security, uploads, audit, services
├── tests/                     Vitest unit and integration tests
└── e2e/                       Playwright end-to-end tests
```

### Key design decisions

- **Database-driven content.** Practice areas, people, articles, FAQs, pages, milestones, vacancies, navigation, contact details, office hours, colours and homepage sections can all be edited from the admin area without changing code. Pages render on each request (`dynamic = "force-dynamic"`), so edits appear immediately.
- **Server-side authorisation everywhere.** Each admin page and server action calls `requirePermission(...)`. Hiding links is never relied on. Matter access is also checked per row (see below).
- **Public queries select fields explicitly** (`src/server/public.ts`), so private data such as notes, internal links and staff accounts can't leak into page data.
- **Business logic lives in `src/server/services/*`** and takes an explicit actor, so it can be tested without a web request.

---

## Prerequisites

- Node.js **20.9+** (developed on Node 22)
- PostgreSQL **14+**
- For end-to-end tests: Playwright's Chromium (`npx playwright install chromium`)

## Installation

```bash
cd law-firm
npm install
cp .env.example .env        # then edit .env (see below)
npm run db:deploy           # apply migrations
npm run db:seed             # settings, roles and fictional sample content
npm run admin:create        # create the first super administrator (prompts for a password)
npm run dev                 # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for the application |
| `TEST_DATABASE_URL` | Disposable database for `npm test`. **Its tables are emptied by the tests.** |
| `E2E_DATABASE_URL` | Disposable database for `npm run test:e2e`. The name must contain `e2e`. **It is emptied and re-seeded on every run.** |
| `APP_SECRET` | 32+ character random secret used to sign anti-spam form tokens and hash IP addresses |
| `SITE_URL` | Public base URL (canonical links, sitemap, reset links) |
| `STORAGE_DIR` | Directory for uploaded files. Keep it **outside** any public web root and back it up. |
| `MAX_UPLOAD_MB` | Upload size limit (default 8, max 25) |
| `INSECURE_COOKIES` | Only set to `true` when serving plain HTTP behind a TLS-terminating proxy; never otherwise |

`.env.example` contains placeholders only. Never commit `.env`.

### Database, migrations and seed data

- `npm run db:migrate`: create a new migration after editing `schema.prisma` (development).
- `npm run db:deploy`: apply pending migrations (production and CI).
- `npm run db:seed`: safe to run repeatedly. It only creates missing records and never overwrites content edited in the admin area.
- `SEED_DEMO_ACCOUNTS=true npm run db:seed`: **local evaluation only.** Also creates one demo staff account per role, with random passwords printed once to the console, plus a few operational records clearly labelled "Sample record".

All seeded content is fictional and marked as such. Replace it through the admin area.

---

## Running the tests

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm test             # Vitest: unit + integration (needs TEST_DATABASE_URL)
npm run build        # production build
npm run test:e2e     # Playwright against the production build (needs E2E_DATABASE_URL)
```

What is covered:

- **Unit:** time-zone conversion (including DST), office-hours and booking rules, validation schemas, intake-form configuration, permissions matrix, form tokens, password hashing, references, upload type detection, image re-encoding, size limits and path-traversal protection.
- **Integration (real PostgreSQL):** enquiry storage, server-side intake validation, idempotent and concurrent duplicate submissions, paused intake, appointment rules, recruitment against open and closed vacancies, matter row-level access (assigned, restricted, receptionist), enquiry-to-matter conversion in a transaction, appointment state machine and double-booking prevention, and private-file access rules for staff and clients.
- **End-to-end (browser):** public navigation, practice areas, directory search and filters, article search and draft privacy, FAQ filtering, 404, sitemap and robots, all public forms (validation, confirmation reference, duplicate handling, bad attachments, bot rejection), admin sign-in, receptionist restrictions, enquiry triage, enquiry-to-matter conversion, timeline, document upload and private download, the article publishing workflow, settings changes, the client portal (sharing, messaging and isolation between clients), and the mobile menu with no horizontal scrolling at phone width.

## Production build and deployment

```bash
npm ci
npm run db:deploy
npm run build
npm run start          # listens on port 3000 by default (use -p to change)
```

Deployment notes:

- Run behind HTTPS (for example nginx, Caddy or a platform load balancer). Session cookies are `Secure` in production.
- Persist `STORAGE_DIR` on durable disk. On container platforms, mount a volume there. Serverless platforms with ephemeral file systems are not suitable unless you adapt `src/server/uploads.ts` to object storage.
- The app trusts the first `X-Forwarded-For` hop for rate limiting, so make sure your proxy sets it.
- Security headers (CSP, frame denial, nosniff, referrer and permissions policies) are set in `next.config.ts`. `/admin` and `/portal` send `noindex` and `no-store`.
- Pages render per request. If traffic grows, put a CDN in front for `/media/*` (already cacheable) and consider caching public pages.
- Email delivery is **not** integrated. Password resets use one-time links that an administrator issues and passes on (for example in character or by private message).

## Backup and recovery

Back up **both** the database and `STORAGE_DIR`. They reference each other.

```bash
# Database
pg_dump --format=custom --file=lawfirm-$(date +%F).dump "$DATABASE_URL"
# Files
tar czf storage-$(date +%F).tgz -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
```

Restore into an empty database, then restore the files:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" lawfirm-YYYY-MM-DD.dump
tar xzf storage-YYYY-MM-DD.tgz -C /path/to/parent-of-storage
npm run db:deploy      # applies any migrations newer than the backup
```

Schedule both backups (for example nightly), keep several generations off the server, and test a restore regularly.

---

## Operating the system

### Initial administrator setup

1. Run `npm run admin:create` on the server. It asks for an email, a name and a password (at least 12 characters, not echoed). No default password exists anywhere.
2. Sign in at `/admin/login`.
3. Review **Website settings**: firm name, contact details, hours, colours, logo, navigation, consultation types and booking rules.
4. Create accounts for other staff under **Staff accounts**.

If every administrator is locked out, run `npm run admin:reset-password -- --email you@example.com` on the server.

### Accounts and roles

- **Staff accounts → New account** creates the account and shows a **one-time setup link** (valid 72 hours) for the person to choose their own password. Passwords are never sent or displayed.
- **Issue password reset link** on an account produces a new one-time link and revokes earlier unused ones. Deactivating an account, or changing its role, signs it out immediately.
- **Roles & permissions** lets administrators tick permissions per role. Built-in roles:

| Role | Summary |
| --- | --- |
| Super administrator | Everything, including role definitions. Always keep at least one (the system enforces this). |
| Managing partner | Everything except editing role definitions |
| Partner | All unrestricted matters, intake, recruitment, publishing, client accounts, audit log |
| Attorney | Intake, appointments, and the matters they lead or support. Can open matters and write articles. |
| Paralegal / legal assistant | Intake, appointments, and assigned matters including notes and documents. Cannot open or archive matters. |
| Receptionist | Enquiries and the appointment book only. **No access to matters.** |
| Content editor | Website content, media and vacancies only. No client or recruitment records. |

**Restricted matters** act as an ethical wall: only the lead attorney and listed supporting staff (and the super administrator) can see them, even if a role otherwise has "view all matters".

### Practice areas

**Website → Practice areas.** Edit the name, slug, descriptions, matter types, services, assigned people, visibility and order. The **Intake questions** builder adds extra questions (short text, long text, choice list or date) that appear on the enquiry form when a visitor picks that area. Answers are validated on the server and stored with their labels. Hide an area instead of deleting it once it has enquiries.

### People profiles and articles

- **People profiles:** biography, qualifications and bar admissions (in character), languages, practice areas, portrait upload, and status. Active and on-leave profiles are public when published; inactive and departed profiles are hidden. On-leave and non-consulting staff cannot be booked.
- **Articles:** new articles start as drafts. Writers (`content.articles`) can edit drafts; editors with `content.publish` can publish, schedule (future publication date), unpublish, archive or delete. **Preview** shows drafts exactly as they will appear. **Case announcements** can only be published after confirming they contain no client-identifying information. They can be started from a matter without copying any client data.

### Enquiries and appointments

- Every public enquiry gets a reference such as `ENQ-2026-7K2P9M`. Staff can assign it, set its status and priority, schedule a follow-up, add private notes, link appointments, and **convert it into a matter**. The original enquiry and its history are kept and linked.
- Consultation requests are stored as **requests** until staff confirm them. Staff can confirm the requested or alternative time (or another time), reschedule, decline, cancel, or mark the appointment completed or a no-show. Double-booking the same attorney is prevented. Times are entered and shown in the office timezone (default `America/Los_Angeles`) and stored in UTC. **There is no external calendar integration;** the appointment list is the firm's book. Phone bookings can be added with **Book an appointment**.

### Matters

Each matter has a reference (`CW-2026-0001`), client details, practice area, lead attorney and supporting staff, status, priority, follow-up date, a **timeline** of dated updates, hearings, filings and deadlines (with "done" tracking), **private notes**, **documents**, linked enquiries and appointments, and an audit history. To share a matter with a client, enter their portal email in **Client portal**. The client then sees only the status, lead attorney, timeline entries marked "share with client", documents marked as shared, and messages. Private notes are never shown to clients.

### Recruitment

Publish vacancies under **Website → Vacancies** (draft, open or closed, with an optional closing date). Applications (`APP-…`) appear under **Applications**, where you can filter them by role, vacancy and status, record decisions, add private notes, and archive or restore them.

---

## Security summary

- scrypt password hashing; database-backed sessions (random token, only its SHA-256 stored) in `HttpOnly` and `SameSite=Lax` cookies; sessions revoked on password change, deactivation or role change.
- Server-side permission checks on every admin page and action, plus row-level matter access and client ownership checks on every portal page, message, upload and download.
- CSRF: Next.js server actions only accept same-origin requests. Cookies are `SameSite=Lax`.
- XSS: React escaping, Markdown rendered without raw HTML, brand colours validated as hex before injection, strict-ish CSP.
- Abuse controls: signed form tokens (minimum fill time and idempotency), honeypot field, database-backed rate limits on forms, sign-in, registration, messages and uploads, plus content fingerprinting to catch resubmissions.
- Uploads: identified by content (magic bytes), restricted per purpose, size-limited, images re-encoded, stored under random names outside the web root, and served only through permission-checked routes. Missing and forbidden files return the same 404.
- Privacy: visitor IP addresses are stored only as keyed hashes. No analytics or tracking.
- Audit log of sign-ins, submissions, status changes, content, settings, role and account changes.

## Known limitations

- **No email or SMS delivery.** Notifications and password-reset links are handled manually by staff.
- **No external calendar sync**, and no payment, court-system or legal-database integrations (by design).
- The CSP allows inline scripts, which Next.js hydration requires without a nonce-based setup.
- `npm audit` reports advisories in build-time tooling only: the Prisma CLI's config loader (`deepmerge-ts`, `effect`) and the PostCSS version pinned inside Next.js. Runtime dependencies (Next.js 15.5.28, React 19.2.9, sharp 0.35.5) are on patched versions. Clearing the Prisma advisory needs the Prisma 7 major upgrade.
- File storage is local disk. Multi-server deployments need shared storage or an object-storage adapter.
