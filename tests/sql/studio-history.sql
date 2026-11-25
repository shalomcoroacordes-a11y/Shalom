\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 fixture only.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $uid$
 select nullif(current_setting('test.actor',true),'')::uuid
$uid$;
grant usage on schema auth to authenticated;
create function public.admin_has_permission(text) returns boolean language sql stable as $perm$
 select auth.uid()='00000000-0000-4000-8000-000000000001'::uuid and $1='songs.publish'
$perm$;
create table public.songs(id uuid primary key,title text,lyrics text,tone text,capo_position integer,capo_key text,updated_at timestamptz not null);
create table public.song_studio_arrangements(song_id uuid primary key references public.songs on delete cascade,song_revision timestamptz not null,arrangement jsonb not null,updated_at timestamptz not null default now());
grant select on public.songs to anon,authenticated;
alter table public.song_studio_arrangements enable row level security;
grant select on public.song_studio_arrangements to anon,authenticated;
grant insert,update,delete on public.song_studio_arrangements to authenticated;
create policy current_read on public.song_studio_arrangements for select to anon,authenticated using (
 exists(select 1 from public.songs s where s.id=song_id and s.updated_at=song_revision)
);
create policy admin_read on public.song_studio_arrangements for select to authenticated using(public.admin_has_permission('songs.publish'));
create policy admin_insert on public.song_studio_arrangements for insert to authenticated with check(public.admin_has_permission('songs.publish') and exists(select 1 from public.songs s where s.id=song_id and s.updated_at=song_revision));
create policy admin_update on public.song_studio_arrangements for update to authenticated using(public.admin_has_permission('songs.publish')) with check(public.admin_has_permission('songs.publish') and exists(select 1 from public.songs s where s.id=song_id and s.updated_at=song_revision));
create policy admin_delete on public.song_studio_arrangements for delete to authenticated using(public.admin_has_permission('songs.publish'));
\ir ../../sql/SHALOM_STUDIO_HISTORY.sql
\ir ../../sql/SHALOM_STUDIO_HISTORY.sql

insert into public.songs values('10000000-0000-4000-8000-000000000001','Synthetic','Original lyrics','G',0,null,'2026-11-20 12:00:00+00');
set role authenticated;
select set_config('test.actor','00000000-0000-4000-8000-000000000001',false);
insert into public.song_studio_arrangements(song_id,song_revision,arrangement) values('10000000-0000-4000-8000-000000000001','2026-11-20 12:00:00+00','{"v":1,"pattern":["D"]}');
update public.song_studio_arrangements set arrangement=arrangement;
do $check$begin
 if exists(select 1 from public.song_studio_history) then raise exception 'no-op archived';end if;
end$check$;
update public.song_studio_arrangements set arrangement='{"v":1,"pattern":["U"]}';
do $check$begin
 if (select count(*) from public.song_studio_history where reason='arrangement_replaced' and arrangement->'pattern'='["D"]'::jsonb and song_context->>'lyrics'='Original lyrics')<>1 then raise exception 'old arrangement not archived';end if;
 begin
  delete from public.song_studio_history;
  raise exception 'history delete allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.song_studio_history(song_id,song_revision,arrangement,arrangement_updated_at,reason) values(gen_random_uuid(),now(),'{"v":1}',now(),'arrangement_deleted');
  raise exception 'history insert allowed';
 exception when insufficient_privilege then null;end;
end$check$;
reset role;

begin;
update public.songs set lyrics='Rolled back',updated_at='2026-11-21 12:00:00+00';
rollback;
do $check$begin
 if exists(select 1 from public.song_studio_history where reason='song_revision_changed') then raise exception 'history escaped rollback';end if;
end$check$;
update public.songs set lyrics='Updated lyrics',updated_at='2026-11-22 12:00:00+00';
do $check$begin
 if (select count(*) from public.song_studio_history where reason='song_revision_changed' and song_context->>'lyrics'='Original lyrics' and arrangement->'pattern'='["U"]'::jsonb)<>1 then raise exception 'revision context missing';end if;
 if (select song_revision from public.song_studio_arrangements) <> '2026-11-20 12:00:00+00'::timestamptz then raise exception 'stale arrangement rebound';end if;
end$check$;
set role anon;
do $check$begin
 if exists(select 1 from public.song_studio_arrangements) then raise exception 'stale arrangement public';end if;
 begin
  perform 1 from public.song_studio_history;
  raise exception 'anonymous history read';
 exception when insufficient_privilege then null;end;
end$check$;
reset role;
set role authenticated;
select set_config('test.actor','00000000-0000-4000-8000-000000000002',false);
do $check$begin
 if exists(select 1 from public.song_studio_history) then raise exception 'unauthorized history read';end if;
end$check$;
select set_config('test.actor','00000000-0000-4000-8000-000000000001',false);
update public.song_studio_arrangements set song_revision='2026-11-22 12:00:00+00',arrangement='{"v":1,"pattern":["D","U"]}';
do $check$begin
 if not exists(select 1 from public.song_studio_history where reason='arrangement_replaced' and arrangement->'pattern'='["U"]'::jsonb and song_context is null) then raise exception 'stale revision mislabeled';end if;
end$check$;
reset role;
delete from public.songs;
do $check$begin
 if exists(select 1 from public.song_studio_arrangements) then raise exception 'cascade failed';end if;
 if not exists(select 1 from public.song_studio_history where reason='song_deleted' and song_context->>'lyrics'='Updated lyrics') then raise exception 'deleted song history missing';end if;
 if not exists(select 1 from public.song_studio_history where reason='arrangement_deleted') then raise exception 'cascade archive missing';end if;
 if has_schema_privilege('authenticated','shalom_studio_private','USAGE') or has_function_privilege('anon','shalom_studio_private.archive_arrangement()','EXECUTE') then raise exception 'trigger exposed';end if;
end$check$;
\echo 'Studio history: no-op, replacement, rollback, revision context, RLS, cascade retention and internal triggers passed.'
