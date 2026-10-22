# Roadmap: staff logins, admin area and press tools

Agreed with the firm's owner in October 2026. Phase 1 is done; the rest is planned but **not built yet**.

## Approach: the static site plus a small login service

The public site stays a static site on Cloudflare Pages, with content in this repository. A small login service (Cloudflare Workers with a D1 database, free tier) hosts the editing area. When someone saves, the service checks their permissions and commits the change to this repository through a GitHub App installed on the owner's **flickerscomics** account, so every change is attributed to that account. The site then rebuilds as it does today, and the content checks in `src/lib/load.ts` and `src/lib/content.ts` still stop a bad edit from going live.

The editing area is served by the login service itself, so its session cookie is first-party. The GitHub App's private key is stored only as an encrypted Cloudflare secret, never in the code.

## Phase 1: Press releases and BBCode ✅

- `/press/` list with search, year, category and tag filters, a featured release and the press office contact.
- `/press/<release>/` with release line, dateline, BBCode body, pull quote, image, downloads, media contact, people, practice areas, "About the firm" boilerplate, update and archive notices, print/PDF, copy link and email.
- Draft, Published (with scheduled release date and time) and Archived statuses; the site rebuilds hourly.
- RSS feed at `/press/feed.xml`, homepage strip, sitemap entries.
- BBCode parser (`src/lib/bbcode.ts`, `src/components/bbcode.tsx`) with a fixed tag list, safe links and images, and no raw HTML.
- Edited through Pages CMS for now (plain text box).

## Phase 2: Login service and admin area

- Cloudflare Worker and D1: users, roles, sessions, invitations and the audit log.
- **Accounts:** no public sign-up. An admin adds a person and gets a single-use invitation link (expires after 48 hours) for them to set their own password. Resets work the same way. Disabling a person, or marking them Departed, ends their sessions.
- **Security:**
  - Argon2id password hashes, minimum 12 characters, with a check against common passwords.
  - Server-side sessions in a Secure, HttpOnly, SameSite=Strict cookie, lasting 8 hours.
  - CSRF tokens on every save.
  - Login rate limiting and temporary lockout.
  - All permission checks on the server.
  - Every change recorded in the audit log, as well as in git history.
- **Roles and permissions:**
  - Built-in roles: **Admin**, **Press editor** and **Staff member**.
  - Admins can **create custom roles** and edit any role's permissions from a checklist: edit own profile, edit any profile, change titles/status/page address, write press releases, publish press releases, edit pages, edit firm settings, manage staff, manage roles, view the audit log.
  - Safeguards: the Admin role always has every permission and can't be deleted. At least one admin must always remain. Nobody can grant a permission they don't hold. Role changes are audited.
- **Admin area:** dashboard (recent changes, drafts, pending edits, publish status), staff and account management, and forms for everything Pages CMS edits today, with image upload checks (type and size) and a preview before publishing.
- **Needs from the owner:** a free Cloudflare account, and approval to install the GitHub App on flickerscomics.
- Suggested effort for this phase: extra-high, because it is security-critical.

## Phase 3: Staff self-service and editor toolbar

- After logging in, staff see only their own profile and can edit their About me text, portrait, languages, qualifications and contact details, with a side-by-side preview.
- Press editor with a BBCode toolbar (bold, italic, underline, strike, headings, link, quote, list, alignment, colour, image, table), keyboard shortcuts, a live preview using the same parser as the site, and a BBCode help panel.
- Private drafts and embargoes are stored in the login service until release, instead of in the public repository.

## Phase 4: Hardening

- Two-factor authentication (authenticator app) for admins.
- Security review and tests for permissions, sessions, invitations and CSRF.
- Pages CMS switched off, or kept for the owner only as a back door.

## Open decisions

1. Should staff profile edits publish immediately, or wait for an admin to approve them?
2. Should staff bios also use BBCode, or stay as they are?
