# Cicada

> Personal finance for cross-border families. Working title — final name TBD in Phase 0.

**See your finances when they're scattered across countries.**

Cicada gives families living between Ukraine and Western Europe a single, real-time
view of every account, in their chosen base currency, in a language they actually
speak. Not envelope budgeting. Not a fintech bro dashboard. Just clarity.

---

## Status

🚧 **Phase 0 — Foundation** (Apr 24 — May 31, 2026).

Scaffolding monorepo, vendor evaluation (banking aggregators), legal templates, schema design.
See [CHANGELOG.md](./CHANGELOG.md) for what's actually done; [docs/adr/](./docs/adr/) for
why decisions were made.

Closed beta target: **October–November 2026** with ~20 invited testers.

## Repository structure

```
cicada/
├── apps/
│   └── web/                # Next.js 15 (App Router) — UI + Route Handlers
├── packages/
│   ├── domain/             # Pure TypeScript business logic — zero framework deps
│   ├── db/                 # Supabase client, generated types
│   ├── ui/                 # @cicada/ui — owned design system, owned tokens
│   └── shared/             # tiny utility belt (no business logic here)
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   └── migrations/         # SQL migrations (Supabase CLI)
└── docs/
    └── adr/                # Architecture Decision Records
```

## Stack

- **Frontend:** Next.js 16 (App Router, RSC-first), TypeScript strict, Turbopack
- **Styling:** CSS Modules + 3-layer token system (primitive → semantic → component). No CSS-in-JS.
- **State:** TanStack Query (server) · Zustand (UI) · nuqs (URL)
- **Forms:** React Hook Form + Zod
- **i18n:** next-intl (EN, UK, CS at MVP)
- **Backend:** Next.js Route Handlers + Supabase Edge Functions
- **DB:** Supabase Postgres (EU region) + RLS everywhere + pgcrypto
- **Auth:** Supabase Auth (email + Google OAuth; TOTP 2FA before scale)
- **Banking:** GoCardless (primary), CSV import (universal fallback), Monobank (post-MVP)
- **Testing:** Vitest + React Testing Library + Playwright + MSW
- **Observability:** Sentry · PostHog · Better Stack

Full rationale: [`docs/adr/0001-stack-decisions.md`](./docs/adr/0001-stack-decisions.md).

## Prerequisites

- **Node.js** 22 LTS (`nvm use` reads [`.nvmrc`](./.nvmrc))
- **pnpm** via Corepack — already shipped with Node ≥ 16.13:
  ```bash
  corepack enable
  ```
  The pinned version is read from `packageManager` in [`package.json`](./package.json).

## Getting started

```bash
corepack enable
pnpm install
cp .env.example .env.local   # fill in Supabase / GoCardless creds
pnpm dev                     # starts apps/web on http://localhost:3000
pnpm typecheck               # full repo type check
pnpm test                    # unit + integration
pnpm lint                    # ESLint
pnpm stylelint               # CSS Modules
pnpm format:check            # Prettier
```

### Optional local tools

- **Gitleaks** (`brew install gitleaks`) — the `pre-commit` hook runs it when
  installed; otherwise it's silently skipped. CI always runs the full
  `gitleaks-action` over history.
- **Supabase local stack** (`pnpm exec supabase start`) — spins up Postgres,
  Auth, Studio, and friends in Docker. Requires Docker Desktop running.

## Product principle

> **Make things for people. Solve their problems. Don't add new ones.**

Every new feature is judged against three questions:

1. **Whose problem does this solve?** If we can't name a specific user and a specific
   moment in their day — the feature probably shouldn't exist.
2. **What new problem does it create?** Extra clicks, cognitive load, another piece
   of state to track. If the cost outweighs the benefit — we don't add it.
3. **What does the user have to do extra because of this?** If the answer is "read a
   tooltip" or "go through onboarding" — the design is probably broken.

## License

MIT — see [LICENSE](./LICENSE).
