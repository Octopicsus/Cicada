/**
 * Reads Supabase env vars and asserts they exist. Centralized so the failure
 * mode is one helpful exception per missing variable, not a confusing
 * runtime crash three function calls deep.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[@cicada/db] Missing environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export function getPublicEnv(): { url: string; anonKey: string } {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function getServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}
