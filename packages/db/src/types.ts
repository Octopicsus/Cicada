/**
 * Generated Supabase types live here.
 *
 * Regenerate from a running local DB:
 *   pnpm --filter @cicada/db gen:types
 *
 * Until the schema is real, this file exposes a permissive `Database`
 * interface so the client wrappers compile. Once `pnpm gen:types` runs, this
 * whole file is overwritten by the generator output.
 */
export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
