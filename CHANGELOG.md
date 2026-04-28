# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Phase 1 / Foundation skeleton (2026-04-28)

- pnpm workspace scaffold (`apps/web`, `packages/{domain,db,ui,shared}`)
- TypeScript strict base config (`tsconfig.base.json`) — `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, project references
- `supabase/{functions,migrations}` directories
- Top-level docs: `README.md`, `LICENSE` (MIT), `CHANGELOG.md`
- ADR `0001-stack-decisions.md` capturing the Session 1 stack (2026-04-24)
- `.editorconfig`, `.nvmrc` (Node 22), `.npmrc`, `.gitignore`

### Added — Phase 2 / Tooling (2026-04-28)

- Scaffolded `apps/web` via `create-next-app` — Next.js **16.2.4** (App Router,
  Turbopack, TypeScript). ADR 0001 updated to reflect 15 → 16 bump.
- Cleaned the generated starter: removed Vercel-branded SVGs, marketing copy,
  `page.module.css`. Replaced with a minimal home route and a `globals.css`
  reset. Real styling comes with `@cicada/ui` in Phase 4.
- ESLint flat config (`eslint.config.mjs`) — `typescript-eslint`
  recommendedTypeChecked + stylistic, `react-hooks`, `import/order` with
  `@cicada/*` and `@/*` import groups, `eslint-config-prettier` last.
- Prettier 3 with `printWidth: 100`, trailing commas, LF line endings.
- Stylelint (standard + css-modules + prettier integration). Custom-property
  pattern enforces `cicada-*` / token-namespace prefixes.
- commitlint with Conventional Commits + tightened type enum.
- Husky 9 + lint-staged. `pre-commit` runs lint-staged plus an optional
  `gitleaks protect --staged` (silently skips if the binary isn't installed).
  `commit-msg` runs commitlint.
- `.gitleaks.toml` extending the default ruleset with project allowlists.
- Vitest 2 + jsdom + Testing Library (RTL) + jest-dom matchers. Workspace
  configuration so each package picks its own environment (node / jsdom).
- Smoke test in `@cicada/shared` (`cn` className helper) — keeps the test
  pipeline live until real domain logic arrives.

### Verified

- `pnpm install` — 620 packages, husky `prepare` hook armed.
- `pnpm typecheck` — clean across 5 workspace projects.
- `pnpm lint` — 0 errors, 0 warnings (with `--max-warnings=0`).
- `pnpm format:check` — all files match Prettier.
- `pnpm test` — 4/4 passing.
- `pnpm --filter @cicada/web build` — Next.js production build succeeds.

### Pending — Phase 3 / Supabase + CI

- `supabase init`, baseline schema migration, `.env.example`
- GitHub Actions CI (typecheck / lint / unit tests / E2E)

### Pending — Phase 4 / `@cicada/ui` foundation

- 3-layer token system (primitive → semantic → component)
- Ladle setup
- First primitive components on top of Radix
