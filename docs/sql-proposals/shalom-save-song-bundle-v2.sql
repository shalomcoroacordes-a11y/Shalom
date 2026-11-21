-- PROPUESTA SHALOM · NO EJECUTAR SIN RESPALDO Y PRUEBAS EN STAGING.
-- Proyecto previsto: ehpvsasyzlrlypjjpzuk. NO usar en Juntos Hacia Dios.
-- Contrato nuevo: la función jhd_save_song_bundle original permanece intacta.
-- Cada invocación es una única transacción PostgreSQL; una excepción revierte
-- la canción y todas sus relaciones. SECURITY INVOKER respeta las RLS existentes.
-- Antes del despliegue: validar en una base de pruebas, revisar GRANT, tomar
-- respaldo verificable, y ejecutar casos de admin/no admin y fallos de FK.
begin;

create or replace function public.shalom_save_song_bundle_v2(
  p_song_id uuid,
  p_song jsonb,
  p_artists jsonb default '[]'::jsonb,
  p_categories jsonb default '[]'::jsonb,
  p_album_id uuid default null,
  p_links jsonb default '[]'::jsonb,
  p_capos jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $shalom_bundle$
declare
  v_song_id uuid;
  v_primary_artist uuid;
  v_first_category uuid;
  v_item record;
begin
  if not public.jhd_is_admin() then
    raise exception 'Acceso administrativo requerido' using errcode = '42501';
  end if;
  if pg_catalog.jsonb_typeof(p_song) is distinct from 'object' then
    raise exception 'Datos de canción inválidos' using errcode = '22023';
  end if;
  if nullif(pg_catalog.btrim(p_song->>'title'), '') is null
     or nullif(pg_catalog.btrim(p_song->>'slug'), '') is null
     or nullif(pg_catalog.btrim(p_song->>'tone'), '') is null then
    raise exception 'Título, slug y tono son obligatorios' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_typeof(p_artists) is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_artists) = 0
     or nullif(p_artists->0->>'artist_id','') is null then
    raise exception 'Debe existir un artista principal' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_typeof(p_categories) is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_links) is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_capos) is distinct from 'array' then
    raise exception 'Las relaciones deben enviarse como arreglos' using errcode = '22023';
  end if;
  v_primary_artist := (p_artists->0->>'artist_id')::uuid;
  v_first_category := nullif(p_categories->>0,'')::uuid;

  if p_song_id is null then
    insert into public.songs
      (title,slug,song_type,tone,lyrics,difficulty,capo_position,capo_key,artist_id,category_id)
    values (
      pg_catalog.btrim(p_song->>'title'),
      pg_catalog.btrim(p_song->>'slug'),
      coalesce(nullif(p_song->>'song_type',''),'catolico'),
      pg_catalog.btrim(p_song->>'tone'),
      coalesce(p_song->>'lyrics',''),
      nullif(pg_catalog.btrim(p_song->>'difficulty'),''),
      greatest(coalesce((p_song->>'capo_position')::integer,0),0),
      nullif(pg_catalog.btrim(p_song->>'capo_key'),''),
      v_primary_artist, v_first_category
    ) returning id into v_song_id;
  else
    update public.songs
       set title=pg_catalog.btrim(p_song->>'title'),
           slug=pg_catalog.btrim(p_song->>'slug'),
           song_type=coalesce(nullif(p_song->>'song_type',''),'catolico'),
           tone=pg_catalog.btrim(p_song->>'tone'),
           lyrics=coalesce(p_song->>'lyrics',''),
           difficulty=nullif(pg_catalog.btrim(p_song->>'difficulty'),''),
           capo_position=greatest(coalesce((p_song->>'capo_position')::integer,0),0),
           capo_key=nullif(pg_catalog.btrim(p_song->>'capo_key'),''),
           artist_id=v_primary_artist,
           category_id=v_first_category,
           updated_at=pg_catalog.now()
     where id=p_song_id
     returning id into v_song_id;
    if v_song_id is null then
      raise exception 'Canción no encontrada' using errcode = 'P0002';
    end if;
  end if;

  delete from public.song_artists where song_id=v_song_id;
  delete from public.song_categories where song_id=v_song_id;
  delete from public.album_songs where song_id=v_song_id;
  delete from public.song_links where song_id=v_song_id;
  delete from public.song_capo_versions where song_id=v_song_id;

  for v_item in select value, ordinality as position
      from pg_catalog.jsonb_array_elements(p_artists) with ordinality loop
    insert into public.song_artists (song_id,artist_id,role,sort_order)
    values (
      v_song_id,
      (v_item.value->>'artist_id')::uuid,
      case when v_item.position=1 then 'principal' else 'colaborador' end,
      v_item.position-1
    );
  end loop;

  insert into public.song_categories (song_id,category_id)
  select v_song_id, distinct_categories.category_id
  from (
    select distinct (value#>>'{}')::uuid as category_id
    from pg_catalog.jsonb_array_elements(p_categories)
  ) as distinct_categories;

  if p_album_id is not null then
    insert into public.album_songs (song_id,album_id,sort_order)
    values (v_song_id,p_album_id,0);
  end if;
  for v_item in select value, ordinality as position
      from pg_catalog.jsonb_array_elements(p_links) with ordinality loop
    if nullif(pg_catalog.btrim(v_item.value->>'url'),'') is not null then
      insert into public.song_links
        (song_id,title,link_type,platform,url,sort_order)
      values (
        v_song_id,
        coalesce(nullif(pg_catalog.btrim(v_item.value->>'title'),''),'Enlace'),
        coalesce(nullif(pg_catalog.btrim(v_item.value->>'link_type'),''),'Tutorial'),
        nullif(pg_catalog.btrim(v_item.value->>'platform'),''),
        pg_catalog.btrim(v_item.value->>'url'),v_item.position-1
      );
    end if;
  end loop;
  for v_item in select value, ordinality as position
      from pg_catalog.jsonb_array_elements(p_capos) with ordinality loop
    if coalesce((v_item.value->>'capo_position')::integer,0)>0
       and nullif(pg_catalog.btrim(v_item.value->>'capo_key'),'') is not null then
      insert into public.song_capo_versions
        (song_id,label,capo_position,capo_key,sort_order)
      values (
        v_song_id,
        coalesce(nullif(pg_catalog.btrim(v_item.value->>'label'),''),
                 'Capo '||(v_item.value->>'capo_position')),
        (v_item.value->>'capo_position')::integer,
        pg_catalog.btrim(v_item.value->>'capo_key'),
        v_item.position-1
      );
    end if;
  end loop;
  return v_song_id;
end;
$shalom_bundle$;

-- Restringir invocación explícita, además del guard de administrador y RLS.
revoke all on function public.shalom_save_song_bundle_v2(
  uuid,jsonb,jsonb,jsonb,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.shalom_save_song_bundle_v2(
  uuid,jsonb,jsonb,jsonb,uuid,jsonb,jsonb) to authenticated;
commit;
