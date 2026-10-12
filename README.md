# My DeMolay Bulgaria

A bilingual (English / Bulgarian) member portal for DeMolay Bulgaria, the Bulgarian jurisdiction of the DeMolay youth organization. Members, chapter officers, advisors and national leadership use it to follow news, manage events and attendance, share resources, and administer chapters, roles and translations.

> **Status: prototype (Phase 1).** The app is frontend-only. All data comes from in-memory mock repositories seeded with fictional people and chapters, and it is reset when the browser session ends. A placeholder API client exists for a future FastAPI backend, but no backend is connected yet.

## Features

**For every member**

- **Home** dashboard with highlights from news, events and notifications
- **News** feed and article pages
- **Events** list and detail pages with RSVP
- **My Chapter** page with the chapter directory
- **Resources** library
- **Notifications** inbox and per-user notification preferences
- **Profile** page
- English and Bulgarian UI with a language switcher, plus light / dark theme

**For chapter officers and advisors**

- **Officer workspace** (`/workspace`)
- Create and edit events, and record **attendance**
- **Content management**: draft, submit, approve, publish and archive announcements
- **Member management** for their chapter

**For national officers and administrators** (`/admin`)

- Members, chapters, content and events across the jurisdiction
- **Roles**, **permissions** and **position mapping** (imported registry positions → app roles)
- **Translations** workflow (create, review, publish)
- **Audit log**
- **Member registry sync**: a simulated sync with deterministic scenarios, errors and exceptions

**Platform**

- Role- and scope-based access control: five roles (`member`, `chapter_officer`, `chapter_advisor`, `national_officer`, `national_admin`), scopes from `self` up to `system`, and a fine-grained permission catalogue (see `src/domain/types/access.ts` and `src/auth/`)
- Installable **PWA** with an offline page and an update prompt
- Responsive layout with a mobile bottom bar, an offline banner, and accessibility work (skip link, axe checks in end-to-end tests)
- **Demo mode** with one-click demo logins and a role switcher

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | React 19, TypeScript, Vite |
| Routing | React Router (data router, lazy-loaded pages) |
| Data fetching / state | TanStack Query |
| UI | Tailwind CSS 4, shadcn/ui on Radix UI, lucide-react icons, Sonner toasts, Vaul drawers |
| Forms and validation | React Hook Form, Zod |
| Internationalization | i18next, react-i18next, date-fns (with time zone support) |
| PWA | vite-plugin-pwa, Workbox |
| Testing | Vitest, Testing Library, jsdom, Playwright, axe-core |
| Code quality | ESLint (incl. jsx-a11y, react-hooks), Prettier |
| Hosting | Vercel (`vercel.json`) |

## Getting started

### Prerequisites

- Node.js **22.12 or newer**
- npm

### Install and run

```bash
npm install
npm run dev
```

Vite prints the local URL (usually http://localhost:5173).

### Environment variables

Copy `.env.example` to `.env.local` to override the defaults. Only `VITE_*` variables reach the browser, so never put secrets in them.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_DEMO_MODE` | `true` | Shows the demo login cards and the role switcher. Set to `false` for a production-like preview. |
| `VITE_DATA_SOURCE` | `mock` | `mock` uses the in-memory repositories; `api` uses the placeholder API client. |
| `VITE_API_BASE_URL` | empty | Base URL of the future FastAPI backend (unused while the data source is `mock`). |
| `VITE_MOCK_LATENCY_MS` | `250-450` | Simulated network latency for mock data, as a number or a range. `0` makes it instant. |

### Demo accounts

With demo mode on, the login page offers one-click access for each role. All accounts and people in the seed data are fictional.

| Role | Username | Password |
| --- | --- | --- |
| Member | `member.demo` | `Demo!Member2026` |
| Chapter officer | `officer.demo` | `Demo!Officer2026` |
| Chapter advisor | `advisor.demo` | `Demo!Advisor2026` |
| National officer | `national.officer.demo` | `Demo!National2026` |
| National administrator | `admin.demo` | `Demo!Admin2026` |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run the TypeScript compiler |
| `npm run lint` / `lint:fix` | Lint (no warnings allowed) / auto-fix |
| `npm run format` / `format:check` | Format with Prettier / check formatting |
| `npm test` | Run unit and component tests once (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Unit tests with coverage |
| `npm run e2e:install` | Install the Chromium browser for Playwright |
| `npm run test:e2e` / `test:e2e:ui` | Run Playwright end-to-end tests / with the UI runner |

## Project structure

```
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
│   ├── i18n/               English and Bulgarian translations and helpers
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

## Roadmap

- Connect a real backend (FastAPI is the planned target behind `VITE_DATA_SOURCE=api`)
- Real authentication in place of the demo accounts
- Integration with the member registry in place of the simulated sync
