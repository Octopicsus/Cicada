# 0001 — Stack & architecture decisions (Session 1)

- **Status:** accepted
- **Date:** 2026-04-24
- **Deciders:** Andrii Zhyvov (sole engineer)

## Context

Cicada is a rewrite of the Octomize v1 prototype (React + Express + MongoDB,
~30–40% UX coverage, never deployed). Two months to MVP, closed beta of ~20
invited users in October–November 2026, scale gate at ~1,000 users.

The product targets Ukrainian families displaced since 2022 who live in two
countries at once and need a single financial picture across Ukrainian and
Western banks. Core competition: Monarch (no UAH), Copilot (Apple-only, US),
Google Sheets (the actual incumbent).

Constraints driving the stack choice:

- **Solo developer.** Every dependency is something one person has to learn,
  patch, and migrate.
- **Public repo from commit one.** The repo doubles as a CV artefact. Code
  quality, naming, structure, and conventions have to be defensible from day 1.
- **Long-lived data.** Financial records can't be lost or corrupted by
  framework churn. Schemas, migrations, and audit trails matter more than
  cleverness.
- **Vendor neutrality where it counts.** The banking-aggregator vendor
  (GoCardless today) is on uncertain footing. Business logic must be portable.

## Decision

### Frontend

- **Framework:** Next.js 15 (App Router, RSC-first with client islands).
- **Build:** Turbopack (stable in Next 15).
- **Language:** TypeScript with `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`.
- **Styling:** CSS Modules + CSS Custom Properties. Three layers of design
  tokens (primitive → semantic → component). Variants via `data-*` attributes.
  No CSS-in-JS dependencies.
- **UI library:** owned `@cicada/ui` package. Radix Primitives under the hood
  for accessibility behavior; API, structure, styling, tokens, and
  documentation are ours.
- **Charts:** owned React components on top of `d3-scale` / `d3-shape` /
  `d3-array` / `d3-format`. No Recharts / Tremor / Visx.
- **Server state:** TanStack Query.
- **UI state:** Zustand (Poimandres).
- **URL state:** nuqs.
- **Forms:** React Hook Form + Zod + `@hookform/resolvers`.
- **Animations:** Framer Motion, used sparingly (modals, toasts, accordions).
- **Icons:** Lucide.
- **Dates:** date-fns.
- **Currency formatting:** native `Intl.NumberFormat`.
- **Component docs:** Ladle (lighter than Storybook for solo work).

### i18n & locale model

- **Library:** next-intl.
- **MVP languages:** EN, UK, CS.
- **Hard split:** `locale` controls UI strings; `region/country` controls
  business logic (categorization patterns, currency defaults). They are not
  interchangeable.

### Multi-currency

- **MVP currencies:** EUR, CZK, UAH, GBP, USD.
- **Storage:** every monetary amount carries a `currency_code`.
- **Rates source:** ECB via frankfurter.app, refreshed daily by a Supabase
  cron job.
- **Historical rates:** the rate at the date of the transaction is stored;
  conversions always look up by date, never recompute against today.
- **Base currency:** chosen during onboarding, persisted in user preferences.

### Backend

- **Primary runtime:** Next.js Route Handlers (`app/api/*/route.ts`).
- **Edge runtime:** Supabase Edge Functions (Deno, TypeScript) for tasks that
  belong close to the database.
- **Database:** Supabase Postgres in EU region, with RLS enforced everywhere
  and `pgcrypto` for any sensitive column-level encryption needs.
- **Auth:** Supabase Auth (email + Google OAuth at MVP; TOTP 2FA optional in
  beta, mandatory before scaling past ~1,000 users).
- **Migrations:** Supabase CLI; SQL files committed to git.
- **Rate limiting:** Upstash Redis.
- **Transactional email:** Resend + React Email.
- **Billing:** Stripe Checkout + Customer Portal (Phase 4, freemium).
- **Banking:** GoCardless (primary), CSV import (universal fallback),
  Monobank (post-MVP).

### Business logic architecture

- **Pattern:** `packages/domain` is pure TypeScript with zero dependencies on
  Next.js / React / HTTP / Supabase clients.
- **Consumers:** route handlers, edge functions, CLI tools, tests.
- **Why:** the domain layer has to be portable. If load or organizational
  needs require splitting it into a standalone service (Hono / Fastify on
  Railway), the move is a 2–3 day adapter exercise, not a rewrite. We are not
  splitting it now.

### Observability & quality

- **Errors:** Sentry (frontend + backend).
- **Product analytics:** PostHog (session recordings enabled for beta).
- **Logs:** Better Stack or Axiom.
- **Uptime:** Better Stack Uptime + a public status page.
- **Testing:** Vitest (unit / integration) + React Testing Library +
  Playwright (E2E) + MSW (mocking). Target scope: ~170 tests — ~60–80 unit on
  pure logic, ~25 integration including RLS, ~5–7 E2E happy paths, ~50 UI
  component tests.

### Infra & DX

- **Hosting:** Vercel Pro before beta.
- **DB hosting:** Supabase Pro before beta.
- **Backups:** Supabase daily 7d + weekly `pg_dump` to S3 / Backblaze; restore
  drilled before Phase 3.
- **Monorepo:** pnpm workspaces.
- **CI/CD:** GitHub Actions — tsc, ESLint, Stylelint, Vitest, Playwright on
  every PR.
- **Pre-commit:** husky + lint-staged + gitleaks.
- **Conventions:** Conventional Commits; ADRs for architectural decisions
  (this directory).

### Legal & compliance

- **GDPR:** we are the data controller; Supabase EU region.
- **ToS + Privacy:** Termly template (or equivalent) at draft, EU privacy
  lawyer review before Phase 3.
- **User rights:** account deletion with real erasure; data export (JSON / CSV).
- **DPAs:** standard Data Processing Agreements with Supabase and the banking
  aggregator.

## Repository structure

```
cicada/
├── apps/
│   └── web/                # Next.js 15 — UI + Route Handlers
├── packages/
│   ├── domain/             # pure TypeScript business logic
│   ├── db/                 # Supabase client + generated types
│   ├── ui/                 # @cicada/ui — components + tokens
│   └── shared/             # tiny utility belt (no business logic)
└── supabase/
    ├── functions/          # Edge Functions
    └── migrations/         # SQL migrations (Supabase CLI)
```

## Consequences

**Positive**

- The domain layer is genuinely framework-agnostic, which directly addresses
  the GoCardless and Mollie acquisition risk: the banking-vendor adapter is
  the only thing that needs to change if we migrate.
- Owned UI / tokens / charts mean no surprise breaking changes from a third
  party design system, and the same token system can be reused in emails and
  any future native shells.
- Strict TypeScript settings catch a class of bugs that would be expensive to
  reproduce against real financial data.

**Negative / costs accepted**

- Owning the design system has a real cost: every primitive that a
  third-party library would have given us for free now has to be built. The
  tradeoff is justified by long-term flexibility and the public-repo /
  CV-artefact requirement.
- Ladle (chosen over Storybook) has a smaller community; if it stagnates we
  can swap for Storybook, but component stories are written in a way that is
  not Ladle-specific.
- pnpm workspaces (chosen over Turborepo / Nx) keeps the toolchain minimal at
  the cost of doing some build orchestration by hand later. Acceptable for
  solo development; revisit if the team grows.

## Notes

The banking aggregator decision (GoCardless) is **not finalized in this ADR**.
It is in active vendor evaluation as of 2026-04-28 — see follow-up ADR (TBD)
for the resolution.
