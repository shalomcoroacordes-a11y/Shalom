\set ON_ERROR_STOP on
-- Run only on an empty disposable PostgreSQL instance. Reuse the established
-- trash fixture and its standalone rollback/legacy regression first.
\ir trash-transaction.sql
create role service_role nologin bypassrls;
grant usage on schema auth to authenticated;
alter table public.songs add column lyrics text,add column tone text,add column capo_position integer,add column capo_key text;
create or replace function public.admin_has_permission(text) returns boolean language sql stable as $perm$
 select auth.uid() is not null and not coalesce(current_setting('test.blocked',true)='yes',false) and case $1
  when 'songs.delete' then coalesce(current_setting('test.can_delete',true)='yes',false)
  when 'songs.publish' then coalesce(current_setting('test.can_publish',true)='yes',false)
  else false end
$perm$;
do $fixture$
declare t text;
begin
 foreach t in array array['admin_roles','admin_role_permissions','admin_user_roles','admin_permission_overrides','admin_access_blocks','admin_invites','admin_profiles','admin_audit_log'] loop
  if t<>'admin_audit_log' then execute format('create table public.%I(id uuid primary key)',t);end if;
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy fixture_read on public.%I for select to authenticated using (true)',t);
  execute format('grant all on table public.%I to authenticated,service_role',t);
 end loop;
end
$fixture$;
\ir ../../sql/SHALOM_ADMIN_ROLE_PRIVILEGES.sql
\ir ../../sql/SHALOM_STUDIO_HISTORY.sql

insert into public.songs(id,title,updated_at,lyrics,tone,capo_position,capo_key)
 values('10000000-0000-4000-8000-000000000010','Synthetic integration','2026-11-20 12:00:00+00','Original lyric','G',2,'F');
insert into public.song_studio_arrangements(song_id,song_revision,arrangement,updated_at)
 values('10000000-0000-4000-8000-000000000010','2026-11-20 12:00:00+00','{"v":1,"pattern":["D","U"]}','2026-11-20 12:01:00+00');
-- Existing arrangement predates the test. Mirror the deployed touch triggers
-- for subsequent operations; updated_at is metadata, not song_revision.
create function public.studio_touch_updated_at() returns trigger language plpgsql set search_path='' as $
begin new.updated_at=now(); return new; end;$;
create trigger studio_touch before insert or update on public.song_studio_arrangements for each row execute function public.studio_touch_updated_at();
create function public.set_updated_at() returns trigger language plpgsql set search_path to pg_catalog,public as $
begin new.updated_at=now(); return new; end;$;
create trigger set_songs_updated_at before update on public.songs for each row execute function public.set_updated_at();
insert into public.song_links values(gen_random_uuid(),'10000000-0000-4000-8000-000000000010');
-- Force the final audit insert to fail after all deletes and history triggers.
alter table public.admin_audit_log add constraint fixture_reject_delete check(action <> 'song.deleted');
set role authenticated;
select set_config('test.actor','00000000-0000-4000-8000-000000000001',false);
select set_config('test.can_delete','yes',false);
select set_config('test.can_publish','yes',false);
select set_config('test.owner','yes',false);
do $check$
begin
 begin
  perform public.admin_delete_song_complete('10000000-0000-4000-8000-000000000010');
  raise exception 'expected audit failure';
 exception when check_violation then null;end;
end
$check$;
reset role;
do $check$
begin
 if (select count(*) from public.songs)<>1 or (select count(*) from public.song_studio_arrangements)<>1 or (select count(*) from public.song_links)<>1 then raise exception 'delete escaped transaction rollback';end if;
 if exists(select 1 from public.admin_trash) or exists(select 1 from public.song_studio_history) or exists(select 1 from public.admin_audit_log) then raise exception 'backup, history or audit escaped rollback';end if;
end
$check$;
alter table public.admin_audit_log drop constraint fixture_reject_delete;

set role authenticated;
do $check$
begin
 begin
  truncate public.admin_audit_log;
  raise exception 'direct truncate allowed';
 exception when insufficient_privilege then null;end;
 if not public.admin_delete_song('10000000-0000-4000-8000-000000000010') then raise exception 'legacy delete RPC failed';end if;
 if not exists(select 1 from public.song_studio_history where reason='song_deleted' and song_context->>'lyrics'='Original lyric' and song_context->>'capo_key'='F' and arrangement->'pattern'='["D","U"]'::jsonb) then raise exception 'missing exact revision history';end if;
end
$check$;
select set_config('test.can_publish','no',false);
do $check$
begin
 if exists(select 1 from public.song_studio_history) then raise exception 'delete privilege leaked history read';end if;
end
$check$;
reset role;
do $check$
begin
 if exists(select 1 from public.songs) or exists(select 1 from public.song_studio_arrangements) or exists(select 1 from public.song_links) then raise exception 'delete incomplete';end if;
 if (select count(*) from public.admin_trash where snapshot->'song_studio_arrangements'->0->'arrangement'='{"v":1,"pattern":["D","U"]}'::jsonb)<>1 then raise exception 'snapshot mismatch';end if;
 if (select count(*) from public.admin_audit_log where action='song.deleted')<>1 then raise exception 'missing privileged audit';end if;
end
$check$;
select id as trash_id from public.admin_trash \gset
set role authenticated;
select set_config('test.owner','no',false);
-- psql variables are substituted outside dollar-quoted function bodies.
select set_config('test.trash_id',:'trash_id',false);
do $check$
begin
 begin
  perform public.admin_restore_song(current_setting('test.trash_id')::uuid);
  raise exception 'expected owner denial';
 exception when others then if sqlerrm not like 'Solo el superadministrador%' then raise;end if;end;
end
$check$;
select set_config('test.owner','yes',false);
select set_config('test.blocked','yes',false);
do $check$
begin
 if public.admin_is_owner() is not true or public.admin_has_permission('songs.delete') is not false then raise exception 'blocked owner fixture invalid';end if;
 begin
  perform public.admin_restore_song(current_setting('test.trash_id')::uuid);
  raise exception 'expected blocked owner denial';
 exception when others then if sqlerrm not like 'Solo el superadministrador%' then raise;end if;end;
end
$check$;
reset role;
do $check$
begin
 if exists(select 1 from public.songs) or not exists(select 1 from public.admin_trash) or exists(select 1 from public.admin_audit_log where action='song.restored') then raise exception 'blocked restore changed state';end if;
end
$check$;
set role authenticated;
select set_config('test.blocked','no',false);
do $check$
begin
 if not public.admin_restore_song(current_setting('test.trash_id')::uuid) then raise exception 'restore failed';end if;
end
$check$;
reset role;
do $check$
begin
 if not exists(select 1 from public.songs s join public.song_studio_arrangements a on a.song_id=s.id and a.song_revision=s.updated_at where s.lyrics='Original lyric' and s.capo_key='F' and a.arrangement='{"v":1,"pattern":["D","U"]}'::jsonb) then raise exception 'restore revision or context mismatch';end if;
 if (select count(*) from public.song_links)<>1 or exists(select 1 from public.admin_trash) then raise exception 'restore relations or trash mismatch';end if;
 if not exists(select 1 from public.song_studio_arrangements where song_revision='2026-11-20 12:00:00+00'::timestamptz and updated_at>'2026-11-20 12:01:00+00'::timestamptz) then raise exception 'touch trigger changed revision or did not refresh metadata';end if;
 if not exists(select 1 from public.song_studio_history where reason='song_deleted' and arrangement_updated_at='2026-11-20 12:01:00+00'::timestamptz) then raise exception 'original archived timestamp not preserved';end if;
 if not exists(select 1 from public.song_studio_history where reason='song_deleted') or (select count(*) from public.admin_audit_log where action='song.restored')<>1 then raise exception 'history/audit missing after restore';end if;
end
$check$;
\echo 'Combined SQL: role privileges, rollback across audit/trash/history, legacy delete, restricted history, blocked owner denial, deployed touch triggers and exact restored revision passed.'
