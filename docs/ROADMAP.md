<!-- Source: github.com/joro2404/jacques-web @ 60e5909 (ROADMAP.md), imported 2026-10-13. Keep in sync with the source; local notes go in DECISIONS.md. -->

# Roadmap

LAST UPDATED: 15 September 2026
MODEL: Claude Opus 5, extended reasoning
SCOPE OF CHANGE: first issue. Feature scope, app parity, build order
STATUS: active. Timeline set by the build team, order set here

---

## 1. Two products, one system

| | Website | Member area |
|---|---|---|
| Who | Anyone | Verified accounts only |
| Purpose | Tell the world who we are and bring people in | Run the organisation day to day |
| Language | Bulgarian and English | Bulgarian and English |
| Visibility | Indexed by search engines | Never indexed. Nothing readable without login and administrator verification |

One login button connects them. Everything a member does happens on the other side of it.

## 2. What the website does

- States what DeMolay is, what it stands for, and who it is for.
- Publishes news and chapter activity that officers choose to make public.
- Shows the five chapters and how to reach each one.
- Shows programmes, the seven obligatory days, and what a year in DeMolay looks like.
- Carries charity and volunteering campaigns, and the work of Foundation DeMolay Bulgaria.
- Takes donations, including recurring monthly support.
- Takes membership enquiries from young men and their parents.
- Carries the partners section when there is content behind it.

Success measure: enquiries and donations arrive without anyone chasing them.

## 3. What the member area does

Six jobs.

Identity. Every member, senior, advisor and parent has a profile and a verified account. Active members and seniors enrich their profile further. An onboarding questionnaire captures interests, age band and availability so events are planned for a real audience rather than a guess.

Communication. A feed of what chapters publish, what is upcoming, and posts from Europe. Messaging groups at national level and per chapter. Mass email for anything that matters.

Knowledge. Documents and regulations: new membership forms, meeting minutes, governance. Rituals as PDFs, restricted and watermarked. A digital library of books, videos and presentations from our education events.

Time. A calendar of national and chapter events, with RSVP and event forms.

Money. Annual dues paid by active members or by the parent linked to them. Event and dinner payments attached to RSVP. Recurring donations with transparency reporting back to supporters.

Administration. Verification of new accounts, roles and permissions, content approval, helpdesk tickets, and a full member database.

## 4. Parity with the current application

Nothing in the rented application is lost. Every menu item has a destination.

| Current app | Where it lands | Phase |
|---|---|---|
| New post | Feed, with approval by role | 1 |
| Draft posts | Feed, draft state | 1 |
| My chapter | Chapter page and roster | 1 |
| Chapters | Chapter directory, public and member versions | 1 |
| Rituals | Documents, restricted category, watermarked | 1 |
| Regulations | Documents: governance, minutes, membership forms | 1 |
| Events | Calendar in Phase 1, RSVP and payment in Phase 2 | 1 and 2 |
| Search | Search across feed, documents, directory and library | 1, extended in 3 |
| Admin | Administration console | 1 |
| Helpdesk | Tickets | 1 |
| Invite friends | Administrator and officer invitations to join | 1 |
| Charity, Foundation DeMolay Bulgaria | Public charity pages in Phase 1, donations in Phase 2 | 1 and 2 |
| My chats | Messaging, one to one | 3 |
| My groups | Messaging groups, national and per chapter | 3 |

New in the platform and absent from the app today: the public website, dues and payments, parent accounts, recurring donations, the digital library, mass email, the onboarding questionnaire, and consent records.

## 5. Build order and why

The order is fixed. The timeline is the build team's to set.

### Phase 1. Identity and content

Accounts, verification, profiles, roles, feed, calendar, documents, rituals, chapter pages, directory, search, helpdesk, administration console, and the public website.

Why first: every later feature attaches to a verified member record and a permission model. Payments without verified identity are a reconciliation problem. Messaging without roles is a moderation problem.

Gate: five to ten officers and advisors run the platform for a week without asking for the old app.

### Phase 2. Money and events

Events with RSVP and capacity, dues invoicing, dinner payments, recurring donations, parent accounts, mass email, treasurer reporting.

Why second: it turns the platform from a noticeboard into infrastructure the organisation depends on, and it is the part with an external dependency, the Foundation's payment account, so it deserves its own run.

Gate: one full dues cycle invoiced and reconciled by the Treasurer, and one event run end to end with paid dinners.

### Phase 3. Media and messaging

Digital library with video, messaging groups, one to one chat, alumni and donor accounts, donation transparency reporting.

Why last: messaging carries a moderation and retention duty for conversations involving minors. That duty is staffed by people, not by software, and the people have to be named and briefed before it ships.

Gate: a named moderation owner per chapter, a retention window agreed, and the education video migrated off Google Drive.

### Phase 4. Decommission

Export member and post data from the rented application, verify it record by record, then switch it off.

Why a phase of its own: the export is unrecoverable once notice is served. Between switching off the old app and shipping Phase 3 messaging, members have no group chat, so either the app stays until Phase 3 lands or an interim channel is named.

## 6. How we prioritise inside a phase

In order:

1. Anything that protects a minor or personal data.
2. Anything that blocks a later phase.
3. Anything an officer does weekly.
4. Anything an officer does yearly.
5. Everything else.

A request that arrives mid-phase is logged and answered in the next one. Scope added to a phase moves that phase's date, and that trade is stated openly rather than absorbed.

## 7. What we are not building

Native applications for the app stores. A public member directory. Prospective member accounts, since enquiries are handled by people. Anything that stores card numbers on our servers. A second content system alongside the platform.

The "friends" user type stays undefined. Alumni and donors cover the intent in Phase 3.

## 8. What the organisation owes the build team

| Item | Owner |
|---|---|
| Member export from the DeMolay International database | Product owner |
| Named holders of chapter and national offices, for role seeding | Product owner |
| Ritual PDFs and the rule for who reads which degree | Product owner |
| Annual dues amounts, and whether advisors pay | Product owner with the Treasurer |
| Foundation payment account and accountant's answer on receipts | Executive Director |
| Hosting and DNS position for demolay.bg | IT contact |
| Privacy notice, terms and photo consent, signed | Executive Director |
| Bulgaria jurisdictional logo request to DeMolay International | Product owner |
| A named person per chapter who publishes weekly | Product owner |

The last line is the one that decides whether this survives its first quarter. A platform nobody publishes to dies whatever the code looks like.
