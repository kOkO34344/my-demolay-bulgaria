# My DeMolay Bulgaria

A bilingual (Bulgarian and English) member area prototype for DeMolay Bulgaria. It runs entirely in the browser on fictional demo data, using a mock backend that sits behind the same repository interfaces a real API will implement.

It is the Phase 1 member area described in the project brief. The brief is the source of truth:

| Document | Contents |
|---|---|
| [docs/BRIEF.md](docs/BRIEF.md) | What we are building, for whom, constraints, phases |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Feature scope, parity with the rented app, build order |
| [docs/ROLES-AND-PERMISSIONS.md](docs/ROLES-AND-PERMISSIONS.md) | Member types, roles, the permission matrix |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | DeMolay International brand rules. Binding |
| [docs/DECISIONS.md](docs/DECISIONS.md) | What was decided and why. Append only |

The four brief documents are imported from the original project repository and should only change when the source changes. Local decisions go in `DECISIONS.md`.

## Brief vs. prototype

| Brief, Phase 1 | Prototype |
|---|---|
| Roles and permissions | Done: member types plus national and chapter roles, enforced in `src/auth` |
| Feed with approval flow | Done: news, with draft → submitted → published |
| Calendar | Done: events with RSVP and attendance |
| Documents and rituals | Done: resources by category, with rituals restricted |
| Member directory and chapter pages | Done |
| Administration console and audit log | Done |
| Signup, verification queue, consent capture, onboarding | Not yet. The data model carries member type, DeM ID, consents and linked children |
| Helpdesk | Not yet. Permission exists |
| Public website | Not yet. Separate project scope; see DECISIONS.md 2026-09-22 |

The brief's production stack (Next.js, Supabase in Frankfurt, Vercel, Stripe, Resend) applies to the real backend. Here, `VITE_DATA_SOURCE=mock` selects the in-memory repositories in `src/data/mock`.

## Getting started

Requires Node 22.12 or later.

```sh
npm install
cp .env.example .env.local   # optional
npm run dev
```

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck and production build |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:e2e` | Playwright smoke tests (`npm run e2e:install` first) |
| `npm run lint` / `npm run format:check` | ESLint / Prettier |

## Demo accounts

Demo mode (`VITE_DEMO_MODE=true`, the default) shows sign-in cards on the login page and a role switcher in the app. All people, chapters' meeting details and content are fictional.

| Username | Password | Who |
|---|---|---|
| `member.demo` | `Demo!Member2026` | Member, Sofia |
| `officer.demo` | `Demo!Officer2026` | Chapter officer, Sofia |
| `advisor.demo` | `Demo!Advisor2026` | Chapter advisor, Sofia |
| `national.officer.demo` | `Demo!National2026` | National officer |
| `admin.demo` | `Demo!Admin2026` | System administrator |
