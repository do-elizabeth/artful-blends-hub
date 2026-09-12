-- Run this in the Supabase SQL editor (safe to re-run).
-- Also turn off Confirm email: Authentication → Providers → Email → Confirm email.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  country text not null default '',
  last_ip text not null default '',
  browser text not null default '',
  device text not null default '',
  is_active boolean not null default true,
  is_online boolean not null default false,
  is_admin boolean not null default false,
  withdrawn_at timestamptz,
  generations_count integer not null default 0,
  downloads_count integer not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists last_ip text not null default '';
alter table public.profiles add column if not exists browser text not null default '';
alter table public.profiles add column if not exists device text not null default '';
alter table public.profiles add column if not exists is_online boolean not null default false;
alter table public.profiles add column if not exists withdrawn_at timestamptz;
alter table public.profiles add column if not exists downloads_count integer not null default 0;

alter table public.profiles enable row level security;

-- Keep this in sync with VITE_ADMIN_EMAIL
create or replace function public.admin_email()
returns text
language sql
immutable
as $$
  select 'gurawrgura@gmail.com';
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    lower(coalesce(new.email, '')) = public.admin_email()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        is_admin = excluded.is_admin;

  if lower(coalesce(new.email, '')) = public.admin_email() then
    update public.profiles set is_admin = false where id <> new.id and is_admin;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.is_admin := old.is_admin;
    if new.withdrawn_at is not null and old.withdrawn_at is null then
      new.is_active := false;
      new.is_online := false;
    else
      new.is_active := old.is_active;
    end if;
    if old.withdrawn_at is not null then
      new.withdrawn_at := old.withdrawn_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

create or replace function public.sync_admin_flag()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  the_admin boolean;
begin
  the_admin := lower(coalesce((select email from auth.users where id = auth.uid()), '')) = public.admin_email();

  update public.profiles
  set is_admin = the_admin,
      email = coalesce((select email from auth.users where id = auth.uid()), email)
  where id = auth.uid();

  if the_admin then
    update public.profiles set is_admin = false where id <> auth.uid() and is_admin;
  end if;

  return the_admin;
end;
$$;

create or replace function public.touch_presence(online boolean default true)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set is_online = online and withdrawn_at is null,
      last_seen_at = case when online then now() else last_seen_at end
  where id = auth.uid()
    and withdrawn_at is null;
$$;

create or replace function public.withdraw_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set withdrawn_at = coalesce(withdrawn_at, now()),
      is_online = false,
      is_active = false
  where id = auth.uid();
end;
$$;

drop policy if exists "read own or admin" on public.profiles;
create policy "read own or admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "update own or admin" on public.profiles;
create policy "update own or admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

grant execute on function public.sync_admin_flag() to authenticated;
grant execute on function public.touch_presence(boolean) to authenticated;
grant execute on function public.withdraw_account() to authenticated;

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default '',
  prompt text not null default '',
  image_path text not null default '',
  image_url text not null default '',
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cloudinary_settings (
  id integer primary key check (id = 1),
  cloud_name text not null default '',
  upload_preset text not null default '',
  folder text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.cloudinary_settings enable row level security;

drop policy if exists "authenticated can read cloudinary settings" on public.cloudinary_settings;
create policy "authenticated can read cloudinary settings"
  on public.cloudinary_settings for select
  to authenticated
  using (true);

drop policy if exists "admins can write cloudinary settings" on public.cloudinary_settings;
create policy "admins can write cloudinary settings"
  on public.cloudinary_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.cloudinary_settings to authenticated;
grant insert, update, delete on public.cloudinary_settings to authenticated;

alter table public.generations enable row level security;

drop policy if exists "read own generations" on public.generations;
create policy "read own generations"
  on public.generations for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "insert own generations" on public.generations;
create policy "insert own generations"
  on public.generations for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "update own generations" on public.generations;
create policy "update own generations"
  on public.generations for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "delete own generations" on public.generations;
create policy "delete own generations"
  on public.generations for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.sync_generation_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.user_id, old.user_id);
  update public.profiles
  set generations_count = (select count(*) from public.generations where user_id = target)
  where id = target;
  return null;
end;
$$;

drop trigger if exists sync_generation_count on public.generations;
create trigger sync_generation_count
  after insert or delete on public.generations
  for each row execute function public.sync_generation_count();

create or replace function public.increment_download(generation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
  owner_id uuid;
begin
  update public.generations
  set download_count = download_count + 1
  where id = generation_id
    and (user_id = auth.uid() or public.is_admin())
  returning download_count, user_id into next_count, owner_id;

  if owner_id is not null then
    update public.profiles
    set downloads_count = downloads_count + 1
    where id = owner_id;
  end if;

  return coalesce(next_count, 0);
end;
$$;

grant execute on function public.increment_download(uuid) to authenticated;

create or replace function public.increment_profile_downloads()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  update public.profiles
  set downloads_count = downloads_count + 1
  where id = auth.uid()
    and withdrawn_at is null;

  select downloads_count into next_count
  from public.profiles
  where id = auth.uid();

  return coalesce(next_count, 0);
end;
$$;

grant execute on function public.increment_profile_downloads() to authenticated;

insert into storage.buckets (id, name, public)
values ('generations', 'generations', true)
on conflict (id) do nothing;

drop policy if exists "public read generation files" on storage.objects;
create policy "public read generation files"
  on storage.objects for select
  using (bucket_id = 'generations');

drop policy if exists "upload own generation files" on storage.objects;
create policy "upload own generation files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'generations'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "delete own generation files" on storage.objects;
create policy "delete own generation files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'generations'
    and split_part(name, '/', 1) = auth.uid()::text
  );
