-- Publicación atómica de artista y sus 3 canciones destacadas.
create or replace function public.admin_publish_artist(
 p_artist jsonb,p_featured jsonb default '[]'::jsonb,p_expected timestamptz default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 artist_id uuid:=(p_artist->>'id')::uuid; previous timestamptz; item text; pos integer:=0;
begin
 if not public.admin_has_permission('artists.publish') then raise exception 'No tienes permiso para publicar artistas';end if;
 if artist_id is null or length(btrim(coalesce(p_artist->>'name','')))=0
    or length(btrim(coalesce(p_artist->>'slug','')))=0 then raise exception 'Datos incompletos';end if;
 if jsonb_typeof(p_featured) is distinct from 'array' or jsonb_array_length(p_featured)>3
 then raise exception 'Máximo tres canciones destacadas';end if;
 select updated_at into previous from public.artists where id=artist_id for update;
 if found and (p_expected is null or previous is distinct from p_expected) then
  raise exception 'CONFLICT: alguien editó el artista';
 end if;
 if not found and p_expected is not null then raise exception 'CONFLICT: artista eliminado';end if;
 insert into public.artists(
  id,name,slug,artist_type,description,bio,avatar_url,cover_url,
  youtube_url,spotify_url,instagram_url,facebook_url,updated_at)
 values(
  artist_id,btrim(p_artist->>'name'),p_artist->>'slug',coalesce(p_artist->>'artist_type',''),
  nullif(p_artist->>'description',''),nullif(p_artist->>'bio',''),
  nullif(p_artist->>'avatar_url',''),nullif(p_artist->>'cover_url',''),
  nullif(p_artist->>'youtube_url',''),nullif(p_artist->>'spotify_url',''),
  nullif(p_artist->>'instagram_url',''),nullif(p_artist->>'facebook_url',''),now())
 on conflict(id) do update set name=excluded.name,slug=excluded.slug,artist_type=excluded.artist_type,
  description=excluded.description,bio=excluded.bio,avatar_url=excluded.avatar_url,cover_url=excluded.cover_url,
  youtube_url=excluded.youtube_url,spotify_url=excluded.spotify_url,
  instagram_url=excluded.instagram_url,facebook_url=excluded.facebook_url,updated_at=now();
 delete from public.artist_featured_songs where artist_id=artist_id;
 for item in select value from jsonb_array_elements_text(p_featured)
 loop
  insert into public.artist_featured_songs(artist_id,song_id,sort_order)
  values(artist_id,item::uuid,pos);
  pos:=pos+1;
 end loop;
 insert into public.admin_audit_log(actor_id,subject_id,action,details)
 values(auth.uid(),artist_id,'artist.published',jsonb_build_object('name',p_artist->>'name'));
 return jsonb_build_object('id',artist_id,'updated_at',(select updated_at from public.artists where id=artist_id));
end;
$$;
revoke all on function public.admin_publish_artist(jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.admin_publish_artist(jsonb,jsonb,timestamptz) to authenticated;
grant select,insert,update,delete on public.artist_featured_songs to authenticated;
create policy "SHALOM Admin roles manage artist featured songs" on public.artist_featured_songs
 for all to authenticated using(public.admin_has_permission('artists.publish'))
 with check(public.admin_has_permission('artists.publish'));
