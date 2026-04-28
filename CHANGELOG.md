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

### Pending — Phase 2 / Tooling

- Scaffold `apps/web` via `create-next-app` (Next 15, App Router, TS, Turbopack)
- ESLint + Prettier + Stylelint + commitlint
- Husky + lint-staged + gitleaks pre-commit hooks
- Vitest + React Testing Library setup

### Pending — Phase 3 / Supabase + CI

- `supabase init`, baseline schema migration, `.env.example`
- GitHub Actions CI (typecheck / lint / unit tests / E2E)

### Pending — Phase 4 / `@cicada/ui` foundation

- 3-layer token system (primitive → semantic → component)
- Ladle setup
- First primitive components on top of Radix
