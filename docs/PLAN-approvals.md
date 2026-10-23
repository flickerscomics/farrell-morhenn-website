# Plan: every change goes through approval

Requested by the owner on 23 October 2026, to build on **Sunday 25 October 2026**. Not started yet.

## Goal

Every website change made in the staff area becomes a **request** that waits on the Approvals page, not only staff profile changes. Nothing is published, and no build is used, until an admin approves. Approving publishes all the ticked requests together in **one commit, so one build**.

## What changes

1. **Saving makes a request.** In the admin area, Save (Create, Delete) on any section stores a request in D1 instead of committing: profiles, press releases, articles, practice areas, careers, FAQs, pages and settings. The request keeps the proposed field values, the file's sha when it was opened (to detect clashes), and the kind (update, create, delete or rename). Saving again replaces the person's own open request for that item.
   - Exception: **drafts** (draft press releases, articles and vacancies) are invisible to visitors, so their saves keep committing straight away with `[skip ci]`. No approval and no build. Publishing a draft is a request like any other.
   - Image uploads stay as they are: committed at once with `[skip ci]`.
2. **Editors see their pending version.** Opening an item with an open request shows the requested values, with a notice ("Waiting for approval since …"). Lists mark items with open requests, and new items that are only requested.
3. **Approvals page**, grouped by section:
   - a **checkbox** on each request, plus **Select all**
   - **Approve selected (N)** publishes the ticked requests in one commit (`Repo.commitFiles`, which already exists) and leaves unticked ones waiting, neither approved nor denied
   - **Approve all** stays as a shortcut
   - each request keeps its before/after comparison (BBCode previews for text)
4. **Deny with a reason.** Each request has a **Deny** button that opens a text box for the reason (required). Denying marks it denied and stores the reason and who denied it.
5. **Alerting the requester.** There's no email, so alerts are shown in the staff area:
   - a `notifications` table in D1 (user, message, link, read/unread)
   - a badge in the admin menu and a notice on the dashboard: "Your change to 'X' was denied by Y: reason", with a button to dismiss it
   - "My submitted changes" lists the person's requests with their status and any reason
   - optionally also notify on approval ("Your change to X is now live")
6. **Clashes.** At approval, compare each file's current sha with the one stored on the request. If it changed (another request or a Pages CMS edit got there first), apply only the requested fields onto the latest version and flag it as "changed since requested", so the approver can check before ticking. Renames that would collide are skipped with a message.
7. **Permissions.**
   - Rename `profile.approve` to **"Approve and publish website changes"**, covering all sections. Existing roles keep it, through a migration that maps the old id.
   - The other permissions still decide what someone may *request* (for example only press editors can request press releases, and only people with "profile details" can change job titles).
   - `profile.publish` and `press.publish` no longer mean "skip approval". `press.publish` still decides who may request a release be published or archived.
8. **Dashboard.** Add a "builds used this month" counter: commits on `main` this month whose message doesn't include `[skip ci]`, counted through the GitHub API and shown as "X of 500".
9. **Activity log:** `request.created`, `request.approved`, `request.denied` and `request.withdrawn`, with readable labels.

## Questions for the owner before building

1. **Can admins approve their own changes?** Today nobody can. With everything needing approval, an admin working alone would be stuck until another admin signs in. Options:
   - **(a)** admins may approve their own, and it's recorded in the activity log
   - **(b)** never, so it always needs a second person
2. **Should approval alerts also be shown**, or only denials?
3. **Should Pages CMS stay available?** It bypasses approval and publishes straight away. Options: keep it for the owner only, or remove it.

## Done when

- [ ] Server: requests for all sections, approve-selected in one commit, deny with reason, notifications, clash handling, permission migration
- [ ] Screens: Save shows "Sent for approval"; Approvals page with checkboxes, Select all, Approve selected, Deny with reason box; notification badge and dashboard notices; build counter
- [ ] Tests in `tests/server/`: request on save for every section, drafts still direct, approve selected leaves the rest pending, one commit for N approvals, deny stores reason and notifies, clash detection, permissions
- [ ] Browser walkthrough of the whole flow; lint, typecheck, unit and browser tests; Cloudflare bundle check
- [ ] README and ROADMAP updated; published in **one push**, verified as flickerscomics
