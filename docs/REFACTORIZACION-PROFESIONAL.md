# SHALOM — Plan de refactorización profesional para lanzamiento

**Estado:** refactorización incremental y revisable; no representa una reescritura total ni una certificación de producción.

## Objetivo y reglas

Mantener el mismo comportamiento público de SHALOM mientras se reducen acoplamientos, redefiniciones de funciones y scripts cargados a destiempo. **La funcionalidad no cambia para justificar una limpieza de código.**

1. Separar lógica de dominio, acceso a datos, componentes de interfaz y estilos.
2. Reemplazar sobrescrituras de funciones por puntos de extensión explícitos.
3. Usar una sola fuente para cada funcionalidad; no cargar scripts ocultamente desde archivos de configuración.
4. Conservar la estructura y los datos de Supabase, permisos RLS y autenticación del administrador. Las operaciones SQL requieren respaldo y validación aparte.
5. Mantener las claves, identificador Android, datos SQLite, firmas de actualización, perfiles y portadas compatibles.
6. Cambiar en ramas con PR, revisar pruebas, abrir la aplicación en teléfonos reales y fusionar **solo después de validar**.
7. No tocar Juntos Hacia Dios.

## Fase 1 — límites estructurales explícitos (realizada en rama)

- **Web — administrador:** `admin-search-fix.js` ya no sobrescribe `apRenderView`. Su funcionalidad se trasladó a `admin-form-layout.js` (estado del formulario, restauración del foco y despliegue de editores) y `admin-form-layout.css` (estilos). `admin-pro.js` los invoca explícitamente, y `admin.html` declara sus dependencias.
- **Web — sitio público:** `Supabase.js` queda dedicado a configurar Supabase. `site-shell.js` reúne menú, metadatos y pie de página, cargados expresamente por las 13 páginas públicas que requieren Supabase. Se retiraron dos scripts separados que se agregaban desde el cliente de datos.
- **Android:** `mobile/App.js` ya no contiene sus ~294 estilos; `mobile/src/app-styles.js` crea la misma hoja con la paleta original. Se actualizaron las pruebas de diseño sin reducir la cobertura funcional.
- **Publicación:** Android debe ejecutar compilaciones y publicación automática solamente para cambios fusionados en `main`; no se debe reemplazar un APK de producción por construir una rama de ensayo.
- **Pruebas:** `tests/architecture-modules-regression.cjs` impide que reaparezcan el parche de renderizado, el diseño dentro de Supabase y el bloque monolítico de estilos Android.

## Fase 2 — separar responsabilidades (pendiente)

- `mobile/App.js` todavía contiene navegación, lectura, búsqueda, opciones, sincronización y varias pantallas (~77 kB después de fase 1). Extraer gradualmente componentes y controladores por pantalla, manteniendo la lógica de transposición y edición de acordes compartida.
- `mobile/src/personal-ui.js` (~45 kB) concentra crear, importar, exportar, leer, editar y gestionar carpetas. Separar vistas de creación, editor, lectura y compartir sin cambiar almacenamiento local ni el código SHALOM1.
- `admin-pro.js` (~52 kB) contiene la lógica de varias entidades y funciones de guardado. Extraer servicios por entidad y formularios, con pruebas de edición concurrente y recuperación del borrador.

## Fase 3 — deuda restante web (pendiente)

- Analizar `home-fix.js`, `category-home-meta-clean.js`, `site-seo-static.js` y otros módulos históricos por referencias reales. Eliminar código muerto únicamente después de demostrar que no se ejecuta.
- Integrar la limpieza de metadatos en los componentes que construyen la descripción; evitar MutationObservers para limpiar contenido que ya nace incorrecto.
- Consolidar las fuentes de metadatos y los estilos CSS **sin alterar** los archivos/rutas que GitHub Pages utiliza en producción.
- Normalizar las responsabilidades del catálogo, buscador, artista, repertorio y popurrí entre pantallas. No reescribir todo de una vez ni introducir un framework sin justificar el costo.

## Fase 4 — criterios para el lanzamiento (pendiente)

1. Ejecutar en PR las pruebas web, administrador, React Native, almacenamiento y regresión de estilos.
2. Comparar visualmente todas las pantallas web y Android antes/después en teléfono y escritorio.
3. Ensayar un ciclo real **Admin → publicar misa → web → descarga Android → modo avión → actualizar app**.
4. Probar iniciar y salir de Editar perfil, favoritos, Mis creaciones, códigos, impresión, importación y recuperación de respaldo.
5. Confirmar firma estable del APK/AAB para que las actualizaciones no exijan desinstalar ni perder fotos.
6. Confirmar que las funciones sensibles de Supabase exigen permisos y que los visitantes no ven borradores.
7. Documentar cambios, rutas, regresiones, responsabilidades, versiones y procedimiento de reversión.

## Condición de aprobación

Se considera una fase completa únicamente cuando su código está integrado en la rama principal, los controles automáticos pasan y las rutas críticas se probaron manualmente. **Los cambios presentes solamente en un PR son candidatos a integración, no una versión publicada.**
