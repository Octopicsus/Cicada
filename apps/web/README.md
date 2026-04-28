# @cicada/web

Next.js 16 application — UI + Route Handlers (`src/app/api/*/route.ts`).

## Scripts

```bash
pnpm dev          # Next dev server (Turbopack)
pnpm build        # Production build
pnpm start        # Production server
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
pnpm stylelint    # Stylelint over CSS Modules
pnpm test         # Vitest (unit + integration)
```

## Layout

```
src/
├── app/                     # App Router (pages, layouts, route handlers)
└── ...                      # styles, lib, hooks added as we go
```

## Notes

- **Strict TypeScript.** Inherits the repo-wide settings from
  [`tsconfig.base.json`](../../tsconfig.base.json) — `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, etc. Your editor will scream more than usual; that's the point.
- **Workspace imports.** Use `@cicada/domain`, `@cicada/db`, `@cicada/ui`, `@cicada/shared`.
  Local imports use `@/*` (configured in `tsconfig.json`).
- **No Tailwind.** Styling is CSS Modules + design tokens from `@cicada/ui`. See
  [ADR 0001](../../docs/adr/0001-stack-decisions.md).
