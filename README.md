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

"Backend" is the mock repository layer in `src/data/mock` (the contract a real API will implement) with its React Query hooks. "Screens" are the pages a member uses.

| Brief, Phase 1 | Backend | Screens |
|---|---|---|
| Roles and permissions | Done: member types plus national and chapter roles (zero or more per person), enforced in `src/auth` and pinned to the matrix by `src/auth/policy.test.ts` | Navigation and route guards; role administration screens not yet |
| Home | n/a | Done: greeting, key dates, latest news |
| Feed with approval flow | Done: draft → submitted → published | Reading done (feed, post). Editor and approval queue not yet |
| Calendar | Done: events with RSVP and attendance | Reading and RSVP done (list, event, add to calendar). Editor and attendance sheet not yet |
| Documents and rituals | Done: resources by category, with rituals restricted | Not yet |
| Member directory and chapter pages | Done | Not yet |
| Administration console and audit log | Done | Not yet |
| Signup, verification queue, consent capture | Done: email and phone codes (simulated), consents with version and time, automatic checks, approve or reject with audit | Done: `/signup` and `/verification` |
| Invitations by administrators and officers | Done: link instead of email code, pre-approved when the inviter may approve accounts | Done: `/invitations` and `/invite/<token>` |
| Onboarding questionnaire | Done: questions by member type, age band from date of birth, totals for planners | Done: `/onboarding` after first sign-in, Home reminder, audience panel on Events for planners |
| Helpdesk | Not yet. Permission exists | Not yet |
| Public website | Not yet. Separate project scope; see DECISIONS.md 2026-09-22 | Not yet |

Pages that are not built yet show a "being built" placeholder.

The brief's production stack (Next.js, Supabase in Frankfurt, Vercel, Stripe, Resend) applies to the real backend. Here, `VITE_DATA_SOURCE=mock` selects the in-memory repositories in `src/data/mock`.

## Tech stack

| Area | Tools |
|---|---|
| Framework | React 19, TypeScript, Vite |
| Routing | React Router (data router, lazy-loaded pages) |
| Data fetching / state | TanStack Query |
| UI | Tailwind CSS 4, shadcn/ui on Radix UI, lucide-react icons, Sonner toasts, Vaul drawers |
| Forms and validation | React Hook Form, Zod |
| Internationalization | i18next, react-i18next, date-fns (with time zone support) |
| PWA | vite-plugin-pwa, Workbox (installable, offline page, update prompt) |
| Testing | Vitest, Testing Library, jsdom, Playwright, axe-core |
| Code quality | ESLint (incl. jsx-a11y, react-hooks), Prettier |
| Hosting | Vercel (`vercel.json`) |

## Getting started

Requires Node 22.12 or later.

```sh
npm install
cp .env.example .env.local   # optional
npm run dev
```

Vite prints the local URL (usually http://localhost:5173).

### Environment variables

Only `VITE_*` variables reach the browser, so never put secrets in them. See `.env.example`.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_DEMO_MODE` | `true` | Shows the demo login cards and the role switcher. Set to `false` for a production-like preview. |
| `VITE_DATA_SOURCE` | `mock` | `mock` uses the in-memory repositories; `api` uses the placeholder API client. |
| `VITE_API_BASE_URL` | empty | Base URL of a future backend (unused while the data source is `mock`). |
| `VITE_MOCK_LATENCY_MS` | `250-450` | Simulated network latency for mock data, as a number or a range. `0` makes it instant. |

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck and production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run the TypeScript compiler |
| `npm run lint` / `lint:fix` | ESLint (no warnings allowed) / auto-fix |
| `npm run format` / `format:check` | Prettier write / check |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:watch` / `test:coverage` | Vitest in watch mode / with coverage |
| `npm run test:e2e` / `test:e2e:ui` | Playwright smoke tests (`npm run e2e:install` first) / with the UI runner |

## Demo accounts

Demo mode (`VITE_DEMO_MODE=true`, the default) shows sign-in cards on the login page and a role switcher in the app. All people, chapters' meeting details and content are fictional.

| Username | Password | Persona |
|---|---|---|
| `member.demo` | `Demo!Member2026` | Active member, Sofia, no role |
| `parent.demo` | `Demo!Parent2026` | Parent linked to `member.demo` |
| `officer.demo` | `Demo!Officer2026` | Chapter Secretary, Sofia |
| `advisor.demo` | `Demo!Advisor2026` | Chapter Chairman, Sofia |
| `treasurer.demo` | `Demo!Treasurer2026` | Chapter Treasurer, Sofia |
| `national.officer.demo` | `Demo!National2026` | National Coordinator |
| `admin.demo` | `Demo!Admin2026` | National Representative and system administrator |

The role switcher lets any signed-in demo account act as one of these personas.

To try signup, choose "Create an account" on the login page; the email and SMS codes are shown on screen. Sign in as `national.officer.demo` or `admin.demo` and open Account verification to approve or reject it. The seed already has two pending accounts, one of them a parent. For invitations, sign in as `officer.demo` and open Invitations; the seeded open invitation's link is `/invite/5eed1a7e000000000000000000000001` (sign out first).

## Project structure

```
├── docs/                   Project brief and local decisions
├── e2e/                    Playwright end-to-end tests
├── public/                 Static assets: brand logos, images, favicon, offline page
├── src/
│   ├── app/                Providers, query client, route table and router
│   ├── auth/               Auth provider, roles, permissions, policy and route guards
│   ├── components/
│   │   ├── common/         Shared app components (tables, dialogs, form fields, states)
│   │   ├── layout/         App shell: header, sidebar, mobile nav, protected routes
│   │   └── ui/             shadcn/ui primitives
│   ├── data/
│   │   ├── api/            Placeholder API client and repositories
│   │   ├── hooks/          TanStack Query hooks
│   │   ├── mock/           Mock repositories, seed data, services and sync engine
│   │   ├── repositories/   Repository interfaces
│   │   └── store/          In-memory database persisted to sessionStorage
│   ├── domain/             Types, Zod schemas and business rules
│   ├── features/           Feature pages: home, news, events, chapter, resources,
│   │                       notifications, profile, officer, content, members,
│   │                       admin, access, sync, auth, shell
│   ├── i18n/               Bulgarian and English translations and helpers
│   ├── lib/                Routes, env, theme, storage and utilities
│   ├── styles/             Global styles
│   └── test/               Test setup
├── .env.example            Documented environment variables
├── vite.config.ts          Vite + PWA configuration
├── vitest.config.ts        Unit test configuration
├── playwright.config.ts    End-to-end test configuration
└── vercel.json             Vercel build, rewrites and security headers
```

## Deployment

The project is set up for [Vercel](https://vercel.com): `vercel.json` runs `npm ci` and `npm run build`, serves `dist/`, rewrites client-side routes to `index.html`, and sets cache and security headers. The site is marked `noindex, nofollow` while it is a prototype.
