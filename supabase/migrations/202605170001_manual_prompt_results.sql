create extension if not exists "pgcrypto";

create table if not exists public.manual_prompt_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  board_id uuid null references public.boards(id) on delete set null,
  prompt_version text,
  prompt_used text,
  imported_image_path text,
  imported_image_url text,
  source text default 'manual-chatgpt',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.manual_prompt_results enable row level security;

drop policy if exists "manual_prompt_results_select_own" on public.manual_prompt_results;
create policy "manual_prompt_results_select_own"
on public.manual_prompt_results for select
using (auth.uid() = user_id);

drop policy if exists "manual_prompt_results_insert_own" on public.manual_prompt_results;
create policy "manual_prompt_results_insert_own"
on public.manual_prompt_results for insert
with check (auth.uid() = user_id);

drop policy if exists "manual_prompt_results_update_own" on public.manual_prompt_results;
create policy "manual_prompt_results_update_own"
on public.manual_prompt_results for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "manual_prompt_results_delete_own" on public.manual_prompt_results;
create policy "manual_prompt_results_delete_own"
on public.manual_prompt_results for delete
using (auth.uid() = user_id);

create index if not exists manual_prompt_results_user_id_idx
  on public.manual_prompt_results(user_id);

create index if not exists manual_prompt_results_board_id_idx
  on public.manual_prompt_results(board_id);

create index if not exists manual_prompt_results_created_at_idx
  on public.manual_prompt_results(created_at desc);
