-- SHALOM Studio: review and test before applying to the live project.
-- Published arrangements only. Administrative drafts remain local.
begin;
create table if not exists public.song_studio_arrangements (
  song_id uuid primary key references public.songs(id) on delete cascade,
  song_revision timestamptz not null,
  arrangement jsonb not null check (
    jsonb_typeof(arrangement) = 'object'
    and arrangement ? 'v' and arrangement->>'v' = '1'
    and octet_length(arrangement::text) <= 65536
  ),
  updated_at timestamptz not null default now()
);
alter table public.song_studio_arrangements enable row level security;
revoke all on public.song_studio_arrangements from public, anon, authenticated;
grant select on public.song_studio_arrangements to anon, authenticated;
grant insert, update, delete on public.song_studio_arrangements to authenticated;
grant select, insert, update, delete on public.song_studio_arrangements to service_role;
drop policy if exists studio_read_current on public.song_studio_arrangements;
create policy studio_read_current on public.song_studio_arrangements
for select to anon, authenticated using (
  exists(select 1 from public.songs s where s.id = song_id and s.updated_at = song_revision)
);
drop policy if exists studio_admin_read on public.song_studio_arrangements;
create policy studio_admin_read on public.song_studio_arrangements for select to authenticated
using ((select public.admin_has_permission('songs.publish')));
drop policy if exists studio_admin_insert on public.song_studio_arrangements;
create policy studio_admin_insert on public.song_studio_arrangements for insert to authenticated
with check ((select public.admin_has_permission('songs.publish')) and
  exists(select 1 from public.songs s where s.id = song_id and s.updated_at = song_revision));
drop policy if exists studio_admin_update on public.song_studio_arrangements;
create policy studio_admin_update on public.song_studio_arrangements for update to authenticated
using ((select public.admin_has_permission('songs.publish')))
with check ((select public.admin_has_permission('songs.publish')) and
  exists(select 1 from public.songs s where s.id = song_id and s.updated_at = song_revision));
drop policy if exists studio_admin_delete on public.song_studio_arrangements;
create policy studio_admin_delete on public.song_studio_arrangements for delete to authenticated
using ((select public.admin_has_permission('songs.publish')));
create or replace function public.studio_touch_updated_at() returns trigger language plpgsql
security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.studio_touch_updated_at() from public, anon, authenticated;
drop trigger if exists studio_touch on public.song_studio_arrangements;
create trigger studio_touch before insert or update on public.song_studio_arrangements
for each row execute function public.studio_touch_updated_at();
commit;
