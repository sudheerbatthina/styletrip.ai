create extension if not exists "pgcrypto";

create table if not exists public.manual_extracted_looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  manual_result_id uuid not null references public.manual_prompt_results(id) on delete cascade,
  board_id uuid null references public.boards(id) on delete set null,
  title text not null,
  occasion text,
  fit text,
  color_mood text,
  items jsonb default '[]'::jsonb,
  colors jsonb default '[]'::jsonb,
  footwear jsonb default '[]'::jsonb,
  accessories jsonb default '[]'::jsonb,
  why_it_works text,
  match_score int,
  source_image_path text,
  source_crop_path text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.manual_extracted_looks enable row level security;

drop policy if exists "manual_extracted_looks_select_own" on public.manual_extracted_looks;
create policy "manual_extracted_looks_select_own"
on public.manual_extracted_looks for select
using (auth.uid() = user_id);

drop policy if exists "manual_extracted_looks_insert_own" on public.manual_extracted_looks;
create policy "manual_extracted_looks_insert_own"
on public.manual_extracted_looks for insert
with check (auth.uid() = user_id);

drop policy if exists "manual_extracted_looks_update_own" on public.manual_extracted_looks;
create policy "manual_extracted_looks_update_own"
on public.manual_extracted_looks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "manual_extracted_looks_delete_own" on public.manual_extracted_looks;
create policy "manual_extracted_looks_delete_own"
on public.manual_extracted_looks for delete
using (auth.uid() = user_id);

create index if not exists manual_extracted_looks_user_id_idx
  on public.manual_extracted_looks(user_id);

create index if not exists manual_extracted_looks_manual_result_id_idx
  on public.manual_extracted_looks(manual_result_id);

create index if not exists manual_extracted_looks_board_id_idx
  on public.manual_extracted_looks(board_id);

create index if not exists manual_extracted_looks_created_at_idx
  on public.manual_extracted_looks(created_at desc);
