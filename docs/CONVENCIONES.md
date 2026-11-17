# Convenciones de código de SHALOM

Estas reglas ayudan a que cualquier persona pueda mantener el proyecto. Se aplican a **código nuevo o refactorizado**; no implican que todo el código existente ya las cumpla.

## Nombres y carpetas

- Usar nombres que describan responsabilidades: `song-reader.js`, `repertoire-list.js`, `auth-controller.js`.
- Evitar nuevos nombres como `fix2.js`, `final-final.js` o `new-version.js`.
- Un módulo debe tener una responsabilidad principal y comentarios que expliquen **por qué** existe una regla difícil.
- Mantener `mobile/` separado de la web. No compartir código entre navegador y React Native sin comprobar compatibilidad.
- Guardar documentación en `docs/`, scripts de auditoría en `scripts/` y pruebas en `tests/` o `mobile/tests/`.

## Funciones y dependencias

- Preferir funciones pequeñas y nombres descriptivos.
- Centralizar constantes repetidas, sin introducir abstracciones innecesarias.
- Documentar los datos que recibe una función y lo que devuelve cuando no sea evidente.
- No usar variables globales nuevas si puede evitarse.
- No cambiar el orden de scripts de `admin.html` sin analizar sus dependencias.
- No mezclar cambios de diseño con migraciones SQL en el mismo cambio.

## Supabase

- Solo claves publicables en cliente web o móvil.
- Las claves privadas deben permanecer fuera del repositorio.
- Aplicar permisos mediante RLS, no confiar únicamente en ocultar botones.
- Cada cambio de esquema debe documentar tablas afectadas, dependencias, reversión y pruebas.
- No asumir que los SQL históricos son migraciones reproducibles.

## Cambios y pruebas

- Un commit debe explicar la intención: `Refactor song search without changing results`.
- Para refactorizar, primero fijar el comportamiento esperado con pruebas.
- No borrar archivos por parecer viejos; revisar HTML, imports, globals, Service Worker y workflows.
- Probar en teléfono las funciones nativas: offline, sincronización, acordes, capo, repertorios y actualización.
- No afirmar que una versión está lista hasta que la compilación y pruebas finalicen.

## Herramientas de inventario

```bash
python3 scripts/audit_html_dependencies.py > html-dependencies.md
python3 scripts/audit_js_dependencies.py > js-dependencies.md
```

El primer comando muestra dependencias declaradas en HTML. El segundo muestra `require` e `import` literales. **Ninguno demuestra que un archivo esté sin uso.** Los informes son una ayuda para investigar, no una lista automática de borrado.

## Entrega a otro programador

Entregar `docs/ARQUITECTURA.md`, `docs/DESARROLLO.md`, `docs/PLAN-REORGANIZACION.md`, esta guía y la tarea concreta. Trabajar en rama y revisar el resultado antes de publicarlo.
