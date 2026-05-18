create table if not exists reference_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references profiles(id) on delete cascade,
  title text not null,
  source text default 'curated',
  source_name text null,
  source_url text null,
  photographer text null,
  photographer_url text null,
  attribution_text text null,
  image_path text null,
  image_url text null,
  gender_style text null,
  occasion_tags jsonb default '[]'::jsonb,
  style_tags jsonb default '[]'::jsonb,
  fit_tags jsonb default '[]'::jsonb,
  color_tags jsonb default '[]'::jsonb,
  item_tags jsonb default '[]'::jsonb,
  season_tags jsonb default '[]'::jsonb,
  metadata_json jsonb default '{}'::jsonb,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reference_assets enable row level security;

create index if not exists reference_assets_user_id_idx on reference_assets(user_id);
create index if not exists reference_assets_public_idx on reference_assets(is_public);
create index if not exists reference_assets_created_at_idx on reference_assets(created_at desc);

create policy if not exists "Reference assets are selectable by owner or public"
  on reference_assets for select
  using (is_public = true or auth.uid() = user_id);

create policy if not exists "Users can insert own reference assets"
  on reference_assets for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own reference assets"
  on reference_assets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can delete own reference assets"
  on reference_assets for delete
  using (auth.uid() = user_id);

create or replace function set_reference_assets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reference_assets_updated_at on reference_assets;
create trigger reference_assets_updated_at
  before update on reference_assets
  for each row execute function set_reference_assets_updated_at();