-- Schema for the Servd app on Supabase Postgres.
-- Run in the Supabase SQL editor. Every statement is idempotent, so it is safe
-- to re-run against an existing database.
--
-- Rows are owned by Clerk user ids. All access happens through the Next.js
-- server actions using the service role key, so RLS is enabled with no policies:
-- the anon/authenticated keys are denied everything and the service role bypasses
-- RLS. If you ever query from the browser, add explicit policies first.

-- gen_random_uuid() is built in on Postgres 13+, but this keeps the file safe
-- on older databases.
create extension if not exists pgcrypto;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cuisine text,
  category text,
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  image_url text,
  is_public boolean not null default true,
  author_clerk_id text,
  prep_time integer,
  cook_time integer,
  servings integer,
  nutrition jsonb,
  tips jsonb,
  substitutions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recipes are looked up by title before generating a new one.
create unique index if not exists recipes_title_key
  on public.recipes (lower(title));

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity text,
  image_url text,
  owner_clerk_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists pantry_items_owner_idx
  on public.pantry_items (owner_clerk_id);

create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_clerk_id text not null,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_clerk_id, recipe_id)
);

create index if not exists saved_recipes_user_idx
  on public.saved_recipes (user_clerk_id);

-- Deleting a recipe cascades to its saved rows, so that lookup needs an index.
create index if not exists saved_recipes_recipe_idx
  on public.saved_recipes (recipe_id);

-- The column default only covers inserts; this keeps updated_at correct on
-- updates too.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row
  execute function public.set_updated_at();

alter table public.recipes enable row level security;
alter table public.pantry_items enable row level security;
alter table public.saved_recipes enable row level security;
