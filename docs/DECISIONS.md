# Decisions

Append only. Newest at the bottom. Each entry states what was decided, why, and where it came from.

---

## 2026-09-14 / 15 — Project brief (source: BRIEF.md, ROADMAP.md, ROLES-AND-PERMISSIONS.md, DESIGN-SYSTEM.md)

- Build order is fixed: identity first, money second, communication last. Phase 4 decommissions the rented app.
- Minimum age 14. Date of birth mandatory. Public copy reads 14 to 21. The transition to senior at 21 is flagged automatically and actioned by a human.
- Data stays in the EU. Controller is Foundation DeMolay Bulgaria. Real member data exists in production only.
- Access rules live in the database (row level security), not in screens.
- Access has two dimensions: member type (what a person sees) and zero or more roles (what a person does).
- Role assignment belongs to system administrators alone. Every administrative action is logged.
- Identity follows the DeMolay International Brand Center strictly. DESIGN-SYSTEM.md is binding.
- Every user-facing string exists in Bulgarian and English. Mobile first.
- Nobody pushes to main. The product owner approves every merge.

## 2026-09-22 — Review of the one-page HTML draft (source: meeting recording, internal)

Public website:
- The one-pager is the content base; the site becomes multi-page, one page per section, each reworked.
- The navigation carries a prominent "Join" call to action and a separate member "Log in".
- The "Order of DeMolay, part of DeMolay International" subtitle moves out of the hero. The DeMolay International logo sits in the footer and links to the DI site.
- The hero needs a distinctive photograph instead of a plain blue grid. Photos of members under 18 need consent, so this waits on the consent process.
- A map introduces the international structure (Region 10 / Europe) and, separately, the five chapter cities.
- A blog / articles section shows that the organisation is active (charity campaigns, balls, events). The current site's main problem is that it looks inactive.
- The enquiry form must actually deliver its data somewhere and be protected against bots. Chapter e-mail addresses must not be scrapeable.
- The language toggle must work on the public site.
- Copy is rewritten by members in their own voice rather than generated, to keep it authentic.

Member area and priorities:
- The draft's "key dates" and upcoming-events UI is the visual base for the logged-in experience, with features following the role documents.
- First features: publications (feed) and the calendar, then a "for you" page of what has happened, fed by the newsletter articles.
- Fundraising is a priority ahead of the education library: parents should be able to subscribe to a recurring monthly donation (5 to 50 EUR). One-off donations remain possible.
- Charity is public. Mentorship, coaching and ritual stay inner-circle (member area only).
- Next step: apply the design system (colours, fonts, logos) and start the backend: database, login, data model.

## 2026-10-13 — Prototype realigned with the brief

- The prototype keeps its stack (Vite, React, mock in-browser backend). The brief's production stack (Next.js, Supabase Frankfurt, Vercel, Stripe, Resend) applies to the real backend, which the repository and hook layer are shaped to swap in.
- The access model is replaced: member types `active`, `senior`, `advisor`, `parent` plus the brief's national and chapter roles, with grants that reproduce ROLES-AND-PERMISSIONS.md §4. The policy engine (grants, scopes, special assignments) is kept.
- Palette, typography and copy follow DESIGN-SYSTEM.md: DI colours only, Lato / Crimson Pro / Bebas Neue self-hosted, age 14 to 21.
- The dark theme is the one deviation from DI: DI defines no dark palette, so dark surfaces are darker steps of Oxford Blue shade with Crown Gold shade as the accent.
- The Bulgarian seal stays in the app chrome until the jurisdictional logo request (DESIGN-SYSTEM.md §11.1) is answered. Switching to the DI lockup plus a Lato wordmark needs product-owner approval.
- Not built in the prototype yet: signup with verification and consent capture, the administrator verification queue UI, the onboarding questionnaire, payments and dues, helpdesk, mass email and the public website. Their permissions exist and are marked with the phase they belong to.

## 2026-10-13 — Cyrillic coverage of the brand typefaces

- DESIGN-SYSTEM.md §4 says Lato and Crimson Pro ship Cyrillic. The Google Fonts / Fontsource builds of both are Latin only, and Crimson Pro has no Cyrillic in any build.
- Lato: we self-host the official Lato 2.015 build, which includes Cyrillic, subset to Latin + Cyrillic (`src/assets/fonts/lato`). Licence is OFL 1.1.
- Crimson Pro: kept for Latin. Cyrillic glyphs fall back to EB Garamond, an OFL Garamond-family serif close to Crimson's proportions. To be confirmed by the product owner; alternatives are a single serif with Cyrillic (Source Serif 4, PT Serif) or Lato Bold for Bulgarian headings.
- Bebas Neue: handled as the brief specifies (Lato Black, uppercase, wide tracking for Bulgarian).
- Interface chrome (navigation, toolbars, codes) uses Lato Bold. Page, card and dialog titles use Crimson Pro. Date numerals use Bebas Neue.

## 2026-10-13 — Reading the permission matrix (ROLES-AND-PERMISSIONS.md §4)

Where the matrix is silent or ambiguous, the prototype does the following. Each point is open to correction by the product owner.

- "Pay own dues" lists parents only. Following BRIEF.md and ROADMAP.md §3 (dues paid "by active members or by the parent linked to them"), active members, seniors and advisors also pay their own dues; parents pay for their linked children.
- Publishing a draft event is its approval: `event.approve` gates publishing and cancelling. The Master Councillor creates chapter events as drafts that the Chapter Chairman approves.
- "Upload chapter minutes" is chapter-level document upload. The National Coordinator uploads national documents only; the National Master Councillor publishes national posts only.
- Permissions outside the matrix follow the nearest row: attendance with event creation (and the Chapter Secretary), contact data and chapter details with roster management, translations and chapter notifications with publishing, national notifications with mass email, seeing role holders with account approval.
- The audit log and special (time-boxed) permissions belong to system administrators, because both rows sit with role assignment.
- The "advisor" role carries no grants beyond the advisor member type; it records the general advisor post.
- A parent sees no My Chapter page, because that page contains the directory.
- A position from the member registry yields at most one role; ritual offices (Chaplain, Marshal, Standard Bearer and the like) yield none. System administrators add further roles by hand. Ending a role keeps it as history.
- Suspension and expulsion end every role immediately; reactivation does not restore them.

## 2026-10-13 — Member screens: feed, calendar and Home first

- The Phase 1 foundation built the mock backend and the app shell; the feature pages were placeholders. Screens are now built in the order the 2026-09-22 review set: publications (feed) and the calendar, with Home built on the draft's "key dates" idea.
- Built: Home (greeting, next four key dates with how many still need a reply, three latest posts), the news feed and post page, the events list and event page with RSVP and add to calendar.
- Event items follow DESIGN-SYSTEM.md §6: Oxford left border by default, Ruby when the event starts within 24 hours, Beacon when an explicit registration deadline closes within 72 hours. Each flag is also written out in text.
- Bilingual content missing in the reader's language falls back to the other language with a visible "Not translated yet" note and the correct `lang` attribute.
- Not yet: the seven obligatory days in the calendar (the dates are not in the brief and are not invented here), "posts from Europe" as a feed scope, and the post and event editors.
