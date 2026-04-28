# @cicada/domain

Pure TypeScript business logic. Zero dependencies on Next.js / React / HTTP.

Consumed by: route handlers (`apps/web`), Supabase Edge Functions, CLI tools, tests.

Designed to be portable — if extracted to a standalone service (Hono / Fastify),
no rewrite required. See [ADR 0001](../../docs/adr/0001-stack-decisions.md).
