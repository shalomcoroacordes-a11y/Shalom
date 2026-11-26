# Módulos de categorías del administrador

**Auditoría del 17 de noviembre de 2026.** Se inspeccionaron los archivos que carga `admin.html` en el repositorio SHALOM. No se eliminó ni reubicó ningún script.

## Secuencia actual

1. `admin-pro.js`: base del panel; los módulos posteriores dependen de su estado global `AP` y funciones auxiliares.
2. `admin-category-browser-v2.js`: navegador visual de categorías; lee `AP.categories`, configura `AP.categoryBrowser` y captura las implementaciones anteriores `apSaveCategory` y `apDeleteCategory` para ampliar su comportamiento.
3. `admin-category-save-fix.js`: intercepta el evento `submit` de `categoryAdminForm`, evita la propagación a otros manejadores mediante `stopImmediatePropagation()` y aplica validaciones de guardado.
4. `admin-song-category-picker.js`: interfaz de selección de múltiples categorías para canciones, basada en `AP.categories` y relaciones padre-hijo.

El orden de estos cuatro archivos se protege ahora en `scripts/check_admin_script_chain.py`, ejecutado desde `.github/workflows/public-quality.yml`.

## Hallazgo que requiere pruebas antes de consolidar

`admin-category-browser-v2.js` reconoce las clasificaciones `catolico`, `cristiano`, `mixto` y `general`, mientras que `admin-category-save-fix.js` normaliza explícitamente solo `catolico` y `cristiano`; para otros valores devuelve cadena vacía. **Es una diferencia real de comportamiento entre los dos archivos**, no prueba por sí sola de un error de producción. Antes de modificarla se debe verificar el formulario real, las restricciones de la columna `categories.song_type` en Supabase y probar creación/edición para cada tipo.

## Riesgos de una consolidación apresurada

- Cambiar el orden de carga puede romper referencias a `AP` o la captura de funciones originales.
- Quitar el interceptador de `submit` puede hacer que se ejecuten dos guardados o que se omitan validaciones.
- El selector de categorías para canciones y el navegador de categorías administrativas son flujos distintos: no fusionarlos únicamente porque comparten funciones de árbol.
- Mantener `admin.html` y los nombres de archivos mientras GitHub Pages publique desde la raíz.

## Próximos pasos de prueba

- Guardar una categoría nueva y editar una existente; comprobar prevención de duplicados.
- Probar categorías padre/hija, cambio de tipo y selección múltiple de categorías de una canción.
- Confirmar las restricciones de tipos en Supabase y añadir pruebas de regresión antes de unificar lógica.
- Hacer la consolidación en cambios pequeños y comprobar GitHub Actions y los flujos reales del navegador.

**Este documento es un mapa de dependencias, no una declaración de que existan archivos prescindibles.**

## Verificación de producción (2026-11-17)

La restricción activa de Supabase es `categories_song_type_check`: `song_type IN ('', 'catolico', 'cristiano')`. La columna es `text NOT NULL` con valor predeterminado `''`. El recuento de categorías fue 11 generales (`''`) y 13 católicas (`catolico`); no se alteraron datos. Por tanto, la normalización actual de `admin-category-save-fix.js` coincide con los valores admitidos por la base de datos. La pestaña visual `mixto` no equivale a un tipo persistible; su significado y tratamiento en la interfaz requieren diseño explícito antes de añadir soporte en SQL.

Se añadió `tests/category-type-regression.cjs`, prueba aislada del manejador de guardado con seis casos, ejecutada por el flujo de calidad. Esta prueba no utiliza credenciales ni guarda categorías reales.

## Actualización de arquitectura (25 de noviembre de 2026)

`admin-category-hierarchy.js` centraliza la búsqueda, rutas, descendientes y orden de hijos. Se carga antes de `admin-pro.js`; el navegador y el selector múltiple consumen el mismo núcleo. El guardado y la validación de padre permanecen en `admin-category-browser-v2.js`, que ya incorporó el antiguo guardado externo; `admin-category-save-fix.js` no es un script activo. Se conservan los filtros de tipo particulares de cada pantalla, las reglas de eliminación y las consultas. Las pruebas de jerarquía y la nueva regresión de árbol no acceden a producción.
