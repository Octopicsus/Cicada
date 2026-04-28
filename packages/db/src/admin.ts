import { createClient } from "@supabase/supabase-js";

import { getPublicEnv, getServiceRoleKey } from "./env.js";

import type { Database } from "./types.js";

/**
 * Service-role client. Bypasses RLS — use only in trusted server contexts
 * (background jobs, admin scripts, edge functions). Never import this module
 * from any code path that runs in the browser.
 *
 * Marked with the `server-only` semantics by convention; we don't pull in the
 * `server-only` package at the @cicada/db layer to keep the package
 * framework-agnostic. The Next.js app should re-export with `import "server-only"`.
 */
export function createAdminClient() {
  const { url } = getPublicEnv();
  const serviceKey = getServiceRoleKey();
  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
