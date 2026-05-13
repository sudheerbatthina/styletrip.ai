create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_path text not null,
  original_filename text,
  created_at timestamptz default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  trip_location text,
  trip_type text,
  aspect_ratio text,
  number_of_styles int,
  source_photo_id uuid references public.user_photos(id) on delete set null,
  analysis_json jsonb,
  preferences_json jsonb,
  selected_styles_json jsonb,
  status text not null default 'draft',
  final_board_image_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.board_images (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_type text not null,
  style_key text,
  storage_path text not null,
  prompt_used text,
  created_at timestamptz default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  generation_type text not null,
  status text not null,
  meta_json jsonb,
  created_at timestamptz default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_boards_updated_at on public.boards;
create trigger set_boards_updated_at
before update on public.boards
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_photos enable row level security;
alter table public.boards enable row level security;
alter table public.board_images enable row level security;
alter table public.generations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles for delete
using (auth.uid() = id);

drop policy if exists "user_photos_select_own" on public.user_photos;
create policy "user_photos_select_own"
on public.user_photos for select
using (auth.uid() = user_id);

drop policy if exists "user_photos_insert_own" on public.user_photos;
create policy "user_photos_insert_own"
on public.user_photos for insert
with check (auth.uid() = user_id);

drop policy if exists "user_photos_update_own" on public.user_photos;
create policy "user_photos_update_own"
on public.user_photos for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_photos_delete_own" on public.user_photos;
create policy "user_photos_delete_own"
on public.user_photos for delete
using (auth.uid() = user_id);

drop policy if exists "boards_select_own" on public.boards;
create policy "boards_select_own"
on public.boards for select
using (auth.uid() = user_id);

drop policy if exists "boards_insert_own" on public.boards;
create policy "boards_insert_own"
on public.boards for insert
with check (auth.uid() = user_id);

drop policy if exists "boards_update_own" on public.boards;
create policy "boards_update_own"
on public.boards for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "boards_delete_own" on public.boards;
create policy "boards_delete_own"
on public.boards for delete
using (auth.uid() = user_id);

drop policy if exists "board_images_select_own" on public.board_images;
create policy "board_images_select_own"
on public.board_images for select
using (auth.uid() = user_id);

drop policy if exists "board_images_insert_own" on public.board_images;
create policy "board_images_insert_own"
on public.board_images for insert
with check (auth.uid() = user_id);

drop policy if exists "board_images_update_own" on public.board_images;
create policy "board_images_update_own"
on public.board_images for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "board_images_delete_own" on public.board_images;
create policy "board_images_delete_own"
on public.board_images for delete
using (auth.uid() = user_id);

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own"
on public.generations for select
using (auth.uid() = user_id);

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own"
on public.generations for insert
with check (auth.uid() = user_id);

drop policy if exists "generations_update_own" on public.generations;
create policy "generations_update_own"
on public.generations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "generations_delete_own" on public.generations;
create policy "generations_delete_own"
on public.generations for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values
  ('user-photos', 'user-photos', false),
  ('generated-boards', 'generated-boards', false),
  ('generated-outfits', 'generated-outfits', false)
on conflict (id) do nothing;

drop policy if exists "user_photos_storage_select_own" on storage.objects;
create policy "user_photos_storage_select_own"
on storage.objects for select
using (
  bucket_id = 'user-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "user_photos_storage_insert_own" on storage.objects;
create policy "user_photos_storage_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'user-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "user_photos_storage_update_own" on storage.objects;
create policy "user_photos_storage_update_own"
on storage.objects for update
using (
  bucket_id = 'user-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'user-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "user_photos_storage_delete_own" on storage.objects;
create policy "user_photos_storage_delete_own"
on storage.objects for delete
using (
  bucket_id = 'user-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_storage_select_own" on storage.objects;
create policy "generated_storage_select_own"
on storage.objects for select
using (
  bucket_id in ('generated-boards', 'generated-outfits')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_storage_insert_own" on storage.objects;
create policy "generated_storage_insert_own"
on storage.objects for insert
with check (
  bucket_id in ('generated-boards', 'generated-outfits')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_storage_update_own" on storage.objects;
create policy "generated_storage_update_own"
on storage.objects for update
using (
  bucket_id in ('generated-boards', 'generated-outfits')
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('generated-boards', 'generated-outfits')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_storage_delete_own" on storage.objects;
create policy "generated_storage_delete_own"
on storage.objects for delete
using (
  bucket_id in ('generated-boards', 'generated-outfits')
  and auth.uid()::text = (storage.foldername(name))[1]
);
