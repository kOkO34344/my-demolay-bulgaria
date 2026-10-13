<!-- Source: github.com/joro2404/jacques-web @ 60e5909 (README.md), imported 2026-10-13. Keep in sync with the source; local notes go in DECISIONS.md. -->

# demolay-bg

LAST UPDATED: 14 September 2026
MODEL: Claude Opus 5, extended reasoning
SCOPE OF CHANGE: rewritten as a project brief for the build team
STATUS: active

---

## What we are building

A website and member platform for DeMolay Bulgaria, a youth leadership organisation with five chapters: Sofia, Varna, Plovdiv, Burgas and Veliko Tarnovo. Around 100 members, advisors and parents today.

It replaces two things: a rented third-party mobile application that holds our member network, and a static brochure site that converts nothing.

One codebase, two faces:

- Public. Marketing and PR, news, chapters, programmes, charity and volunteering, donations, enquiry form. Bilingual Bulgarian and English. Indexed.
- Member area, behind login. Everything the rented app does today, plus money and documents. Never indexed.

## What we want out of it

- The organisation owns its member data, its content and its roadmap.
- One view of a member: who they are, what they attend, what they owe.
- Dues, event payments and recurring donations collected in one place, reportable to the Foundation's treasurer.
- The public site produces enquiries and donations rather than sitting there.
- Officers publish without asking the national office.
- Running cost under 100 EUR per month at 100 users.

## Users and roles

Member types, which govern what a person sees:

| Type | Notes |
|---|---|
| Active member | Has a DeM ID. Aged 14 to 21 |
| Senior | Has a DeM ID. Read access equal to an advisor |
| Advisor | Has a DeM ID |
| Parent | Linked to one or more members. No directory, no posting |
| Alumni and donor | Phase 3. Public content and own donation history only |

Roles, which govern what a person does. National: Executive Director, National Representative, National Master Councillor, Secretary, Coordinator, Treasurer, plus system administrators. Per chapter: Chapter Chairman (the single advisor point of contact), Master Councillor, Senior and Junior Councillor, Secretary, Treasurer. Advisors are held nationally.

Rules that shape the permission model:

- Chapter content is approved by the Chapter Chairman. National content by a national officer. Nothing published by a member under 18 reaches the public site without an adult approving it.
- Role assignment belongs to system administrators alone.
- Treasurers see money. Nobody else does, other than administrators and the member themselves.
- Parents see the feed, calendar, documents, rituals, library and payments for their own children. Never the directory.
- Suspension or expulsion revokes everything immediately.

The full matrix is in docs/ROLES-AND-PERMISSIONS.md.

## Login

Accounts are created with email and phone, always, both verified. Two routes in: open signup, and invitation by an administrator.

Signup captures member type, DeM ID or the linked member for parents, date of birth, chapter, and signature of the privacy notice, terms and photo consent with version and timestamp.

An administrator then verifies the account against the member list before anything unlocks. An onboarding questionnaire follows, varying by member type, and feeds event planning.

## Features by phase

Timeline is yours. The order is not: identity first, money second, communication last.

### Phase 1. Website and identity

- Public bilingual site
- Account creation, email and phone verification, consent capture
- Administrator verification queue
- Profiles and onboarding questionnaire
- Roles and permissions
- Feed with approval flow. Posts with photos, scoped national, chapter or Europe, optionally mirrored to the public news page
- Calendar, including the seven obligatory days
- Documents: regulations, meeting minutes, membership forms
- Rituals: access for members, advisors and parents, watermarked per reader on download
- Member directory
- Helpdesk tickets
- Administration console

Opens to 5 to 10 active members and advisors as testers.

### Phase 2. Money and events

- Events with RSVP, capacity and dietary notes
- Annual dues invoicing for active members and advisors
- Dinner and event payments attached to RSVP
- Recurring donations
- Cash and transfer recorded by treasurers, so the ledger stays complete
- Parent accounts with payment access for their own children
- Mass email to the membership

Opens to the full membership.

### Phase 3. Media and messaging

- Education library: books, presentations, video. Around 5 hours of video moves off Google Drive
- Messaging groups, one national and one per chapter
- Alumni and donor accounts
- Donation transparency reporting

Messaging is last deliberately. Hosting conversations that involve minors creates a moderation and retention duty the organisation staffs, not the software.

### Phase 4. Decommission

Export member and post data from the rented application, verify it, then switch it off. The export is unrecoverable after termination.

## Constraints

Non-negotiable. Everything else is your call.

1. Minimum age 14. Date of birth mandatory. Public copy reads 14 to 21. Transition to senior at 21 is flagged automatically and actioned by a human.
2. Data stays in the EU. Controller is Foundation DeMolay Bulgaria.
3. Access rules live in the database, not in screens. Row level security on every table holding data.
4. Real member data exists in production alone.
5. Every user-facing string exists in Bulgarian and English.
6. Photographs of members never appear on a public page. The member area is never indexed.
7. Identity follows the DeMolay International Brand Center strictly. See docs/DESIGN-SYSTEM.md.
8. Mobile first. The audience runs from 14 to 60 and most arrive on a phone.
9. Every administrative action is logged.
10. Nobody pushes to main. The product owner approves every merge.

## Stack

Chosen for cost and EU residency at this scale: Next.js, Supabase in Frankfurt, Vercel, Stripe, Resend, an SMS provider for verification, Bunny for video in Phase 3, Tailwind with the brand tokens. Delivered as an installable web application, no app store presence this phase.

Implementation detail is yours. Raise it with the product owner if a choice here blocks you.

## Not in scope

Native applications. Self-hosted video. Custom payment handling; Stripe hosts the card form. Public member profiles. Anything that stores card numbers on our servers.

## Open items

| Item | Owner |
|---|---|
| Member export from the DeMolay International database | Product owner |
| Named holders of the chapter and national offices, for role seeding | Product owner |
| Annual dues amounts, and whether advisors pay | Product owner with the Treasurer |
| Hosting and DNS position for demolay.bg | IT contact |
| Whether the enquiry form creates a pending account or emails the office | Product owner |
| Bulgaria jurisdictional logo request to DeMolay International | Product owner |

## Reference

| File | Contents |
|---|---|
| docs/DESIGN-SYSTEM.md | Brand palette, typography, logo rules, components. Binding |
| docs/ROLES-AND-PERMISSIONS.md | Full permission matrix |
| docs/DECISIONS.md | What was decided and why. Append only |

Further detail on architecture, data model, GDPR and Phase 1 acceptance criteria exists and is available on request. It is not required reading to start.

## Contacts

Scope, priorities, content, member data: product owner, the National Representative. Privacy documents, budget, launch: Executive Director. Chapter content: that Chapter Chairman.
