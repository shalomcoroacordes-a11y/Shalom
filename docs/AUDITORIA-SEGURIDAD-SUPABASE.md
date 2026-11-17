# Auditoría de privilegios SQL y funciones — SHALOM

**Fecha:** 2026-11-17. Proyecto Supabase SHALOM. Consultas de solo lectura. No se ejecutaron cambios ni operaciones sobre los registros.

## Hallazgo prioritario: privilegios excesivos en `medleys`

El catálogo `information_schema.role_table_grants` muestra para **ambos roles** `anon` y `authenticated` en la tabla `public.medleys`:

`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` y `TRIGGER`.

Las políticas RLS restringen `INSERT`, `UPDATE` y `DELETE` a administradores y `SELECT` a popurrís publicados o administradores, **pero RLS no se aplica a `TRUNCATE`**. La presencia del privilegio `TRUNCATE` en un rol de cliente representa un riesgo de borrado masivo que debe atenderse con prioridad. La posibilidad de invocarlo mediante la API REST depende también de las operaciones expuestas, por lo que no se afirma que exista un endpoint público de truncado.

**Acción recomendada, pendiente de aplicar:** revisar y revocar privilegios `TRUNCATE`, `TRIGGER` y `REFERENCES` de `anon` y `authenticated` en `public.medleys`. Después comprobar que la lectura pública de popurrís y las operaciones autorizadas del administrador siguen funcionando. Considerar asimismo restringir los privilegios DML de `anon` al `SELECT` requerido; la protección RLS no reemplaza el principio de privilegio mínimo.

**No ejecutar comandos de corrección directamente sin respaldo y prueba.** La solución debe comprobar los privilegios efectivos (incluida herencia de roles), aplicar la corrección controlada y volver a consultar los permisos.

## Comparación con otras tablas

En la consulta de `information_schema.role_table_grants`, las demás tablas públicas no mostraron `TRUNCATE` concedido a `anon` o `authenticated`. Las tablas del catálogo permiten lectura pública y operaciones administrativas condicionadas por RLS. `contact_messages` concede `INSERT` público y reserva lectura a administradores.

## Funciones del esquema público

Se observaron 12 funciones:

- **Consulta pública (EXECUTE para anon y authenticated):** `get_artist_profile_summary`, `get_categories_catalog`, `jhd_artist_discovery`, `search_albums_catalog`, `search_artist_songs_catalog`, `search_artists_catalog`, `search_songs_catalog`.
- **Funciones auxiliares con EXECUTE público:** `jhd_default_artist_type` y `set_updated_at`. Conviene revisar sus parámetros y si el acceso directo es necesario.
- **Solo authenticated:** `get_or_create_category`, `jhd_is_admin`, `jhd_save_song_bundle`.

Las 12 funciones consultadas tenían `prosecdef = false` (no están declaradas como `SECURITY DEFINER`). Esto **no demuestra** que su lógica sea segura: falta revisar los cuerpos, sus permisos internos y las rutas de ejecución.

No se encontraron vistas en el esquema `public` en la consulta a `pg_views`.

## Riesgos que siguen pendientes de verificación

1. Evaluar los permisos efectivos heredados y el acceso real a `TRUNCATE`, sin ejecutarlo.
2. Revisar las funciones públicas y sus parámetros.
3. Verificar Storage y políticas de buckets si se utilizan.
4. Probar los flujos con cuentas de visitante, usuario autenticado y administrador.
5. Revisar la advertencia de Supabase sobre protección contra contraseñas filtradas: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
6. Confirmar que los permisos de `home_recommendations` son compatibles con la lectura de usuarios autenticados.

## Principio de seguridad

**RLS y GRANT son controles complementarios.** Una política RLS restrictiva no compensa conceder operaciones que no están sujetas a RLS, como `TRUNCATE`. No confundir ausencia de advertencias automáticas con ausencia de riesgos.

## Corrección aplicada — 17 de noviembre de 2026

Con autorización explícita del responsable de SHALOM, se ejecutó en producción, dentro de una transacción:

```sql
begin;
revoke all privileges on table public.medleys from anon, authenticated;
grant select on table public.medleys to anon;
grant select, insert, update, delete on table public.medleys to authenticated;
commit;
```

**Verificación posterior con `has_table_privilege`:**

| Privilegio | anon | authenticated |
| --- | --- | --- |
| SELECT | sí | sí |
| INSERT | no | sí |
| UPDATE | no | sí |
| DELETE | no | sí |
| TRUNCATE | no | no |
| REFERENCES | no | no |
| TRIGGER | no | no |

La tabla continúa con RLS habilitado. Las políticas existentes de escritura siguen exigiendo `jhd_is_admin()`; los visitantes solo pueden leer registros publicados. El asesor de seguridad de Supabase sigue señalando únicamente la advertencia de protección de contraseñas filtradas deshabilitada.

**Alcance:** se modificaron únicamente privilegios SQL de `public.medleys`; no se modificaron ni borraron registros, no se alteraron políticas RLS ni otras tablas. No se ejecutaron pruebas completas de la interfaz web/Android ni pruebas con cuentas reales, que permanecen pendientes.
