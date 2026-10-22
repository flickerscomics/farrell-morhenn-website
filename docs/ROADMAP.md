# Roadmap: staff logins, admin area and press tools

Agreed with the firm's owner in October 2026. Phases 1 and 2 are done; phases 3 and 4 are planned but **not built yet**.

## Approach: the static site plus a small login service

The public site stays a static site on Cloudflare Pages, with content in this repository. The staff area at `/admin` and its API (`/api/*`) run as Cloudflare Pages Functions in the same project, so the session cookie is first-party. Accounts, roles, sessions and the activity log live in a Cloudflare D1 database. When someone saves, the API checks their permissions and commits the change through a GitHub App installed only on this repository, with the owner (**flickerscomics**) as author and committer. The site then rebuilds as before, and the content checks in `src/lib/load.ts` and `src/lib/content.ts` still stop a bad edit from going live. The App's private key is stored only as an encrypted Cloudflare secret.

## Phase 1: Press releases and BBCode ✅

- `/press/` list with search, year, category and tag filters, a featured release and the press office contact.
- `/press/<release>/` with release line, dateline, BBCode body, pull quote, image, downloads, media contact, people, practice areas, "About the firm" boilerplate, update and archive notices, print/PDF, copy link and email.
- Draft, Published (with scheduled release date and time) and Archived statuses; the site rebuilds hourly.
- RSS feed at `/press/feed.xml`, homepage strip, sitemap entries.
- BBCode parser (`src/lib/bbcode.ts`, `src/components/bbcode.tsx`) with a fixed tag list, safe links and images, and no raw HTML.
- Edited through Pages CMS for now (plain text box).

## Phase 2: Login service and admin area ✅

Built in October 2026. See "Staff admin area" in the README for setup and day-to-day use.

- Pages Functions and D1: users, roles, sessions, invitations, rate limits, pending profile changes and the activity log, with tables created automatically (`src/server/db.ts`).
- **Accounts:** invitation-only, signing in with a username (no email addresses), with single-use links (48 hours for invitations, 24 for password resets). Disabling an account, changing its role, or marking its profile Departed or Inactive ends its sessions.
- **Security:**
  - PBKDF2-SHA256 password hashes, 100,000 iterations (the Workers maximum; Argon2id doesn't fit a Workers request). Minimum 12 characters, with checks against common passwords and the person's own name or username.
  - Server-side sessions in a `__Host-` cookie (Secure, HttpOnly, SameSite=Strict) lasting 8 hours.
  - CSRF tokens and same-origin checks on every change.
  - Login rate limiting per address, and a 15-minute lockout after 5 wrong passwords.
  - All permission checks on the server.
  - Strict security headers on `/admin`.
  - Every change recorded in the activity log, as well as in git history.
- **Roles and permissions:** built-in Admin, Press editor and Staff member, plus custom roles with a permission checklist (`src/server/permissions.ts`). The Admin role always has every permission and can't be changed or deleted. At least one active admin must remain, nobody can grant or act on permissions they don't hold, and nobody can change their own role.
- **Admin area:** a dashboard, staff accounts, roles, approvals, the activity log, password changes, and forms for everything Pages CMS edits (built from `.pages.yml`), with BBCode and Markdown previews and checked image and PDF uploads.
- **Profile approvals:** staff changes to profiles wait for approval by someone else with the approve permission. Approvers see a before/after comparison and can reject with a reason the person sees. Admins' own changes publish directly.
- **BBCode biographies:** profile biographies use the same BBCode as press releases.
- **Tests:** `tests/server/` runs the real API against SQLite and an in-memory repository: sign-in, lockouts, invitations, CSRF, roles and safeguards, approvals, uploads and GitHub App signing.

## Phase 3: Staff self-service and editor toolbar

- ✅ Staff editing their own profile (biography, photo, languages, qualifications, contact details, with a preview) arrived early, in Phase 2.
- ✅ BBCode toolbar (bold, italic, underline, strike, headings, link, quote, lists, centre, divider, image upload), Ctrl/Cmd+B/I/U shortcuts and a live preview using the same parser as the site.
- ✅ Builds saved: drafts and uploads don't rebuild the site, and Approve all publishes several approvals in one commit.
- Still to do if wanted: a side-by-side live preview of the whole profile page; private drafts and embargoes stored in the login service until release, instead of in the public repository.

## Phase 4: Hardening (two-step sign-in not wanted for now, October 2026)

- Two-factor authentication (authenticator app) for admins.
- Security review and tests for permissions, sessions, invitations and CSRF.
- Pages CMS switched off, or kept for the owner only as a back door.

## Decisions made

1. Staff profile edits wait for an admin's approval before they go live (October 2026).
2. Staff biographies use BBCode (October 2026).
