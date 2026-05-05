-- Security advisor fixes от P0 #1 commit eb831bf shipping gap
-- Surfaced 2026-05-05 через get_advisors MCP tool после remote dev sync
-- Полный rationale в Cicada - Tech Debt Backlog §P0 #5
-- Reference: CLAUDE.md §Mandatory rule — Security advisor pass

-- 1. ERROR fix: bank_connections_safe view defaults к SECURITY DEFINER, bypasses RLS.
--    security_invoker = true makes view enforce querying user's permissions + RLS
--    on underlying bank_connections table.
ALTER VIEW public.bank_connections_safe SET (security_invoker = true);

-- 2. WARN fix: trigger functions не должны быть REST RPC-callable.
--    on_auth_user_created — auth.users trigger handler, expects NEW context.
--    update_updated_at — generic timestamp trigger, expects NEW context.
--    Direct REST call would error runtime, REVOKE снимает unintended exposure surface.
REVOKE EXECUTE ON FUNCTION public.on_auth_user_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

-- 3. WARN fix: lock search_path для всех functions defense-in-depth против
--    schema injection. Functions reference cross-schema objects через qualified
--    names (extensions.pgp_sym_*, extensions.gen_random_bytes), либо unqualified
--    public references (public.users, NEW.* в trigger context) — empty search_path
--    safe для всех 5.
ALTER FUNCTION public.encrypt_bank_credentials(text, text) SET search_path = '';
ALTER FUNCTION public.decrypt_bank_credentials(bytea, text) SET search_path = '';
ALTER FUNCTION public.uuid_v7() SET search_path = '';
ALTER FUNCTION public.update_updated_at() SET search_path = '';
ALTER FUNCTION public.on_auth_user_created() SET search_path = '';
