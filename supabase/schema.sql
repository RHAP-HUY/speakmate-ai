-- SpeakMate AI - Multi-user English Speaking Database Schema (Supabase PostgreSQL)
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New Query

create extension if not exists "pgcrypto";

-- Helper function for updated_at timestamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. User Profiles (synced across devices)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '',
  english_level text not null default 'A0-A1' check (english_level in ('A0-A1', 'A2-B1', 'B2+')),
  job_field text not null default '',
  hobbies text[] not null default '{}',
  preferred_accent text not null default 'US' check (preferred_accent in ('US', 'UK', 'AU', 'CA', 'MIXED')),
  preferred_speed numeric(3,2) not null default 0.85,
  daily_goal_minutes integer not null default 15,
  streak_days integer not null default 0,
  last_practice_date date,
  onboarding_completed boolean not null default false,
  api_key_mode text not null default 'system' check (api_key_mode in ('system', 'personal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile row when a new user signs up (Email, Google, or Magic Link)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_name text;
begin
  initial_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    ''
  );

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, initial_name)
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Personal Encrypted Gemini API Keys (optional BYOK per user)
create table if not exists public.user_api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_gemini_key text not null,
  key_hint text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_api_keys_updated_at on public.user_api_keys;
create trigger trg_user_api_keys_updated_at
  before update on public.user_api_keys
  for each row execute function public.set_updated_at();

alter table public.user_api_keys enable row level security;

drop policy if exists "Users manage own api key" on public.user_api_keys;
create policy "Users manage own api key"
  on public.user_api_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null,
  scenario_title text not null,
  topic_category text not null default 'daily',
  accent text not null default 'US',
  ai_persona text not null default 'Emma',
  level text not null default 'A0-A1',
  duration_seconds integer not null default 0,
  message_count integer not null default 0,
  summary_vi text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_conversations_user_started
  on public.conversations (user_id, started_at desc);

alter table public.conversations enable row level security;

drop policy if exists "Users manage own conversations" on public.conversations;
create policy "Users manage own conversations"
  on public.conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Conversation Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  english_text text not null,
  vietnamese_translation text,
  natural_rewrite text,
  coaching_tip text,
  reply_hints jsonb not null default '[]'::jsonb,
  pronunciation jsonb,
  created_at timestamptz not null default now()
);

-- Safe idempotent migration for existing databases
alter table public.messages
  add column if not exists pronunciation jsonb;

create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at asc);

alter table public.messages enable row level security;

drop policy if exists "Users manage own messages" on public.messages;
create policy "Users manage own messages"
  on public.messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Saved Phrases & Idioms Notebook
create table if not exists public.saved_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  english_phrase text not null,
  vietnamese_meaning text not null,
  phonetic text,
  example_sentence text,
  category text not null default 'daily',
  accent text not null default 'US',
  mastery_level integer not null default 0 check (mastery_level between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, english_phrase)
);

create index if not exists idx_saved_phrases_user_created
  on public.saved_phrases (user_id, created_at desc);

drop trigger if exists trg_saved_phrases_updated_at on public.saved_phrases;
create trigger trg_saved_phrases_updated_at
  before update on public.saved_phrases
  for each row execute function public.set_updated_at();

alter table public.saved_phrases enable row level security;

drop policy if exists "Users manage own phrases" on public.saved_phrases;
create policy "Users manage own phrases"
  on public.saved_phrases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Daily Practice Statistics (for cross-device progress chart & streak)
create table if not exists public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_date date not null,
  seconds_practiced integer not null default 0,
  messages_sent integer not null default 0,
  sessions_completed integer not null default 0,
  unique (user_id, practice_date)
);

create index if not exists idx_daily_stats_user_date
  on public.daily_stats (user_id, practice_date desc);

alter table public.daily_stats enable row level security;

drop policy if exists "Users manage own daily stats" on public.daily_stats;
create policy "Users manage own daily stats"
  on public.daily_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
