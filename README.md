# Calder Whitmore LLP: GTA World roleplay law firm website

The website of **Calder Whitmore LLP**, a *fictional* law firm in Los Santos, San Andreas, for the GTA World text-based roleplay community. It is a static site hosted free on **GitHub Pages**.

> Everything here is fictional. The firm, its people, qualifications, addresses and cases exist only in character. Nothing on this site is real-world legal advice.

## What's on the site

- **Home:** introduction, featured practice areas, attorneys, how working with the firm works, latest articles, careers and office hours.
- **About:** history, mission, values, client approach, leadership and milestones.
- **Practice areas:** an overview of all 17 practice areas, each with its own page (matters handled, services, FAQs, team, related articles).
- **People:** directory with search and role and practice-area filters, plus a profile page for each person.
- **News & insights:** articles with search and category, type and tag filters.
- **FAQ:** grouped by category, searchable.
- **Careers:** open vacancies and how to apply in character.
- **Contact:** office address, in-character phone and email, hours (Pacific Time), and how to request a consultation.
- **Privacy, Terms, Roleplay disclaimer,** a 404 page, sitemap, robots.txt, favicon and social-sharing metadata.

### What a static site can't do

GitHub Pages only serves files: there is no server and no database. So the site has **no online forms, logins, admin dashboard or client portal**. Visitors contact the firm in character by in-game phone, email, forum private message or by visiting the office, as the Contact page explains. Search and filters run in the visitor's browser.

A full database-backed version (online enquiry and booking forms, admin dashboard, matter management and client portal) was built first and is preserved in this repository's history at commit `2fa7790`. It needs a Node.js host and PostgreSQL rather than GitHub Pages.

## Editing the content

All content lives in plain TypeScript files in [`content/`](content/). Edit them directly on GitHub (pencil icon) or locally. Each push to `main` republishes the site automatically.

| File | What it controls |
| --- | --- |
| `content/site.ts` | Firm name, tagline, colours, phone, email, address, office hours, navigation, footer, homepage text and sections, contact methods, consultation types |
| `content/practice-areas.ts` | Practice areas (set `published: false` to hide one) |
| `content/people.ts` | Attorneys and staff. `status`: `ACTIVE`, `ON_LEAVE` (shown, cannot be booked), `INACTIVE` or `DEPARTED` (hidden). `published: false` also hides someone. |
| `content/articles.ts` | News and articles (`draft: true` hides one; future `publishedOn` dates appear once the site is rebuilt after that date) |
| `content/faqs.ts` | FAQs and their categories (add `practiceArea` to show a question on that practice area's page instead) |
| `content/careers.ts` | Vacancies: `OPEN`, `CLOSED` or `DRAFT` (hidden) |
| `content/pages.ts` | Text of the homepage introduction, About, Careers intro, Contact, Privacy, Terms and Disclaimer |
| `content/milestones.ts` | History timeline on the About page |

Article bodies, biographies and page text use **Markdown** (`## Heading`, `**bold**`, lists, `[link](/contact)`). Raw HTML is ignored.

**Portraits:** add an image to `public/images/people/` and set `portrait: "/images/people/name.jpg"` on the person. Without a portrait, a monogram is shown.

The automated tests check content edits for broken references, such as a person linked to a practice area that doesn't exist.

## Publishing on GitHub Pages

1. In the repository on GitHub, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions** (one-time setup).
2. Push to `main`. The **Deploy to GitHub Pages** workflow (`.github/workflows/pages.yml`) lints, type-checks, tests, builds and publishes the site.
3. The site is served at `https://<username>.github.io/<repository-name>/`.

**Renaming the repository** needs no code changes. The workflow reads the address from GitHub's Pages settings on every build, so the next deploy uses the new name. Custom domains (Settings → Pages → Custom domain) work the same way.

Pull requests run the **CI** workflow (lint, types, content tests and browser tests) without deploying.

## Local development

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev                 # http://localhost:3000 (live reload)
npm run lint
npm run typecheck
npm test                    # content integrity tests
npm run test:e2e            # browser tests against a Pages-style build (first time: npx playwright install chromium)
```

To preview exactly what GitHub Pages will serve:

```bash
PAGES_BASE_PATH=/built-different npm run build
PAGES_BASE_PATH=/built-different npm run preview   # http://localhost:3000/built-different/
```

## Project structure

```
content/                 Site content (edit these)
public/                  Static files copied as-is (images, .nojekyll)
src/app/                 Pages (Next.js App Router, exported as static HTML)
src/components/          Layout, cards, filters and other UI
src/lib/                 Content access and visibility rules, labels, dates
scripts/serve.mjs        Local server that mimics GitHub Pages
tests/                   Content integrity tests (Vitest)
e2e/                     Browser tests (Playwright)
.github/workflows/       Pages deployment and pull-request CI
```

Built with Next.js 15 (static export), React 19 and TypeScript. Styling is a hand-written CSS design system and fonts are self-hosted. The site uses no analytics, cookies or tracking.
