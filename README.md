# Farrell-Morhenn website

The website of **Farrell-Morhenn**, a law firm in Pillbox Hill, Los Santos, for the GTA World roleplay community. It is written to read as a genuine in-character law firm website, with no out-of-character wording on any page. It is a static site hosted free on **Cloudflare Pages**.

## Editing the website (no code needed)

Content is edited with **[Pages CMS](https://pagescms.org)**, a free editor for websites stored on GitHub.

### First-time setup (once)

1. Go to **https://app.pagescms.org** and choose **Sign in with GitHub**. Use the repository owner's account.
2. When asked, **install the Pages CMS GitHub App** and give it access to this repository.
3. Open this repository in Pages CMS. It reads the `.pages.yml` file and shows the editing menu.

### Day-to-day editing

The menu on the left has these sections:

| Section | What you can change |
| --- | --- |
| **Firm settings** | Firm name, tagline, colours, phone, email, where email links go (a web page instead of an email program), address, office hours, contact methods, consultation types, homepage title and text, which homepage sections appear, the main menu, footer notice, press office contact and the "About the firm" paragraph for press releases |
| **People** | Attorneys and staff: name, title, role, status, portrait, biography, practice areas, languages, contact details, qualifications. Add someone with **Add an entry**. |
| **Practice areas** | Each practice area's description, matters handled, services, and whether it's shown or featured |
| **News & articles** | Write, edit or schedule articles. Tick **Draft** to keep one hidden. |
| **Press releases** | Write, schedule, update and archive press releases, with BBCode formatting (see below) |
| **Vacancies** | Open (accepting applications), Closed (shown as closed) or Draft (hidden) |
| **FAQs** | Questions, answers and categories |
| **Website pages** | Homepage introduction and steps, About, Careers intro, Contact, Privacy, Terms, Legal disclaimer, history timeline, article categories, press release categories |

Press **Save** and Pages CMS saves the change to GitHub. The site republishes automatically a couple of minutes later.

**Good to know**

- **Web address fields** (on people, practice areas, articles and vacancies) are the page addresses. Use lowercase letters, numbers and hyphens, e.g. `jane-doe`. Changing one changes that page's link.
- **Staff status:** *Active* and *On leave* people are shown (on-leave staff can't be booked). *Inactive* and *Departed* people are hidden, as is anyone with *Show on the website* unticked.
- **Articles** appear on their publication date. The site rebuilds itself every hour, so a future-dated article appears within an hour of its date arriving.
- **Portraits:** upload an image in the person's **Portrait** field. Without one, the person's initials are shown.
- **Article categories:** the category dropdown on articles has a fixed list in `.pages.yml`. To add a category, add it under *Website pages → Article categories* **and** to that list.
- **Safety net:** each save is checked before it's published. If something is wrong (for example an article linked to a practice area that doesn't exist), the update stops, the live site stays as it was, and the error appears in the repository's **Actions** tab.

You can still edit the files in `content/` directly on GitHub if you prefer.

### Press releases

Each release has a headline, optional subheadline, status, release date and time, the line above the headline ("For immediate release", "Statement"…), dateline place, category, tags, summary, the release text, and optionally a pull quote, header image, downloads (PDF or image), media contact, people mentioned, related practice areas and related releases. The standard "About Farrell-Morhenn" paragraph is added at the end unless you untick it, and can be replaced for a single release.

- **Status:** *Draft* is hidden. *Published* is live from its release date and time. *Archived* leaves the press list, homepage and feed, but the page stays online with an "archived" notice so old links still work.
- **Scheduling:** set a future release date and time (in the firm's time zone). The release appears within an hour of that time. Leave the time blank for midnight.
- **Embargoes:** the repository is public, so the text of a scheduled release can be read on GitHub before it goes live. Keep a release as a *Draft*, or don't save it, until its text can be public. Private drafts arrive with the login system (see `docs/ROADMAP.md`).
- **Corrections:** fill in *Updated on* and the *Update note* to show a dated notice at the top.
- **Featured:** the newest featured release is highlighted at the top of the press page.
- **Categories:** to add one, add it under *Website pages → Press release categories* **and** to the category list of the *Press releases* section in `.pages.yml`.
- **Feed:** releases are published as an RSS feed at `/press/feed.xml`.

### Formatting press releases (BBCode)

Leave a blank line between paragraphs. A single line break is kept as a line break.

| Type this | To get |
| --- | --- |
| `[b]bold[/b]` `[i]italic[/i]` `[u]underline[/u]` `[s]strike[/s]` | Text styles |
| `[h2]Heading[/h2]` `[h3]Subheading[/h3]` | Headings |
| `[url=https://example.com]link text[/url]` | Link to another website |
| `[url=/contact]contact page[/url]` | Link to a page on this site |
| `[email]press@farrellmorhennlaw.com[/email]` | Email link |
| `[quote=Jane Doe, Senior Attorney]Quoted words[/quote]` | Quotation with attribution |
| `[list][*]First[*]Second[/list]` | Bulleted list (`[list=1]` numbers it, `[list=a]` letters it) |
| `[center]…[/center]` `[right]…[/right]` | Alignment |
| `[color=gold]…[/color]` | Colour: navy, gold, red, green or grey |
| `[size=large]…[/size]` | Size: small, large or x-large |
| `[img=Description]/images/press/photo.jpg[/img]` | An image uploaded through the editor |
| `[table][tr][th]Heading[/th][/tr][tr][td]Cell[/td][/tr][/table]` | Table |
| `[hr]` | Divider line |
| `[noparse][b]text[/b][/noparse]` | Shows BBCode exactly as typed |

Anything else, including HTML, is shown as plain text. Links may only go to web addresses, email addresses or pages on this site, and images must be uploaded to the site.

## Publishing

The live site is **https://farrell-morhenn.com**, built and hosted by **Cloudflare Pages** (project `farrell-morhenn`, also at `farrell-morhenn.pages.dev`).

- **Every push to `main`**, including every Pages CMS save, makes Cloudflare build the site (`npm run build`, output folder `out`) and publish it, usually within a couple of minutes. Other branches get preview links.
- **The same push runs the checks** (lint, types, content tests) in GitHub's **Actions** tab, under *Checks and scheduled publishing*. Cloudflare publishes without running them, so a red check there means something needs fixing.
- **Scheduled articles and press releases.** Once an hour, the same workflow builds the site and compares its sitemap with the live one. When something has come due, it asks Cloudflare to rebuild through a deploy hook, so Cloudflare only builds when something changed (the free plan allows 500 builds a month). To set it up: in Cloudflare open **Workers & Pages → farrell-morhenn → Settings → Builds → Deploy hooks**, add a hook for branch `main` and copy its URL. Then in GitHub open **Settings → Secrets and variables → Actions → New repository secret** and save the URL as `CLOUDFLARE_DEPLOY_HOOK`. Running the workflow by hand from the Actions tab always triggers a rebuild. (GitHub switches off hourly runs in a repository with no activity for 60 days. If that happens, re-enable the workflow from the **Actions** tab.)
- **DNS** is in Cloudflare: `farrell-morhenn.com` and `www` are proxied `CNAME` records pointing to `farrell-morhenn.pages.dev`, and Cloudflare manages the certificates.
- The old GitHub Pages address (`flickerscomics.github.io/farrell-morhenn-website/`) still redirects to the domain. The site no longer deploys there.

## Staff admin area (/admin)

Staff sign in at **https://farrell-morhenn.com/admin**. It runs on Cloudflare Pages Functions (`functions/api/[[path]].ts` → `src/server/`), with accounts in a Cloudflare D1 database. Saving commits to this repository through a GitHub App installed only on it, with the repository owner as author, and Cloudflare republishes the site as usual.

- **Accounts:** no public sign-up. An admin invites someone under **Staff accounts** and sends them the single-use link (valid 48 hours); they choose their own password. There is no email sending, so an admin also makes password reset links (valid 24 hours). Disabling an account, changing its role, or marking its profile Departed or Inactive signs the person out.
- **Roles:** built-in **Admin**, **Press editor** and **Staff member**, plus any custom roles, each with a permission checklist. The Admin role always has every permission and can't be changed or deleted. At least one active admin always remains, and nobody can grant a permission they don't hold.
- **Profiles:** staff linked to a profile edit their own biography, photo, languages, qualifications and contact details. Their changes wait in **Approvals** until an admin approves them (nobody approves their own). Names, job titles, web addresses, status and directory settings need the "change profile details" permission. Biographies use BBCode, like press releases.
- **Everything else** Pages CMS edits can be edited here too: the forms are built from `.pages.yml`, so a field added there appears in both editors.
- **Security:** PBKDF2-SHA256 password hashes, 8-hour sessions in a `__Host-` cookie (Secure, HttpOnly, SameSite=Strict), CSRF tokens and same-origin checks on every change, login rate limits and a 15-minute lockout after 5 wrong passwords, upload checks (real JPEG/PNG/WebP/GIF/PDF content, 3 MB), strict security headers on `/admin` (`public/_headers`), and an **Activity log** of sign-ins and changes.

### Setting it up (once)

In Cloudflare, under **Workers & Pages → farrell-morhenn → Settings**:

1. **Bindings:** a D1 database bound as `DB`. The tables are created automatically on first use.
2. **Variables and Secrets** (type *Secret*): `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY` (the whole `.pem` file), and `ADMIN_SETUP_CODE` (a long phrase of your choice, at least 12 characters).
3. Redeploy (**Deployments → … → Retry deployment**, or push any change), because new secrets apply to the next deployment.
4. Open **/admin**, enter the setup code and create the first admin account. Setup switches itself off once an account exists, and you can then delete `ADMIN_SETUP_CODE`.

Optional settings: `GITHUB_REPO` (default `flickerscomics/farrell-morhenn-website`), `GITHUB_BRANCH` (default `main`), and `PASSWORD_HASH_ITERATIONS` (default and maximum 100000). On the Workers **free plan** a request gets about 10 ms of CPU time. If signing in fails with a Cloudflare "exceeded resource limits" (1102) error, either lower `PASSWORD_HASH_ITERATIONS` (minimum 10000) or move to the Workers Paid plan.

Every save is a commit, and every commit is a Cloudflare build (500 a month on the free plan), so make several changes before saving where you can.

## What the site doesn't do

There are no public online forms or client portal. Visitors contact the firm by phone, through the online message link, or in person, as the Contact page explains. A full database-backed version (online forms, matter management, client portal) was built earlier and is preserved in this repository's history at commit `2fa7790`. It needs a Node.js host with PostgreSQL.

## For developers

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm test             # rule checks against sample content, plus a wording scan of /content
npm run test:e2e     # browser tests against a Pages-style build of the sample content (first time: npx playwright install chromium)

# Preview the built site (PAGES_BASE_PATH is only needed when serving under a sub-path):
npm run build
npm run preview
```

```
content/              Editable content (YAML, and Markdown with a YAML header)
functions/api/        Cloudflare Pages Functions entry for the admin API
src/server/           Admin API: accounts, roles, sessions, approvals, GitHub commits
src/components/admin/ Admin screens (/admin)
tests/fixtures/       Fixed sample content the tests run against (set with CONTENT_DIR), so the live site can change freely
.pages.yml            Pages CMS editing forms
public/images/        Uploaded images
src/lib/load.ts       Reads and validates /content at build time
src/lib/content.ts    Visibility rules and cross-reference checks
src/lib/bbcode.ts     BBCode parser (rendered by src/components/bbcode.tsx)
src/app/              Pages (Next.js static export)
src/components/       UI components
tests/, e2e/          Vitest and Playwright tests
.github/workflows/    Deployment and pull-request checks
```

Built with Next.js 15 (static export), React 19 and TypeScript. The site uses no analytics, cookies or tracking.
