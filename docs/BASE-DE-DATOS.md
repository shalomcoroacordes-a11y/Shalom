# Base de datos de SHALOM — mapa inicial

**Estado:** documentación basada en archivos del repositorio, **no** auditoría confirmada del esquema desplegado en Supabase. No ejecutar los SQL históricos como si fueran migraciones ordenadas.

## Conexión y flujo

- La web usa `Supabase.js` para comunicarse con Supabase.
- Android usa `mobile/src/config.js` y `mobile/src/sync.js` para descargar registros públicos.
- `mobile/src/database.js` almacena los registros en una tabla SQLite local `catalog_records` con columnas `table_name`, `record_id` y `payload` (JSON); `metadata` guarda `last_sync`.
- La sincronización móvil consulta las tablas en páginas de 250 filas y conserva una copia de respaldo local.

## Tablas que la app intenta sincronizar

La lista declarada en `mobile/src/config.js` contiene:

| Tabla | Uso principal |
| --- | --- |
| `songs` | Cantos |
| `artists` | Artistas y ministerios |
| `categories` | Categorías |
| `albums` | Álbumes |
| `song_artists` | Relaciones canto-artista |
| `song_categories` | Relaciones canto-categoría |
| `album_songs` | Relaciones álbum-canto |
| `song_links` | Enlaces de cantos |
| `song_capo_versions` | Versiones con capo |
| `medleys` | Popurrís |
| `repertoires` | Repertorios |

**Importante:** esta lista muestra lo que espera la app, no confirma por sí sola que todas las tablas y políticas actuales de producción coincidan.

## Tablas de repertorios y popurrís

Los archivos `supabase-repertoires.sql` y `supabase-medleys.sql` definen, respectivamente:

- `repertoires`: `id`, `title`, `kind` (`misa` o `ensayo`), `event_date`, `location`, `notes`, `items` (JSON), `is_published` y fechas de creación/actualización. Límite SQL de 45 elementos por repertorio.
- `medleys`: `id`, `title`, `slug`, `song_type`, `base_tone`, `description`, `parts` (JSON), `is_published` y fechas. Límite SQL de 30 partes por popurrí.

Ambos archivos habilitan RLS, definen lectura pública para registros publicados y permisos de administración condicionados a `public.jhd_is_admin()`.

## Atención: permisos históricos

`supabase-rls.sql` contiene una versión histórica de `public.jhd_is_admin()` basada en comparar el correo del JWT con una dirección concreta. **No se ha verificado que esa función siga activa en producción.**

Antes de modificar permisos, verificar en el proyecto real:
1. La definición vigente de `jhd_is_admin()` y sus dependencias.
2. La forma actual de asignar y revocar administradores.
3. Las políticas RLS efectivas de cada tabla, incluidos borradores.
4. Los permisos `GRANT` y exposición de tablas mediante la API.
5. Si las funciones `SECURITY DEFINER` están restringidas adecuadamente.

No reejecutar `supabase-rls.sql` a ciegas: podría **reemplazar** una definición actual que admita varios administradores por una versión antigua que solo contemple una cuenta. No se han aplicado cambios de permisos ni de esquema.

## Qué falta para completar el manual

- Consultar el esquema desplegado y registrar las columnas y claves reales.
- Documentar relaciones, índices, triggers y funciones.
- Confirmar qué archivos SQL históricos se ejecutaron y en qué orden.
- Elaborar una migración base **verificada**, sin recrear datos de producción.
- Preparar procedimiento de respaldo y restauración comprobado.
- Revisar políticas de autorización de forma segura, sin exponer datos privados.

## Regla para futuros programadores

**No ejecutar SQL histórico por el nombre del archivo.** Primero contrastar con el estado real, respaldar, preparar migración revisada y probarla en entorno de desarrollo.
