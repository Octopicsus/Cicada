-- P1 #6 closure (decisions locked 2026-05-05): maximally flexible defaults for
-- region + language. NULL means "user hasn't declared yet" — app uses English UI
-- + generic non-country-specific defaults until onboarding modal completes.
-- Earlier opinionated 'cz' default removed.
--
-- Reference: Cicada - Tech Debt Backlog §P1 #6 Decision log 2026-05-05

-- 1. Allow region NULL (not declared). Drop NOT NULL constraint.
ALTER TABLE public.users ALTER COLUMN region DROP NOT NULL;

COMMENT ON COLUMN public.users.region IS
  'ISO-3166-1 alpha-2 country code. NULL means user has not declared residence yet — app uses generic non-country-specific defaults (no period suggestions, no currency hints, no banking provider auto-suggestion). Drives period defaults, currency suggestions, banking provider selection when set.';

-- 2. Add language column. NULL = English fallback (most flexible).
ALTER TABLE public.users ADD COLUMN language text NULL;

COMMENT ON COLUMN public.users.language IS
  'ISO 639-1 alpha-2 language code (en, ru, cs, uk, pl). NULL means English fallback — application UI defaults to English when not declared. Free text — frontend validates against supported list at app layer.';

-- 3. Update on_auth_user_created trigger function — pass through region + language
--    as-is from raw_user_meta_data, NULL if absent. No opinionated 'cz' fallback.
--    Preserves SECURITY DEFINER + SET search_path = '' from P0 #5 security fixes.
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, region, language)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'region',
    NEW.raw_user_meta_data->>'language'
  );
  RETURN NEW;
END;
$$;
