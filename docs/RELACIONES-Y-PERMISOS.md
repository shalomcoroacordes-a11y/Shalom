# Relaciones y políticas verificadas en Supabase SHALOM

**Fecha:** 2026-11-17. Consulta de solo lectura del proyecto de SHALOM. Este documento refleja el esquema observado, no una migración ejecutable.

## Relaciones con claves foráneas

| Tabla | Columna | Referencia |
| --- | --- | --- |
| `songs` | `artist_id` | `artists.id` |
| `songs` | `category_id` | `categories.id` |
| `albums` | `artist_id` | `artists.id` |
| `categories` | `parent_id` | `categories.id` |
| `song_artists` | `song_id`, `artist_id` | `songs.id`, `artists.id` |
| `song_categories` | `song_id`, `category_id` | `songs.id`, `categories.id` |
| `album_songs` | `album_id`, `song_id` | `albums.id`, `songs.id` |
| `artist_featured_songs` | `artist_id`, `song_id` | `artists.id`, `songs.id` |
| `song_links` | `song_id` | `songs.id` |
| `song_capo_versions` | `song_id` | `songs.id` |
| `song_versions` | `parent_song_id`, `version_song_id` | `songs.id`, `songs.id` |

Las tablas `medleys` y `repertoires` guardan sus partes/elementos en JSONB; no aparecieron claves foráneas declaradas para esas referencias. **Esto no implica que carezcan de relaciones lógicas**, sino que la base de datos no las impone mediante FK.

## Columnas relevantes verificadas

- `songs`: `id`, `title`, `slug`, `artist_id`, `category_id`, `tone`, `difficulty`, `lyrics`, `tutorial_guitar`, `tutorial_piano`, `song_type`, `capo_position`, `capo_key`, `created_at`, `updated_at`.
- `song_versions`: `id`, `parent_song_id`, `version_song_id`, `label`, `notes`, `sort_order`, `created_at`, `updated_at`.
- `jhd_admin_users`: `user_id` (UUID).
- `medleys`: `id`, `title`, `slug`, `song_type`, `base_tone`, `description`, `parts`, `is_published`, `created_at`, `updated_at`.
- `repertoires`: `id`, `title`, `kind`, `event_date`, `location`, `notes`, `items`, `is_published`, `created_at`, `updated_at`.

## Políticas RLS verificadas: resumen

**Todas las 19 tablas de `public` tienen RLS activado y al menos una política.** Según las políticas consultadas:

- **Catálogo público**: `songs`, `artists`, `categories`, `albums`, `song_artists`, `song_categories`, `album_songs`, `song_links`, `song_capo_versions`, `song_versions` y `artist_featured_songs` permiten `SELECT` a `anon` y `authenticated`; inserción, edición y borrado están condicionados a `jhd_is_admin()`.
- **Popurrís y repertorios**: lectura pública solo cuando `is_published` es verdadero; administradores autorizados pueden consultar borradores y escribir.
- **`contact_messages`**: permite `INSERT` público con validaciones de longitud y estado inicial; lectura, edición y borrado se reservan a administradores.
- **`donation_settings`**: lectura pública de configuraciones activas y lectura administrativa completa.
- **`home_recommendations`**: lectura `anon` y administración `authenticated` condicionada a `jhd_is_admin()`. Revisar específicamente el comportamiento de lectura para sesiones autenticadas no administradoras.
- **`site_content`**: lectura pública; administradores pueden insertar y actualizar. No se observó política de borrado.
- **`admin_trash`**: política `ALL` solo para administradores autenticados.
- **`jhd_admin_users`**: política `SELECT` para que cada usuario autenticado consulte únicamente su propio `user_id`; no se observó política de escritura pública.

## Hallazgos y límites

1. Las políticas están definidas en producción; **no se hicieron pruebas impersonando usuarios** para demostrar resultados efectivos de cada rol.
2. La autorización vigente usa `public.jhd_is_admin()` basada en pertenencia a `jhd_admin_users`, no en un correo fijo.
3. Se deben revisar también los permisos SQL `GRANT`, funciones, vistas, Storage y API, pues RLS no reemplaza esos controles.
4. Los SQL antiguos de la raíz no deben reejecutarse indiscriminadamente.
5. El asesor de seguridad señaló protección de contraseñas filtradas deshabilitada; ver https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

**No se consultaron registros de usuarios ni se modificaron tablas, políticas o datos.**
