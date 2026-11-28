-- SHALOM Studio: independent, reviewed SQL maintenance script.
-- Apply only after the published arrangements schema and RBAC have been validated.
-- No historical arrangement is automatically rebound to a newer song revision.
begin;
create schema if not exists shalom_studio_private;
revoke all on schema shalom_studio_private from public, anon, authenticated;

create table if not exists public.song_studio_history (
 id uuid primary key default gen_random_uuid(),
 song_id uuid not null,
 song_revision timestamptz not null,
 arrangement jsonb not null check (jsonb_typeof(arrangement)='object' and arrangement ? 'v' and arrangement->>'v'='1' and octet_length(arrangement::text)<=65536),
 arrangement_updated_at timestamptz not null,
 song_context jsonb,
 reason text not null check(reason in ('song_revision_changed','song_deleted','arrangement_replaced','arrangement_deleted')),
 archived_at timestamptz not null default clock_timestamp()
);
-- Deliberately no FK to songs: a song's deletion must not erase its history.
create index if not exists song_studio_history_song_id_idx on public.song_studio_history(song_id,archived_at desc,id);
alter table public.song_studio_history enable row level security;
revoke all on table public.song_studio_history from public, anon, authenticated, service_role;
grant select on table public.song_studio_history to authenticated,service_role;
drop policy if exists studio_history_admin_read on public.song_studio_history;
create policy studio_history_admin_read on public.song_studio_history
 for select to authenticated using ((select public.admin_has_permission('songs.publish')));

-- Internal trigger helpers, not callable through the public Data API. They archive
-- authorized changes, including maintenance and cascades, with the original revision.
create or replace function shalom_studio_private.archive_arrangement()
returns trigger language plpgsql security definer set search_path=''
as $archive$
declare context jsonb;
begin
 if tg_op='UPDATE' then
  if old.song_id is not distinct from new.song_id and old.song_revision is not distinct from new.song_revision and old.arrangement is not distinct from new.arrangement then
   return new;
  end if;
 end if;
 select jsonb_build_object('title',s.title,'lyrics',s.lyrics,'tone',s.tone,'capo_position',s.capo_position,'capo_key',s.capo_key,'updated_at',s.updated_at)
 into context from public.songs s where s.id=old.song_id and s.updated_at=old.song_revision;
 insert into public.song_studio_history(song_id,song_revision,arrangement,arrangement_updated_at,song_context,reason)
 values(old.song_id,old.song_revision,old.arrangement,old.updated_at,context,
        case when tg_op='DELETE' then 'arrangement_deleted' else 'arrangement_replaced' end);
 if tg_op='DELETE' then return old;end if;
 return new;
end;
$archive$;

create or replace function shalom_studio_private.archive_song_revision()
returns trigger language plpgsql security definer set search_path=''
as $archive$
begin
 if tg_op='UPDATE' then
  if old.updated_at is not distinct from new.updated_at then return new;end if;
 end if;
 -- Archive only a matching revision. Never attach new lyrics to a stale arrangement.
 insert into public.song_studio_history(song_id,song_revision,arrangement,arrangement_updated_at,song_context,reason)
 select a.song_id,a.song_revision,a.arrangement,a.updated_at,
        jsonb_build_object('title',old.title,'lyrics',old.lyrics,'tone',old.tone,'capo_position',old.capo_position,'capo_key',old.capo_key,'updated_at',old.updated_at),
        case when tg_op='DELETE' then 'song_deleted' else 'song_revision_changed' end
 from public.song_studio_arrangements a where a.song_id=old.id and a.song_revision=old.updated_at;
 if tg_op='DELETE' then return old;end if;
 return new;
end;
$archive$;
revoke all on function shalom_studio_private.archive_arrangement() from public,anon,authenticated,service_role;
revoke all on function shalom_studio_private.archive_song_revision() from public,anon,authenticated,service_role;

drop trigger if exists studio_archive_arrangement on public.song_studio_arrangements;
create trigger studio_archive_arrangement before update or delete on public.song_studio_arrangements
 for each row execute function shalom_studio_private.archive_arrangement();
drop trigger if exists studio_archive_song_revision on public.songs;
create trigger studio_archive_song_revision after update on public.songs
 for each row execute function shalom_studio_private.archive_song_revision();
drop trigger if exists studio_archive_song_delete on public.songs;
create trigger studio_archive_song_delete before delete on public.songs
 for each row execute function shalom_studio_private.archive_song_revision();
commit;
