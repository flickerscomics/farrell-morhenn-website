# Farrell-Morhenn website

The website of **Farrell-Morhenn**, a law firm in Pillbox Hill, Los Santos, for the GTA World roleplay community. It is written to read as a genuine in-character law firm website, with no out-of-character wording on any page. It is a static site hosted free on **GitHub Pages**.

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
| **Firm settings** | Firm name, tagline, colours, phone, email, address, office hours, contact methods, consultation types, homepage title and text, which homepage sections appear, the main menu, footer notice |
| **People** | Attorneys and staff: name, title, role, status, portrait, biography, practice areas, languages, contact details, qualifications. Add someone with **Add an entry**. |
| **Practice areas** | Each practice area's description, matters handled, services, and whether it's shown or featured |
| **News & articles** | Write, edit or schedule articles. Tick **Draft** to keep one hidden. |
| **Vacancies** | Open (accepting applications), Closed (shown as closed) or Draft (hidden) |
| **FAQs** | Questions, answers and categories |
| **Website pages** | Homepage introduction and steps, About, Careers intro, Contact, Privacy, Terms, Legal disclaimer, history timeline, article categories |

Press **Save** and Pages CMS saves the change to GitHub. The site republishes automatically about a minute later.

**Good to know**

- **Web address fields** (on people, practice areas, articles and vacancies) are the page addresses. Use lowercase letters, numbers and hyphens, e.g. `jane-doe`. Changing one changes that page's link.
- **Staff status:** *Active* and *On leave* people are shown (on-leave staff can't be booked). *Inactive* and *Departed* people are hidden, as is anyone with *Show on the website* unticked.
- **Articles** appear on their publication date. One dated in the future appears after the next save made on or after that date.
- **Portraits:** upload an image in the person's **Portrait** field. Without one, the person's initials are shown.
- **Article categories:** the category dropdown on articles has a fixed list in `.pages.yml`. To add a category, add it under *Website pages → Article categories* **and** to that list.
- **Safety net:** each save is checked before it's published. If something is wrong (for example an article linked to a practice area that doesn't exist), the update stops, the live site stays as it was, and the error appears in the repository's **Actions** tab.

You can still edit the files in `content/` directly on GitHub if you prefer.

## Publishing on GitHub Pages

Publishing is automatic: every change to `main` runs the **Deploy to GitHub Pages** workflow, which checks, builds and publishes the site. Pages must be set to **Settings → Pages → Source: GitHub Actions**.

**Renaming the repository** needs no code changes. The address simply becomes `https://<owner>.github.io/<new-name>/`. Custom domains (Settings → Pages → Custom domain) work too.

## What a static site can't do

GitHub Pages only serves files, so the site has no online forms, logins, admin area or client portal. Visitors contact the firm by phone, email or in person, as the Contact page explains. A full database-backed version (online forms, admin dashboard, matter management, client portal) was built earlier and is preserved in this repository's history at commit `2fa7790`. It needs a Node.js host with PostgreSQL rather than GitHub Pages.

## For developers

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm test             # content checks, including a scan for out-of-character wording
npm run test:e2e     # browser tests against a Pages-style build (first time: npx playwright install chromium)

# Preview exactly what GitHub Pages serves:
PAGES_BASE_PATH=/farrell-morhenn-website npm run build
PAGES_BASE_PATH=/farrell-morhenn-website npm run preview
```

```
content/              Editable content (YAML, and Markdown with a YAML header)
.pages.yml            Pages CMS editing forms
public/images/        Uploaded images
src/lib/load.ts       Reads and validates /content at build time
src/lib/content.ts    Visibility rules and cross-reference checks
src/app/              Pages (Next.js static export)
src/components/       UI components
tests/, e2e/          Vitest and Playwright tests
.github/workflows/    Deployment and pull-request checks
```

Built with Next.js 15 (static export), React 19 and TypeScript. The site uses no analytics, cookies or tracking.
