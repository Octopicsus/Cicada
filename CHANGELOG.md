# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Argon2id invite-token helpers added in `@cicada/domain`
  (`generateInviteToken`, `hashInviteToken`, `verifyInviteToken`).
  OWASP 2024 params (m=19 MiB, t=2, p=1). DB persistence side
  deferred until `shared_wallet_invites` table lands (Phase 2 feature
  work) — schema MUST store `token_hash text not null` only, never a
  plaintext column. Tech Debt Backlog P0 #2 (helpers-only closure).
- Banking credentials now encrypted at rest via pgcrypto / `pgp_sym_encrypt`.
  Migration 0011 adds two SQL helpers (`encrypt_bank_credentials`,
  `decrypt_bank_credentials`) restricted to `service_role`; a new
  `BANK_CREDENTIALS_KEY` env var (32-byte base64) feeds the symmetric key
  through parameterized RPC so it never lands in DB rows, postgres
  config, or `pg_stat_statements`. `persistMonoConnection` encrypts the
  Mono X-Token before insert; `bank_connections.encrypted_credentials`
  is now populated (was `NULL` on every row prior to this change).
  Tech Debt Backlog P0 #1.

### Added

- Money exponent abstraction (`packages/domain/src/currency/exponents.ts`) —
  preemptive foundation для non-2-decimal currencies. Existing call sites
  не рефакторены, supported set без изменений (CZK/EUR/USD/GBP/PLN/CHF/UAH).
  Tech Debt Backlog P1 #5.
- `BankingProvider.healthCheck()` method added to interface, implemented
  for Monobank provider. Lightweight HEAD request to `api.monobank.ua`
  root with 5s timeout, no credentials required. Status mapping:
  HTTP < 500 → `up`, 5xx → `degraded`, network error / timeout → `down`.
  Foundation for future monitoring, retry strategy, and admin status
  page; not yet wired into UI or scheduled tasks.
  Tech Debt Backlog P1 #9.

### Documented

- Transaction `amount` / `fx_source_*` invariants documented in schema
  (column comments + `transactions_fx_source_differs_from_booked` CHECK
  constraint via migration 0010) and TypeScript interface (JSDoc on
  `BankTransaction.amount`, `BankTransaction.exchange`, `ExchangeInfo`).
  Tech Debt Backlog P1 #7.

### Verified — Phase 0 / Foundation closure (2026-04-29)

- Web smoke at http://localhost:3000 — home page renders three
  Button variants (Primary, Secondary, Ghost); console clean
  (only `[HMR] connected`).
- Ladle smoke at http://localhost:61000 — Components → Button
  gallery exposes 5 stories (All sizes / All variants / As child link
  / Default / Disabled). "All variants" renders Primary, Secondary,
  Ghost, Danger. Console clean.
- Phase 0 / Foundation marked closed. Next track (Phase 1 component
  batch) gated by Brand Design lockout until 2026-05-05.

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

### Added — Phase 3 / Supabase + CI (2026-04-28)

- Supabase CLI added as a workspace dev dependency (no `brew` required) and
  `supabase init` ran with project_id `Cicada`. Generated `config.toml` is
  checked in; `.temp/` is gitignored.
- Baseline migration `20260428000000_init.sql` — pgcrypto + citext extensions
  in a dedicated `extensions` schema. Real tables follow as domain models pin
  down.
- `.env.example` covering Supabase, GoCardless, Resend, Sentry, PostHog,
  Upstash. Real values live in `.env.local` (gitignored) and Vercel/Supabase
  project settings.
- `@cicada/db` package now real:
  - `createBrowserClient` (`@supabase/ssr`)
  - `createServerClient(cookies)` accepting a generic `CookieAdapter`, so the
    package never imports `next/headers` and stays framework-agnostic
  - `createAdminClient` (service-role, server-only)
  - `env.ts` with one helpful exception per missing env var
  - `types.ts` placeholder for `pnpm gen:types` output
- GitHub Actions CI (`.github/workflows/ci.yml`):
  - **verify** — Prettier check, ESLint, Stylelint, `tsc`, Vitest
  - **build** — Next.js production build with `.next/cache` cached
  - **secret-scan** — `gitleaks-action` over full history on every push/PR

### Added — Phase 4 / `@cicada/ui` foundation (2026-04-28)

- **Three-layer token system** under `@cicada/ui`:
  - `primitive.css` — raw scales (gray 1–12, status colours, 4-pt space scale,
    radii, font sizes/weights/line-heights, control sizes, shadows, motion,
    z-index, breakpoints).
  - `semantic.css` — `surface-*`, `text-*`, `border-*`, `accent-*`, status,
    focus-ring. Components only reference this layer.
  - `component.css` — sparingly used component-level tokens
    (`--cicada-button-*`). Naming locked to `--cicada-<component>-<role>` so
    it's clear at the call-site that the value belongs to this layer.
  - `index.css` aggregates all three; consumed via `@cicada/ui/tokens.css`.
  - `index.ts` mirrors a few values that need to be read from JS
    (`breakpoints`, `motionDuration`).
- **Stylelint** updated: `import-notation: "string"` (matches our `@import "..."`
  convention), `custom-property-pattern` enforces the namespace prefix on every
  `--*` declaration.
- **Button primitive** — first real component:
  - Radix `Slot` for `asChild` so it composes with `next/link` and any other
    element while keeping styling.
  - CSS Modules + `data-variant` / `data-size` attribute variants (no
    CSS-in-JS, no class concatenation in templates).
  - `forwardRef`, `type="button"` default to avoid stray form submits.
  - 6 RTL tests cover render, default attrs, custom variant/size, click,
    `asChild` composition.
  - 5 Ladle stories (`Default`, `AllVariants`, `AllSizes`, `Disabled`,
    `AsChildLink`).
- **Ladle** wired up — `pnpm --filter @cicada/ui ladle` serves the gallery on
  `:61000`. `.ladle/components.tsx` imports `tokens.css` once for all stories.
- **`apps/web` consumes `@cicada/ui`**:
  - `src/app/layout.tsx` imports `@cicada/ui/tokens.css` at the root.
  - `src/app/page.tsx` renders three Button variants on top of token-driven
    layout values.
- **Cleanup along the way:**
  - Dropped `.js` extensions from cross-file TS imports — Next 16/Turbopack
    rejects them; `moduleResolution: "Bundler"` makes them unnecessary anyway.
  - Removed TypeScript project references from `apps/web/tsconfig.json`
    (TS 6305 with `composite` libs and no build step). Resolution now goes
    through package.json `main` directly.

### Verified — end of Phase 4

- `pnpm typecheck`, `pnpm lint`, `pnpm stylelint`, `pnpm format:check` —
  all clean.
- `pnpm test` — 10/10 (`cn` ×4, `Button` ×6).
- `pnpm --filter @cicada/web build` — Next.js 16.2.4 production build OK.

> Frontend smoke note: home page was verified via the production build only —
> the dev server was not opened in a browser this session. Visual review is
> the next thing to do before declaring Phase 0 closed.
