# Buzzer Admin Console

Angular admin console for Buzzer: sports catalogue (governing bodies, organisations, participants, squad and staff), match scheduling with a real-time live match console, payments, and role-based access.

**Deployed URL:** https://buzzer-admin-console-arsalan.vercel.app

Backend: https://backend-3ofw.onrender.com (REST under `/api`, Swagger at `/api/docs`, Socket.IO at the root).

## Stack

- Angular 22: standalone components, signals, zoneless change detection, `OnPush` everywhere
- SCSS with design tokens as CSS custom properties (`src/styles/_tokens.scss`)
- Vitest for unit tests, ESLint (angular-eslint) and Prettier
- Husky + commitlint for Conventional Commits
- Vercel hosting with automatic deploys from `main` and preview deploys for every PR

## Run locally

Requirements: Node.js 24 and npm 11.

```bash
git clone https://github.com/arsalan-khoso/buzzer-admin-console.git
cd buzzer-admin-console
npm install
npm start          # http://localhost:4200, talks to the shared backend
```

Sign in with one of the demo accounts below (passwords are in the task brief). Do not create new accounts: the backend and its data are shared by the whole team.

| Script           | What it does                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `npm start`      | Dev server with `environment.development.ts`                                                 |
| `npm run build`  | Production build into `dist/buzzer-admin-console/browser`                                    |
| `npm test`       | Unit tests (Vitest): role checks, match status rules, URL filters, HTTP errors, interceptors |
| `npm run lint`   | ESLint for TypeScript and templates                                                          |
| `npm run format` | Prettier on `src/`                                                                           |

## Project structure

```
src/
├── app/
│   ├── common/                  # Shared across features
│   │   ├── components/          # header, main-layout, placeholder-page
│   │   ├── constants/           # navigation and storage keys
│   │   ├── models/
│   │   ├── services/            # LayoutService (sidebar state, header search)
│   │   ├── sidebar/             # Collapsible main navigation
│   │   └── styles/_shared.scss  # SCSS mixins
│   ├── core/                    # API config, auth (session, guard, interceptors, access rules), HTTP errors
│   ├── sports/                  # Sports catalogue and drill-down pages
│   ├── matches/                 # Match list, detail, status control, live console (Socket.IO)
│   ├── payments/                # Payments summary, transactions, detail and status change
│   ├── app.config.ts
│   └── app.routes.ts
├── environments/                # Backend base URL per build
└── styles/                      # Tokens, dark theme base, shared controls
```

Naming follows the developer guide: `name.component.ts`, `name.service.ts`, `name.model.ts`, BEM class names, icons as `public/assets/icons/ic_<name>.svg`.

## Design system

Tokens live in `src/styles/_tokens.scss` and every component reads from them:

| Token                                   | Value                 |
| --------------------------------------- | --------------------- |
| `--color-surface` / `--color-surface-2` | `#131515` / `#212121` |
| `--color-accent` (yellow)               | `#FFB414`             |
| `--color-primary` (red, primary button) | `#EC193C`             |
| `--color-gray` / `--color-orange`       | `#3E3E3E` / `#FF5B14` |
| `--color-danger` (red)                  | `#EC193C`             |
| `--color-success` (green)               | `#2ED368`             |
| `--color-text`                          | `#FFFFFF`             |

Type uses Poppins (Figma Fonts frame). Buttons follow Figma: outlined by default, red primary, gray when disabled. Shared `.btn`, `.input` and `.tag` styles are in `src/styles/_controls.scss`.

## Environment variables

Angular builds have no runtime `.env`; the settings live in `src/environments/` and are swapped by the build configuration:

| File                         | Used by                | Setting                                               |
| ---------------------------- | ---------------------- | ----------------------------------------------------- |
| `environment.ts`             | `npm run build`        | `apiBaseUrl: 'https://backend-3ofw.onrender.com/api'` |
| `environment.development.ts` | `npm start` (ng serve) | `apiBaseUrl: 'https://backend-3ofw.onrender.com/api'` |

- `apiBaseUrl` is the only setting. Code injects it through the `API_BASE_URL` token in `core/api.config.ts`; nothing else reads the environment.
- The Socket.IO server is the same host without `/api` (`apiOrigin()` in `core/api.config.ts`).
- To use another backend, change `apiBaseUrl` in both files. Vercel needs no environment variables.

## Demo accounts and what each one sees

Every account can open every page (Sports, Matches, Payments) and read everything. Actions are shown only when the account may perform them, so no button leads to a 403. The role comes from `GET /api/auth/me` and the permission list from `GET /api/users/:id/permissions` (rules in `core/auth/access.ts`).

| Account               | Role     | Can do                                                                                                   |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `admin@buzzer.dev`    | ADMIN    | Everything: catalogue, squad and staff, matches (schedule, edit, delete, status, events), payment status |
| `operator@buzzer.dev` | OPERATOR | Catalogue, matches (all actions) and payment status. Not squad and staff                                 |
| `viewer@buzzer.dev`   | VIEWER   | Read-only everywhere: no create, edit, delete, status or event actions                                   |
| `org@buzzer.dev`      | ORG      | Squad and staff of organisations (as in Week 1). Cannot change matches or payment statuses               |

A 403 from any request shows "Your account does not have permission to do this." and a 429 (rate limit, 300 requests a minute) shows a wait-and-retry message; a rate-limited read is retried once automatically.

## Git workflow

- `main`: production; every push deploys through Vercel
- `dev`: integration branch
- Each task starts fresh from the latest `dev`: `git checkout dev && git pull && git checkout -b feat/<name>`
- PRs are squash-merged into `dev`, then the branch is deleted
- Releases go to `main` through a `dev` → `main` PR
- Commit messages follow Conventional Commits, e.g. `feat(sports): add sport create dialog`

## Deployment (Vercel)

CI/CD runs on Vercel with the settings in `vercel.json` (build command, output folder and the single-page-app rewrite so deep links such as `/sports` load Angular). One-time setup:

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** → import `buzzer-admin-console`. Vercel reads `vercel.json`; keep the defaults and deploy.
3. Production branch is `main` (the repo default).

After that, every merge to `main` deploys to production and every PR gets its own preview URL. GitHub Actions (`.github/workflows/ci.yml`) runs lint, tests and build on every PR to `dev` and `main`.
