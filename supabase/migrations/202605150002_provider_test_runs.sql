create extension if not exists "pgcrypto";

create table if not exists public.provider_test_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  model text,
  status text not null,
  selected_reference_look_json jsonb,
  prompt_version text,
  prompt_used text,
  estimated_cost_usd numeric,
  actual_cost_usd numeric,
  image_count int default 1,
  output_image_path text,
  output_image_url text,
  error_message text,
  metadata_json jsonb,
  created_at timestamptz default now()
);

create index if not exists provider_test_runs_user_created_idx
on public.provider_test_runs (user_id, created_at desc);

create index if not exists provider_test_runs_provider_idx
on public.provider_test_runs (provider);

create index if not exists provider_test_runs_status_idx
on public.provider_test_runs (status);

alter table public.provider_test_runs enable row level security;

drop policy if exists "provider_test_runs_select_own" on public.provider_test_runs;
create policy "provider_test_runs_select_own"
on public.provider_test_runs for select
using (auth.uid() = user_id);

drop policy if exists "provider_test_runs_insert_own" on public.provider_test_runs;
create policy "provider_test_runs_insert_own"
on public.provider_test_runs for insert
with check (auth.uid() = user_id);

drop policy if exists "provider_test_runs_update_own" on public.provider_test_runs;
create policy "provider_test_runs_update_own"
on public.provider_test_runs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "provider_test_runs_delete_own" on public.provider_test_runs;
create policy "provider_test_runs_delete_own"
on public.provider_test_runs for delete
using (auth.uid() = user_id);
