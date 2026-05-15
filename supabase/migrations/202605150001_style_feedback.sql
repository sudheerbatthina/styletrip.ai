create extension if not exists "pgcrypto";

create table if not exists public.style_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  reference_look_id text not null,
  feedback_type text not null check (
    feedback_type in (
      'selected',
      'deselected',
      'not_my_style',
      'generated',
      'saved',
      'downloaded'
    )
  ),
  look_title text,
  occasion text,
  fit text,
  color_mood text,
  items jsonb,
  score_snapshot jsonb,
  created_at timestamptz default now()
);

create index if not exists style_feedback_user_created_idx
on public.style_feedback (user_id, created_at desc);

create index if not exists style_feedback_user_idx
on public.style_feedback (user_id);

create index if not exists style_feedback_type_idx
on public.style_feedback (feedback_type);

create index if not exists style_feedback_created_idx
on public.style_feedback (created_at desc);

create index if not exists style_feedback_board_idx
on public.style_feedback (board_id);

alter table public.style_feedback enable row level security;

drop policy if exists "style_feedback_select_own" on public.style_feedback;
create policy "style_feedback_select_own"
on public.style_feedback for select
using (auth.uid() = user_id);

drop policy if exists "style_feedback_insert_own" on public.style_feedback;
create policy "style_feedback_insert_own"
on public.style_feedback for insert
with check (auth.uid() = user_id);

drop policy if exists "style_feedback_update_own" on public.style_feedback;
create policy "style_feedback_update_own"
on public.style_feedback for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "style_feedback_delete_own" on public.style_feedback;
create policy "style_feedback_delete_own"
on public.style_feedback for delete
using (auth.uid() = user_id);
