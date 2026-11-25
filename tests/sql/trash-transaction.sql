\set ON_ERROR_STOP on
-- Disposable database only. Never point this fixture at a deployed project.
create schema auth;
create role anon nologin;
create role authenticated nologin;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('test.actor',true),'')::uuid
$$;
create function public.admin_has_permission(text) returns boolean language sql stable as $$
 select coalesce(current_setting('test.can_delete',true)='yes',false)
$$;
create function public.admin_is_owner() returns boolean language sql stable as $$
 select coalesce(current_setting('test.owner',true)='yes',false)
$$;
create table public.songs(id uuid primary key,title text not null,updated_at timestamptz not null);
create table public.song_artists(id uuid primary key,song_id uuid not null references public.songs on delete cascade);
create table public.song_categories(id uuid primary key,song_id uuid not null references public.songs on delete cascade);
create table public.album_songs(id uuid primary key,song_id uuid not null references public.songs on delete cascade);
create table public.song_links(id uuid primary key,song_id uuid not null references public.songs on delete cascade);
create table public.song_capo_versions(id uuid primary key,song_id uuid not null references public.songs on delete cascade);
create table public.artist_featured_songs(artist_id uuid not null,song_id uuid not null references public.songs on delete cascade,primary key(artist_id,song_id));
create table public.song_versions(id uuid primary key,parent_song_id uuid not null references public.songs on delete cascade,version_song_id uuid not null references public.songs on delete cascade);
create table public.song_studio_arrangements(song_id uuid primary key references public.songs on delete cascade,song_revision timestamptz not null,arrangement jsonb not null check(jsonb_typeof(arrangement)='object'),updated_at timestamptz not null default now());
create table public.admin_trash(id uuid primary key default gen_random_uuid(),item_type text not null,original_id uuid not null,item_name text not null,snapshot jsonb not null,deleted_by uuid);
create table public.admin_audit_log(actor_id uuid,subject_id uuid,action text);
\ir ../../sql/SHALOM_ADMIN_SONG_TRASH_20261121.sql

begin;
select set_config('test.actor','00000000-0000-4000-8000-000000000001',true);
select set_config('test.can_delete','yes',true);
select set_config('test.owner','yes',true);
do $test$
declare
 target_id constant uuid:='10000000-0000-4000-8000-000000000001';
 other_id constant uuid:='10000000-0000-4000-8000-000000000002';
 trash_id uuid;
 rev constant timestamptz:='2026-11-20 12:00:00+00';
 original jsonb:='{"v":1,"pattern":["D","U"],"sections":[{"id":"verse"}]}'::jsonb;
 saved jsonb;
begin
 insert into public.songs values(target_id,'Synthetic song',rev),(other_id,'Synthetic version',rev);
 insert into public.song_studio_arrangements(song_id,song_revision,arrangement) values(target_id,rev,original);
 insert into public.song_versions values(gen_random_uuid(),target_id,other_id);
 -- No authenticated identity: delete must not run, even if role helper says yes.
 perform set_config('test.actor','',true);
 begin
  perform public.admin_delete_song(target_id);
  raise exception 'expected denial';
 exception when others then
  if sqlerrm not like 'Sin permiso%' then raise;end if;
 end;
 if not exists(select 1 from public.songs where id=target_id) then raise exception 'unauthorized delete';end if;
 perform set_config('test.actor','00000000-0000-4000-8000-000000000001',true);
 if public.admin_delete_song(target_id) is distinct from true then raise exception 'delete not confirmed';end if;
 select id,snapshot into trash_id,saved from public.admin_trash where original_id=target_id;
 if trash_id is null or saved->'song_studio_arrangements'->0->'arrangement' is distinct from original then raise exception 'Studio not captured';end if;
 if exists(select 1 from public.songs where id=target_id) or exists(select 1 from public.song_studio_arrangements a where a.song_id=target_id) then raise exception 'cascade not completed';end if;
 -- Denied restoration leaves the backup untouched.
 perform set_config('test.owner','no',true);
 begin
  perform public.admin_restore_song(trash_id);
  raise exception 'expected denial';
 exception when others then
  if sqlerrm not like 'Solo el superadministrador%' then raise;end if;
 end;
 perform set_config('test.owner','yes',true);
 if not exists(select 1 from public.admin_trash where id=trash_id) then raise exception 'backup lost on denial';end if;
 -- Invalid arrangement identity forces rollback after song and versions were inserted.
 update public.admin_trash set snapshot=jsonb_set(saved,'{song_studio_arrangements,0,song_id}',to_jsonb(other_id)) where id=trash_id;
 begin
  perform public.admin_restore_song(trash_id);
  raise exception 'expected identity rejection';
 exception when others then
  if sqlerrm not like 'El arreglo Studio no pertenece%' then raise;end if;
 end;
 if exists(select 1 from public.songs where id=target_id) or exists(select 1 from public.song_versions v where v.parent_song_id=target_id) then raise exception 'partial restore escaped rollback';end if;
 if not exists(select 1 from public.admin_trash where id=trash_id) then raise exception 'backup lost after rollback';end if;
 update public.admin_trash set snapshot=saved where id=trash_id;
 if public.admin_restore_song(trash_id) is distinct from true then raise exception 'restore not confirmed';end if;
 if not exists(select 1 from public.song_studio_arrangements a where a.song_id=target_id and a.song_revision=rev and a.arrangement=original) then raise exception 'Studio roundtrip mismatch';end if;
 if not exists(select 1 from public.song_versions v where v.parent_song_id=target_id and v.version_song_id=other_id) then raise exception 'version missing';end if;
 if exists(select 1 from public.admin_trash where id=trash_id) then raise exception 'restored backup not consumed';end if;
 -- An older native snapshot can omit Studio.
 perform public.admin_delete_song(target_id);
 select id into trash_id from public.admin_trash where original_id=target_id;
 update public.admin_trash set snapshot=snapshot-'song_studio_arrangements' where id=trash_id;
 if public.admin_restore_song(trash_id) is distinct from true then raise exception 'old snapshot not restored';end if;
 if exists(select 1 from public.song_studio_arrangements a where a.song_id=target_id) then raise exception 'invented missing Studio';end if;
end;
$test$;
rollback;
\echo 'Atomic song trash: Studio roundtrip, alternative versions, permission gates, rollback and legacy native snapshot passed.'
