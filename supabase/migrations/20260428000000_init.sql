-- Cicada — baseline migration
-- ---------------------------------------------------------------------------
-- Establishes the minimum extensions + schema scaffolding the rest of the
-- product builds on. Real tables (users, wallets, transactions, categories,
-- patterns, rates) land in subsequent migrations as their domain models are
-- pinned down.
-- ---------------------------------------------------------------------------

-- Make extensions live in their own schema so the public schema stays clean.
create schema if not exists extensions;

-- Generic crypto helpers — uuid generation, hashing, gen_random_bytes.
-- Supabase preinstalls this, but we declare it explicitly so a fresh local
-- database (`supabase db reset`) is reproducible.
create extension if not exists pgcrypto with schema extensions;

-- Citext for case-insensitive comparisons (email lookups, normalized merchant
-- names, etc.).
create extension if not exists citext with schema extensions;

-- Future migrations will, when needed:
--   * enable pg_cron for the daily ECB rates job (Supabase Pro)
--   * add the `cicada` schema for any helpers we don't want surfaced via PostgREST
--   * define the core tables and their RLS policies
