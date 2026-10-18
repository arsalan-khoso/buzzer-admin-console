# Buzzer Admin Console

Angular admin console for Buzzer sports management: sports catalogue, governing bodies, organisations and participants.

## Stack

- Angular 22: standalone components, signals, zoneless change detection, `OnPush` everywhere
- SCSS with design tokens as CSS custom properties (`src/styles/_tokens.scss`)
- Vitest for unit tests, ESLint (angular-eslint) and Prettier
- Husky + commitlint for Conventional Commits
- Vercel hosting with automatic deploys from `main` and preview deploys for every PR

## Getting started

```bash
npm install
npm start          # http://localhost:4200
```

| Script           | What it does                                              |
| ---------------- | --------------------------------------------------------- |
| `npm start`      | Dev server with `environment.development.ts`              |
| `npm run build`  | Production build into `dist/buzzer-admin-console/browser` |
| `npm test`       | Unit tests (Vitest)                                       |
| `npm run lint`   | ESLint for TypeScript and templates                       |
| `npm run format` | Prettier on `src/`                                        |

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
│   ├── core/                    # API config, title strategy
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

## Environment

The backend base URL is read only from `src/environments/`:

- `environment.ts`: production build
- `environment.development.ts`: `ng serve`

Code injects it through the `API_BASE_URL` token in `core/api.config.ts`.

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
