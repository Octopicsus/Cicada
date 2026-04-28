import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "./env";

import type { Database } from "./types";

/**
 * Supabase client for client-side React components.
 * Uses cookies (managed by @supabase/ssr) to share the auth session
 * with the server-side client.
 */
export function createBrowserClient() {
  const { url, anonKey } = getPublicEnv();
  return createSSRBrowserClient<Database>(url, anonKey);
}
