-- Cicada — migration 0007: categorization
-- ---------------------------------------------------------------------------
-- Three-tier classifier из Architecture, section 6:
--   Tier 1 (rules)         — пользовательские правила, перевешивают всё
--   Tier 2 (patterns)      — глобальная knowledge base, learned from manual
--   Tier 3 (AI)            — LLM fallback (Gemini Flash-Lite)
--
-- Таблицы:
--   * category_groups       — группы для UX (Food, Transport, ...)
--   * categories            — конкретные категории, могут быть user или built-in
--   * patterns              — Tier 2 KB
--   * rules                 — Tier 1 user rules
--   * classification_history — audit/debug AI tier
--
-- В конце: добавляем FK transactions.category_id → categories(id), который
-- был отложен в migration 0005 (forward reference).
--
-- Зависит от: 0001 (uuid_v7, update_updated_at, transaction_direction,
--             transaction_kind, classification_source), 0002 (users),
--             0005 (transactions).
-- ---------------------------------------------------------------------------

-- ============ category_groups ============
-- Группы категорий для UX. user_id IS NULL = глобальная встроенная группа.

create table category_groups (
  id              uuid primary key default public.uuid_v7(),
  user_id         uuid references users(id) on delete cascade,
  -- nullable: NULL = built-in группа, видна всем user'ам.

  name            text not null,
  emoji           text,
  color           text,
  display_order   smallint not null default 0,

  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_category_groups_user
  on category_groups(user_id, display_order)
  where archived_at is null;

alter table category_groups enable row level security;

create policy "everyone reads built-in groups"
  on category_groups for select
  using (user_id is null);

create policy "users manage own groups"
  on category_groups for all
  using (user_id = auth.uid());

create trigger trg_category_groups_updated_at
  before update on category_groups
  for each row execute function public.update_updated_at();

-- ============ categories ============
-- Конкретная категория ("Groceries", "Restaurants"). user_id IS NULL = built-in.

create table categories (
  id              uuid primary key default public.uuid_v7(),
  user_id         uuid references users(id) on delete cascade,
  -- nullable: NULL = built-in default category.
  group_id        uuid references category_groups(id) on delete set null,

  name            text not null,
  emoji           text,
  color           text,
  display_order   smallint not null default 0,

  -- Direction для income/expense classification.
  -- nullable: категория может работать в обе стороны (e.g. "Refunds").
  direction       transaction_direction,

  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_categories_user_group
  on categories(user_id, group_id, display_order)
  where archived_at is null;

alter table categories enable row level security;

create policy "everyone reads built-in categories"
  on categories for select
  using (user_id is null);

create policy "users manage own categories"
  on categories for all
  using (user_id = auth.uid());

create trigger trg_categories_updated_at
  before update on categories
  for each row execute function public.update_updated_at();

-- ============ patterns ============
-- Tier 2 — Global Patterns. Кросс-пользовательская KB. Учится на anonymous
-- данных (когда user manually категоризует — мы извлекаем pattern и
-- аггрегируем через batch jobs в Edge Functions).

create table patterns (
  id                    uuid primary key default public.uuid_v7(),

  pattern               text not null,                    -- merchant string из банков
  pattern_type          text not null
                         check (pattern_type in ('exact', 'prefix', 'contains', 'regex')),

  category_id           uuid not null references categories(id) on delete cascade,
  -- Категория с user_id IS NULL (built-in), куда matcher классифицирует.

  -- Statistics для confidence weighting.
  match_count           int not null default 0,           -- сколько раз matchился
  manual_confirmations  int not null default 0,           -- сколько раз user подтвердил
  manual_overrides      int not null default 0,           -- сколько раз user поменял

  -- Locale/region scoping (паттерны страна-специфичные).
  region                text,                             -- ISO country, NULL = глобальный

  active                boolean not null default true,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_patterns_active
  on patterns(pattern_type, region)
  where active = true;

create index idx_patterns_lookup
  on patterns using gin (pattern extensions.gin_trgm_ops)
  where active = true;

alter table patterns enable row level security;

create policy "authenticated read patterns"
  on patterns for select
  to authenticated
  using (active = true);

-- INSERT/UPDATE — только service role (batch jobs анализирующие manual
-- classifications). Service role обходит RLS, поэтому policy не нужна.

create trigger trg_patterns_updated_at
  before update on patterns
  for each row execute function public.update_updated_at();

-- ============ rules ============
-- Tier 1 — User Rules. Перевешивают global patterns.

create table rules (
  id                uuid primary key default public.uuid_v7(),
  user_id           uuid not null references users(id) on delete cascade,

  -- Match condition.
  match_merchant    text,
  match_type        text check (match_type in ('exact', 'prefix', 'contains', 'regex')),
  match_amount_min  bigint,                               -- optional фильтр
  match_amount_max  bigint,
  match_kind        transaction_kind,                     -- optional

  -- Action.
  category_id       uuid not null references categories(id) on delete cascade,
  set_notes         text,                                 -- optional: автоматический note

  -- Statistics.
  match_count       int not null default 0,
  active            boolean not null default true,

  -- Order для tie-breaking (если multiple rules матчатся).
  priority          smallint not null default 0,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_rules_user_active
  on rules(user_id, priority desc)
  where active = true;

alter table rules enable row level security;

create policy "users manage own rules"
  on rules for all
  using (user_id = auth.uid());

create trigger trg_rules_updated_at
  before update on rules
  for each row execute function public.update_updated_at();

-- ============ classification_history ============
-- Audit для AI tier. Когда AI классифицирует — пишем history. Зачем:
--   (a) debugging,
--   (b) training data для будущего fine-tuning,
--   (c) показ user'у "почему эта категория".

create table classification_history (
  id              uuid primary key default public.uuid_v7(),
  transaction_id  uuid not null references transactions(id) on delete cascade,

  source          classification_source not null,
  source_ref      uuid,                                   -- ID rule / pattern / NULL для AI/manual
  category_id     uuid references categories(id) on delete set null,
  confidence      real,
  reasoning       text,                                   -- AI explanation, NULL для rule/pattern

  occurred_at     timestamptz not null default now()
);

create index idx_classification_history_transaction
  on classification_history(transaction_id, occurred_at desc);

alter table classification_history enable row level security;

create policy "users see history of own transactions"
  on classification_history for select
  using (
    exists (
      select 1 from transactions t
      join wallets w on w.id = t.wallet_id
      where t.id = classification_history.transaction_id
        and w.owner_id = auth.uid()
    )
  );

-- INSERT — только service role (классификатор пишет события). RLS не нужен.

-- ============ FORWARD REFERENCE: transactions.category_id → categories(id) ============
-- В migration 0005 (transactions) FK был отложен из-за порядка миграций
-- (categories ещё не существовала). Закрываем эту зависимость теперь.

alter table transactions
  add constraint transactions_category_id_fkey
  foreign key (category_id) references categories(id) on delete set null;
