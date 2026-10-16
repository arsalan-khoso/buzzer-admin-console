# Buzzer Admin Console

Angular admin console for Buzzer sports management: sports catalogue, governing bodies, organisations and participants.

## Stack

- Angular 22: standalone components, signals, zoneless change detection, `OnPush` everywhere
- SCSS with design tokens as CSS custom properties (`src/styles/_tokens.scss`)
- Vitest for unit tests, ESLint (angular-eslint) and Prettier
- Husky + commitlint for Conventional Commits
- AWS Amplify Hosting with automatic deploys from `main`

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
| `--color-danger` (red)                  | `#EC193C`             |
| `--color-success` (green)               | `#2ED368`             |
| `--color-text`                          | `#FFFFFF`             |

Type uses Inter. Shared `.btn`, `.input` and `.tag` styles are in `src/styles/_controls.scss`.

## Environment

The backend base URL is read only from `src/environments/`:

- `environment.ts`: production build
- `environment.development.ts`: `ng serve`

Code injects it through the `API_BASE_URL` token in `core/api.config.ts`.

## Git workflow

- `main`: production; every push deploys through Amplify
- `dev`: integration branch
- Each task starts fresh from the latest `dev`: `git checkout dev && git pull && git checkout -b feat/<name>`
- PRs are squash-merged into `dev`, then the branch is deleted
- Releases go to `main` through a `dev` → `main` PR
- Commit messages follow Conventional Commits, e.g. `feat(sports): add sport create dialog`

## Deployment (AWS Amplify)

CI/CD runs on Amplify Hosting with the build spec in `amplify.yml`. One-time setup in the AWS Console:

1. Amplify → **Create new app** → **GitHub** → authorise and pick `buzzer-admin-console`, branch `main`.
2. Amplify detects `amplify.yml`; keep it and deploy.
3. **Hosting → Rewrites and redirects** → add the single-page-app rule so deep links load Angular:
   - Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>`
   - Target: `/index.html`
   - Type: `200 (Rewrite)`

After that, every merge to `main` builds and deploys automatically. GitHub Actions (`.github/workflows/ci.yml`) runs lint, tests and build on every PR to `dev` and `main`.
