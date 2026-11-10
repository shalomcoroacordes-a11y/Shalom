-- SHALOM | Paso 1: Funciones de escritura y disparadores del administrador
-- Solo para Supabase de SHALOM (ehpvsasyzlrlypjjpzuk).
-- No ejecutar en el proyecto Juntos Hacia Dios.
-- No copia ni elimina cantos, artistas ni usuarios.
-- Si aparece un error, detente y comparte el mensaje antes de seguir.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_or_create_category(p_name text, p_slug text, p_description text, p_song_type text, p_parent_id uuid, p_sort_order integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
            declare
              existing_id uuid;
                new_id uuid;
                begin
                  select id into existing_id
                    from public.categories
                      where slug = p_slug
                        and (
                            (parent_id is null and p_parent_id is null)
                                or parent_id = p_parent_id
                                  )
                                    limit 1;

                                      if existing_id is not null then
                                          update public.categories
                                              set
                                                    song_type = coalesce(nullif(song_type, ''), p_song_type),
                                                          sort_order = case when sort_order = 0 then p_sort_order else sort_order end,
                                                                description = case
                                                                        when coalesce(description, '') = '' then p_description
                                                                                else description
                                                                                      end
                                                                                          where id = existing_id;

                                                                                              return existing_id;
                                                                                                end if;

                                                                                                  insert into public.categories (
                                                                                                      name,
                                                                                                          slug,
                                                                                                              description,
                                                                                                                  song_type,
                                                                                                                      parent_id,
                                                                                                                          sort_order
                                                                                                                            )
                                                                                                                              values (
                                                                                                                                  p_name,
                                                                                                                                      p_slug,
                                                                                                                                          p_description,
                                                                                                                                              p_song_type,
                                                                                                                                                  p_parent_id,
                                                                                                                                                      p_sort_order
                                                                                                                                                        )
                                                                                                                                                          returning id into new_id;

                                                                                                                                                            return new_id;
                                                                                                                                                            end;
                                                                                                                                                            $function$;
CREATE OR REPLACE FUNCTION public.jhd_save_song_bundle(p_song_id uuid, p_song jsonb, p_artists jsonb DEFAULT '[]'::jsonb, p_category_id uuid DEFAULT NULL::uuid, p_album_id uuid DEFAULT NULL::uuid, p_links jsonb DEFAULT '[]'::jsonb, p_capos jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_song_id uuid;
  v_artist jsonb;
  v_link jsonb;
  v_capo jsonb;
  v_index integer := 0;
begin
  if not public.jhd_is_admin() then
    raise exception 'Acceso administrativo requerido' using errcode = '42501';
  end if;

  if nullif(btrim(p_song->>'title'), '') is null then
    raise exception 'El título es obligatorio' using errcode = '22023';
  end if;

  if nullif(btrim(p_song->>'slug'), '') is null then
    raise exception 'El slug es obligatorio' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_artists, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_artists, '[]'::jsonb)) = 0 then
    raise exception 'Selecciona al menos un artista' using errcode = '22023';
  end if;

  if p_song_id is null then
    insert into public.songs (
      title, slug, song_type, tone, lyrics, difficulty, capo_position, capo_key, artist_id, category_id
    ) values (
      btrim(p_song->>'title'),
      btrim(p_song->>'slug'),
      coalesce(nullif(btrim(p_song->>'song_type'), ''), 'catolico'),
      nullif(btrim(p_song->>'tone'), ''),
      coalesce(p_song->>'lyrics', ''),
      nullif(btrim(p_song->>'difficulty'), ''),
      greatest(coalesce((p_song->>'capo_position')::integer, 0), 0),
      nullif(btrim(p_song->>'capo_key'), ''),
      nullif(p_artists->0->>'artist_id', '')::uuid,
      p_category_id
    ) returning id into v_song_id;
  else
    update public.songs
       set title = btrim(p_song->>'title'),
           slug = btrim(p_song->>'slug'),
           song_type = coalesce(nullif(btrim(p_song->>'song_type'), ''), 'catolico'),
           tone = nullif(btrim(p_song->>'tone'), ''),
           lyrics = coalesce(p_song->>'lyrics', ''),
           difficulty = nullif(btrim(p_song->>'difficulty'), ''),
           capo_position = greatest(coalesce((p_song->>'capo_position')::integer, 0), 0),
           capo_key = nullif(btrim(p_song->>'capo_key'), ''),
           artist_id = nullif(p_artists->0->>'artist_id', '')::uuid,
           category_id = p_category_id,
           updated_at = now()
     where id = p_song_id
     returning id into v_song_id;

    if v_song_id is null then
      raise exception 'Canción no encontrada' using errcode = 'P0002';
    end if;
  end if;

  delete from public.song_artists where song_id = v_song_id;
  delete from public.song_categories where song_id = v_song_id;
  delete from public.album_songs where song_id = v_song_id;
  delete from public.song_links where song_id = v_song_id;
  delete from public.song_capo_versions where song_id = v_song_id;

  v_index := 0;
  for v_artist in select value from jsonb_array_elements(coalesce(p_artists, '[]'::jsonb))
  loop
    insert into public.song_artists (song_id, artist_id, role, sort_order)
    values (
      v_song_id,
      (v_artist->>'artist_id')::uuid,
      case when v_index = 0 then 'principal' else 'colaborador' end,
      v_index
    );
    v_index := v_index + 1;
  end loop;

  if p_category_id is not null then
    insert into public.song_categories (song_id, category_id)
    values (v_song_id, p_category_id);
  end if;

  if p_album_id is not null then
    insert into public.album_songs (song_id, album_id, sort_order)
    values (v_song_id, p_album_id, 0);
  end if;

  v_index := 0;
  for v_link in select value from jsonb_array_elements(coalesce(p_links, '[]'::jsonb))
  loop
    if nullif(btrim(v_link->>'url'), '') is not null then
      insert into public.song_links (song_id, title, link_type, platform, url, sort_order)
      values (
        v_song_id,
        coalesce(nullif(btrim(v_link->>'title'), ''), 'Enlace'),
        coalesce(nullif(btrim(v_link->>'link_type'), ''), 'Tutorial'),
        nullif(btrim(v_link->>'platform'), ''),
        btrim(v_link->>'url'),
        v_index
      );
      v_index := v_index + 1;
    end if;
  end loop;

  v_index := 0;
  for v_capo in select value from jsonb_array_elements(coalesce(p_capos, '[]'::jsonb))
  loop
    if coalesce((v_capo->>'capo_position')::integer, 0) > 0 and nullif(btrim(v_capo->>'capo_key'), '') is not null then
      insert into public.song_capo_versions (song_id, label, capo_position, capo_key, sort_order)
      values (
        v_song_id,
        coalesce(nullif(btrim(v_capo->>'label'), ''), 'Capo ' || (v_capo->>'capo_position')),
        (v_capo->>'capo_position')::integer,
        btrim(v_capo->>'capo_key'),
        v_index
      );
      v_index := v_index + 1;
    end if;
  end loop;

  return v_song_id;
end;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_or_create_category(p_name text, p_slug text, p_description text, p_song_type text, p_parent_id uuid, p_sort_order integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_category(p_name text, p_slug text, p_description text, p_song_type text, p_parent_id uuid, p_sort_order integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.jhd_save_song_bundle(p_song_id uuid, p_song jsonb, p_artists jsonb, p_category_id uuid, p_album_id uuid, p_links jsonb, p_capos jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jhd_save_song_bundle(p_song_id uuid, p_song jsonb, p_artists jsonb, p_category_id uuid, p_album_id uuid, p_links jsonb, p_capos jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.jhd_is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jhd_is_admin() TO authenticated;
CREATE OR REPLACE TRIGGER set_albums_updated_at BEFORE UPDATE ON public.albums FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER jhd_default_artist_type_before_write BEFORE INSERT OR UPDATE OF artist_type ON public.artists FOR EACH ROW EXECUTE FUNCTION public.jhd_default_artist_type();
CREATE OR REPLACE TRIGGER set_artists_updated_at BEFORE UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER set_donation_settings_updated_at BEFORE UPDATE ON public.donation_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER set_song_capo_versions_updated_at BEFORE UPDATE ON public.song_capo_versions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER set_songs_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
COMMIT;
