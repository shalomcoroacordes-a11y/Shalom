-- Papelera restaurable de cantos, transacciones completas y control del propietario.
-- Requiere supabase-studio-arrangements.sql. Validar en una base aislada antes de desplegar.
begin;
create or replace function public.admin_delete_song_complete(p_song_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare backup jsonb;
begin
 if auth.uid() is null or not public.admin_has_permission('songs.delete') then raise exception 'Sin permiso para eliminar cantos';end if;
 -- Lock the song and any existing Studio arrangement before building the snapshot.
 perform 1 from public.songs where id=p_song_id for update;
 if not found then raise exception 'Canto no encontrado';end if;
 perform 1 from public.song_studio_arrangements where song_id=p_song_id for update;
 select jsonb_build_object(
  'song',to_jsonb(s),
  'song_artists',coalesce((select jsonb_agg(to_jsonb(r)) from public.song_artists r where r.song_id=s.id),'[]'::jsonb),
  'song_categories',coalesce((select jsonb_agg(to_jsonb(r)) from public.song_categories r where r.song_id=s.id),'[]'::jsonb),
  'album_songs',coalesce((select jsonb_agg(to_jsonb(r)) from public.album_songs r where r.song_id=s.id),'[]'::jsonb),
  'song_links',coalesce((select jsonb_agg(to_jsonb(r)) from public.song_links r where r.song_id=s.id),'[]'::jsonb),
  'song_capo_versions',coalesce((select jsonb_agg(to_jsonb(r)) from public.song_capo_versions r where r.song_id=s.id),'[]'::jsonb),
  'artist_featured_songs',coalesce((select jsonb_agg(to_jsonb(r)) from public.artist_featured_songs r where r.song_id=s.id),'[]'::jsonb),
  'song_versions',coalesce((select jsonb_agg(to_jsonb(r)) from public.song_versions r where r.version_song_id=s.id or r.parent_song_id=s.id),'[]'::jsonb),
  'song_studio_arrangements',coalesce((select jsonb_agg(to_jsonb(r)) from public.song_studio_arrangements r where r.song_id=s.id),'[]'::jsonb)
 ) into backup from public.songs s where s.id=p_song_id for update;
 if backup is null then raise exception 'Canto no encontrado';end if;
 insert into public.admin_trash(item_type,original_id,item_name,snapshot,deleted_by)
 values('song',p_song_id,backup->'song'->>'title',backup,auth.uid());
 delete from public.artist_featured_songs where song_id=p_song_id;
 delete from public.song_versions where version_song_id=p_song_id or parent_song_id=p_song_id;
 delete from public.song_capo_versions where song_id=p_song_id;
 delete from public.song_links where song_id=p_song_id;
 delete from public.song_categories where song_id=p_song_id;
 delete from public.song_artists where song_id=p_song_id;
 delete from public.album_songs where song_id=p_song_id;
 delete from public.songs where id=p_song_id;
 insert into public.admin_audit_log(actor_id,subject_id,action) values(auth.uid(),p_song_id,'song.deleted');
 return true;
end;
$$;
-- Existing Android versions retain their RPC contract; new web clients require
-- the complete endpoint explicitly and never fall back to the old deployment.
create or replace function public.admin_delete_song(p_song_id uuid)
returns boolean language sql security invoker set search_path=''
as $delegate$ select public.admin_delete_song_complete(p_song_id); $delegate$;

create or replace function public.admin_restore_song(p_trash_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare old public.admin_trash%rowtype; song jsonb; parts jsonb;
begin
 -- Owner status alone does not check access blocks in the deployed RBAC helper.
 -- Every active owner has songs.delete; this additional gate rejects blocked owners.
 if auth.uid() is null or public.admin_is_owner() is not true or public.admin_has_permission('songs.delete') is not true then raise exception 'Solo el superadministrador puede restaurar la papelera';end if;
 select * into old from public.admin_trash where id=p_trash_id for update;
 if not found or old.item_type<>'song' then raise exception 'No existe este canto en papelera';end if;
 if exists(select 1 from public.songs where id=old.original_id) then
  raise exception 'CONFLICT: este identificador de canto ya existe. No se sobreescribió';
 end if;
 song:=coalesce(old.snapshot->'song',old.snapshot);
 if (song->>'id')::uuid is distinct from old.original_id then raise exception 'El respaldo no coincide con el canto original';end if;
 insert into public.songs select * from jsonb_populate_record(null::public.songs,song);
 if old.snapshot ? 'song' then
  parts:=coalesce(old.snapshot->'song_artists','[]'::jsonb);
  if jsonb_array_length(parts)>0 then insert into public.song_artists select * from jsonb_populate_recordset(null::public.song_artists,parts);end if;
  parts:=coalesce(old.snapshot->'song_categories','[]'::jsonb);
  if jsonb_array_length(parts)>0 then insert into public.song_categories select * from jsonb_populate_recordset(null::public.song_categories,parts);end if;
  parts:=coalesce(old.snapshot->'album_songs','[]'::jsonb);
  if jsonb_array_length(parts)>0 then insert into public.album_songs select * from jsonb_populate_recordset(null::public.album_songs,parts);end if;
  parts:=coalesce(old.snapshot->'song_links','[]'::jsonb);
  if jsonb_array_length(parts)>0 then insert into public.song_links select * from jsonb_populate_recordset(null::public.song_links,parts);end if;
  parts:=coalesce(old.snapshot->'song_capo_versions','[]'::jsonb);
  if jsonb_array_length(parts)>0 then insert into public.song_capo_versions select * from jsonb_populate_recordset(null::public.song_capo_versions,parts);end if;
  parts:=coalesce(old.snapshot->'artist_featured_songs','[]'::jsonb);
  if jsonb_array_length(parts)>0 then insert into public.artist_featured_songs select * from jsonb_populate_recordset(null::public.artist_featured_songs,parts);end if;
  parts:=coalesce(old.snapshot->'song_versions','[]'::jsonb);
  if jsonb_array_length(parts)>0 then insert into public.song_versions select * from jsonb_populate_recordset(null::public.song_versions,parts);end if;
  -- Older snapshots have no Studio member. Preserve original revision; never rebind stale arrangements.
  parts:=coalesce(old.snapshot->'song_studio_arrangements','[]'::jsonb);
  if jsonb_typeof(parts) is distinct from 'array' or jsonb_array_length(parts)>1 then raise exception 'Respaldo Studio inválido';end if;
  if exists(select 1 from jsonb_populate_recordset(null::public.song_studio_arrangements,parts) r where r.song_id is distinct from old.original_id) then raise exception 'El arreglo Studio no pertenece al canto';end if;
  if jsonb_array_length(parts)>0 then
   insert into public.song_studio_arrangements(song_id,song_revision,arrangement,updated_at)
   select song_id,song_revision,arrangement,updated_at from jsonb_populate_recordset(null::public.song_studio_arrangements,parts);
  end if;
 end if;
 delete from public.admin_trash where id=p_trash_id;
 insert into public.admin_audit_log(actor_id,subject_id,action)
 values(auth.uid(),old.original_id,'song.restored');
 return true;
end;
$$;
revoke all on function public.admin_delete_song_complete(uuid) from public,anon;
revoke all on function public.admin_delete_song(uuid) from public,anon;
revoke all on function public.admin_restore_song(uuid) from public,anon;
grant execute on function public.admin_delete_song_complete(uuid) to authenticated;
grant execute on function public.admin_delete_song(uuid) to authenticated;
grant execute on function public.admin_restore_song(uuid) to authenticated;

commit;
