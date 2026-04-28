import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "./env.js";

import type { Database } from "./types.js";

/**
 * Supabase client for client-side React components.
 * Uses cookies (managed by @supabase/ssr) to share the auth session
 * with the server-side client.
 */
export function createBrowserClient() {
  const { url, anonKey } = getPublicEnv();
  return createSSRBrowserClient<Database>(url, anonKey);
}
