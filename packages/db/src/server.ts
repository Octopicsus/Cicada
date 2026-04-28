import { createServerClient as createSSRServerClient } from "@supabase/ssr";

import { getPublicEnv } from "./env";

import type { Database } from "./types";

/**
 * Cookie adapter shape from @supabase/ssr — kept generic here so this package
 * never imports from `next/headers` directly. The Next.js app supplies a thin
 * adapter at the call site (`apps/web/src/lib/supabase/server.ts`).
 */
export interface CookieAdapter {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
}

export function createServerClient(cookies: CookieAdapter) {
  const { url, anonKey } = getPublicEnv();
  return createSSRServerClient<Database>(url, anonKey, { cookies });
}
