# @cicada/db

Supabase client setup, generated types, and migrations.

- Migrations live in [`supabase/migrations/`](../../supabase/migrations/) (Supabase CLI).
- Generated types live in [`src/types.ts`](./src/types.ts) (regenerated via `supabase gen types`).
- Server / browser / edge clients are exported from this package — never import
  `@supabase/supabase-js` directly in app code.
