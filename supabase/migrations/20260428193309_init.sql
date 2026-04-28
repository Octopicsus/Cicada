-- Cicada — migration 0001: extensions, shared functions, enums
-- ---------------------------------------------------------------------------
-- Establishes the foundation that every other migration builds on:
--   * Postgres extensions (pgcrypto, citext, pg_trgm, btree_gin)
--   * Shared helper functions (uuid_v7, update_updated_at)
--   * All native enum types referenced by domain tables
--
-- Tables, indexes, RLS — все живёт в последующих миграциях. Здесь только
-- то, что нужно подключить ровно один раз и от чего зависят все остальные
-- миграции.
-- ---------------------------------------------------------------------------

-- ============ EXTENSIONS ============
-- Все extensions живут в отдельной схеме `extensions`, чтобы public оставался
-- чистым (Supabase делает так по умолчанию для своих preinstalled extensions).

create schema if not exists extensions;

-- Generic crypto helpers — gen_random_uuid (v4), gen_random_bytes, digest, hmac.
-- Supabase preinstalls этот extension, но объявляем явно, чтобы чистый
-- `supabase db reset` был воспроизводимым.
create extension if not exists pgcrypto with schema extensions;

-- Citext для case-insensitive сравнений (email lookups, normalized merchant
-- names и т.п.).
create extension if not exists citext with schema extensions;

-- Trigram search для merchant search ("найди все Lidl за год") — используется
-- через GIN индексы на transactions.merchant_normalized и patterns.pattern.
create extension if not exists pg_trgm with schema extensions;

-- Composite GIN индексы (b-tree + gin в одном индексе). Пока не используется
-- напрямую, но включаем превентивно — добавление позже потребует миграции.
create extension if not exists btree_gin with schema extensions;

-- ============ UUID v7 ============
-- Primary keys всех domain-таблиц = UUID v7 (sortable by time, RFC 9562).
--
-- Мы НЕ полагаемся на extension `pg_uuidv7` (его нет в managed Supabase) —
-- вместо этого реализуем v7 руками. Спека (Database Schema doc, section 4)
-- ссылается на github.com/fboulnois/pg_uuidv7 как на reference; ниже —
-- portable plpgsql-импл на базе того же алгоритма.
--
-- Layout (16 байт):
--   * первые 48 бит  — Unix timestamp в миллисекундах (big-endian)
--   * 4 бита          — version (0111 = 7)
--   * 12 бит          — random
--   * 2 бита          — variant (10)
--   * 62 бита         — random
create or replace function public.uuid_v7()
returns uuid
language plpgsql
volatile
as $$
declare
  unix_ms       bigint;
  ts_bytes      bytea;
  rand_bytes    bytea;
  combined      bytea;
begin
  -- 48-bit Unix milliseconds — стабильно до 10889 года
  unix_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;

  -- 6 байт timestamp big-endian + 10 байт random
  ts_bytes   := substring(int8send(unix_ms) from 3 for 6);
  rand_bytes := extensions.gen_random_bytes(10);

  combined := ts_bytes || rand_bytes;

  -- Set version nibble (=7) в byte 6 — верхние 4 бита = 0111
  combined := set_byte(
    combined,
    6,
    (get_byte(combined, 6) & 15) | 112
  );

  -- Set variant в byte 8 — верхние 2 бита = 10
  combined := set_byte(
    combined,
    8,
    (get_byte(combined, 8) & 63) | 128
  );

  return encode(combined, 'hex')::uuid;
end;
$$;

comment on function public.uuid_v7() is
  'Generates a UUID v7 (RFC 9562) — sortable by creation time. Used as default
   for all domain-table PKs. Pure plpgsql; no external extension required.';

-- ============ updated_at TRIGGER PATTERN ============
-- Спека определяет колонки `updated_at timestamptz default now()` на каждой
-- mutable-таблице, но НЕ определяет триггер для их обновления при UPDATE.
-- `default now()` срабатывает только на INSERT — без before-update триггера
-- колонка осталась бы статичной. Добавляем shared-функцию здесь, навешиваем
-- триггеры в каждой domain-миграции.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.update_updated_at() is
  'Generic before-update trigger function: bumps NEW.updated_at to now().
   Attached per-table в domain-миграциях через `create trigger ... before update
   ... execute function public.update_updated_at()`.';

-- ============ ENUMS ============
-- Все 11 native enum types спецификации. Имена — `<entity>_<field>`.
-- Содержание — verbatim из Database Schema doc, section 4.

-- Transaction direction (debit = расход, credit = приход).
create type transaction_direction as enum ('debit', 'credit');

-- Transaction kind — нормализованная taxonomy provider'ских кодов.
create type transaction_kind as enum (
  'card_payment',
  'transfer',
  'exchange',
  'fee',
  'cash_withdrawal',
  'standing_order',
  'direct_debit',
  'other'
);

-- Connection status — provider-agnostic state machine для bank_connections.
create type connection_status as enum (
  'pending_consent',
  'connected',
  'expired',
  'reconnecting',
  'revoked',
  'error'
);

-- Sync state lifecycle.
create type sync_status as enum (
  'never_synced',
  'syncing',
  'synced',
  'error'
);

-- Где взялась категория транзакции (3-tier classifier из Architecture).
create type classification_source as enum (
  'user_rule',       -- Tier 1: user's own pattern
  'global_pattern',  -- Tier 2: shared knowledge base
  'ai',              -- Tier 3: LLM fallback (Gemini Flash-Lite)
  'manual',          -- user explicitly chose category
  'inherited'        -- copied from similar transaction
);

-- Period mode для user_preferences (агрегация Cash Flow и пр.).
create type period_mode as enum (
  'week',
  'month',           -- default
  'quarter',
  'year',
  'custom'
);

-- Roles в shared wallet (Section 10 Business Logic).
create type wallet_member_role as enum (
  'owner',
  'member',
  'viewer'
);

-- Awaiting payment lifecycle.
create type awaiting_payment_status as enum (
  'pending',
  'matched',         -- найдена соответствующая transaction
  'overdue',
  'cancelled',
  'completed'
);

-- Источник awaiting payment.
create type awaiting_payment_source as enum (
  'manual',
  'auto_detected'
);

-- Goal status (post-MVP UI, schema готова заранее).
create type goal_status as enum (
  'active',
  'achieved',
  'abandoned',
  'paused'
);

-- Audit event type (для compliance log).
create type audit_event_type as enum (
  'data_export',
  'account_deletion',
  'connection_revoked',
  'sensitive_view',
  'rule_applied'
);
