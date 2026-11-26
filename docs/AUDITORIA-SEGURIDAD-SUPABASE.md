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


## Reauditoría de producción — 25 de noviembre de 2026

Alcance: consultas de catálogos de PostgreSQL, conteos agregados y asesores de Supabase. Sin escrituras, cambios de configuración ni lectura de letras, correos o identificadores de usuarios.

### Controles verificados
- 28/28 tablas públicas con RLS habilitado; cero vistas públicas.
- Ninguna tabla pública concede UPDATE o DELETE a anon; INSERT anónimo solo en contact_messages, sujeto a sus políticas de solicitud.
- 15 funciones SECURITY DEFINER con EXECUTE revocado a anon y search_path vacío. Las 15 siguen disponibles para authenticated: revisar autorización interna por operación, no revocar indiscriminadamente.
- Medleys: no aparece en el inventario de privilegios efectivos TRUNCATE, TRIGGER y REFERENCES para anon/authenticated; se conserva la corrección del 17 de noviembre.
- Las claves primarias de las tablas de permisos coinciden con las claves compuestas configuradas en admin-mobile/src/api.js.
- Inventario agregado: 36 cantos, 2 acompañamientos Studio, ninguno con revisión desactualizada al consultar; papelera de cantos vacía. Esto no es un respaldo.

### Hallazgos y prioridades
1. **Alta — privilegios efectivos excesivos de authenticated:** TRUNCATE, TRIGGER y REFERENCES en admin_access_blocks, admin_audit_log, admin_invites, admin_permission_overrides, admin_profiles, admin_role_permissions, admin_roles y admin_user_roles. No se observan esos permisos en anon. RLS no protege TRUNCATE; no se afirma que exista un endpoint REST para invocarlo. Preparar revocación de privilegios mínimos, verificar herencia y probar roles autorizados/denegados en base aislada. No ejecutar directamente en producción.
2. **Alta — autorización heredada:** jhd_is_admin() comprueba pertenencia a jhd_admin_users sin consultar admin_access_blocks; hay una membresía heredada. admin_is_owner() usa esa misma tabla y admin_has_permission() sí comprueba bloqueos. Existen políticas de escritura heredadas en canciones y relaciones, políticas adicionales en mensajes, versiones y papelera, además de políticas RBAC. Las políticas permisivas se combinan mediante OR; revisar la posibilidad de que una ruta heredada ignore restricciones nuevas. No borrar membresías ni políticas sin comprobar clientes web y nativos y preservar acceso del propietario legítimo. Probar cuenta anónima, autenticada no autorizada, rol limitado, permiso denegado, propietario y bloqueo.
3. **Alta — recuperación Studio:** admin_delete_song y admin_restore_song desplegadas conservan song_versions, pero no incluyen song_studio_arrangements. La FK en cascada puede eliminar el acompañamiento al borrar el canto. La solución transaccional en sql/SHALOM_ADMIN_SONG_TRASH_20261121.sql ya tiene pruebas aisladas; verificar diferencias con producción, respaldo y restauración antes de desplegar. No intentar borrar un canto real para probar.
4. **Media — revisiones de cantos:** admin_publish_song comprueba p_expected bajo bloqueo FOR UPDATE. Studio exige coincidencia de song_revision con updated_at en RLS. Revisar la conservación del acompañamiento al modificar una canción y restaurar revisiones; no asumir que todas las rutas de Admin usan el mismo RPC.
5. **Media — asesor de seguridad:** 15 advertencias de RPC SECURITY DEFINER ejecutables por authenticated; revisar autorización de cada función. Protección contra contraseñas filtradas deshabilitada; confirmar disponibilidad en plan y activar solo mediante cambio autorizado.
6. **Rendimiento:** 6 FK sin índice de cobertura, 5 políticas con reevaluación de auth por fila, 23 índices sin uso observado y 64 avisos de políticas permisivas múltiples. Priorizar equivalencia de permisos y planes de consulta. No eliminar índices basándose en un contador aislado, ni simplificar políticas sin pruebas por rol.

### Consultas reproducibles de solo lectura

```sql
select c.relname, c.relrowsecurity,
       has_table_privilege('anon',c.oid,'UPDATE') as anon_update,
       has_table_privilege('anon',c.oid,'DELETE') as anon_delete
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
order by c.relname;

select c.relname, r.role_name,
       has_table_privilege(r.role_name,c.oid,'TRUNCATE') as can_truncate,
       has_table_privilege(r.role_name,c.oid,'TRIGGER') as can_trigger,
       has_table_privilege(r.role_name,c.oid,'REFERENCES') as can_reference
from pg_class c join pg_namespace n on n.oid=c.relnamespace
cross join (values ('anon'),('authenticated')) r(role_name)
where n.nspname='public' and c.relkind in ('r','p')
order by c.relname,r.role_name;

select p.proname,p.prosecdef,p.proconfig,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_exec,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as auth_exec
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
order by p.proname;

select tablename,policyname,cmd,roles,qual,with_check
from pg_policies where schemaname='public'
order by tablename,policyname;
```

### Criterio de cierre
Inventario reproducible, plan de migración revisado, respaldo restaurable, matriz de permisos probada en PostgreSQL aislado y comprobaciones posteriores de web y Android. La aprobación de una auditoría no equivale a haber desplegado una corrección. No modificar producción hasta autorización y verificación de precondiciones. Consultar los asesores en el panel de Supabase y la documentación oficial de RLS y seguridad de contraseñas.

### Corrección focalizada de visibilidad de roles

La consulta de `pg_policies` confirmó que la política SELECT de `admin_role_permissions` resolvía el nombre `role_id` sin calificar como `u.role_id`, convirtiendo la comparación en una tautología. Esto amplía lectura de permisos, no concede por sí solo su ejecución. Se corrige el origen histórico y se prepara `sql/SHALOM_ADMIN_ROLE_VISIBILITY.sql` como mantenimiento independiente: verifica RLS, política única y rol esperado antes de alterar solo su expresión. No amplía grants ni modifica funciones de autorización, membresías o datos. La prueba aislada reproduce el defecto y comprueba dos roles propios, rol ajeno, usuario sin asignación, propietario, roles.view y visitante. La corrección no cambia la visibilidad propia de cuentas bloqueadas ni resuelve otras rutas heredadas. Pendiente CI, respaldo, revisión y autorización de producción.
