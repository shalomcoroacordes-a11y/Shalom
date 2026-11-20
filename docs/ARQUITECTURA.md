# Arquitectura de SHALOM (estado actual)

> Documento para propietarios, colaboradores y futuros programadores. Describe el repositorio **actual**, no una estructura ya migrada.

## Qué es SHALOM

SHALOM tiene tres partes conectadas:

1. **Sitio público**: HTML, CSS y JavaScript sin compilador; GitHub Pages publica los archivos de la raíz. Entradas: `index.html`, `canciones.html`, `cancion.html`, `artistas.html`, `artista.html`, `categorias.html`, `albumes.html`, `popurris.html`, `repertorios.html` y páginas informativas.
2. **Administrador**: `admin.html` carga módulos `admin-*.js` y estilos `admin-*.css`. Acceso con Supabase Auth y permisos en la base de datos. Funciones para gestionar cantos, artistas, categorías, álbumes, popurrís, repertorios y solicitudes.
3. **App móvil**: `mobile/` contiene React Native + Expo. `mobile/App.js` sigue coordinando las pantallas; las reglas de navegación están en `mobile/src/navigation-core.js`, los estilos principales en `mobile/src/app-styles.js` y la biblioteca personal separa estilos (`personal-styles.js`) de operaciones inmutables (`personal-store.js`). `mobile/src/` también contiene catálogo, acordes, sincronización, almacenamiento y solicitudes. Su copia local usa SQLite para consultar cantos sin conexión.

## Mapa rápido: ¿dónde cambio algo?

| Necesito cambiar... | Archivo o zona actual |
| --- | --- |
| Inicio de la web | `index.html`, `home.js`, `style.css` y estilos relacionados |
| Lista de cantos de la web | `canciones.html`, `canciones.js` |
| Vista de un canto y acordes web | `cancion.html`, `cancion.js`, `song-chords.js`, `song-reading-mode.js` |
| Artistas web | `artistas.html`, `artistas.js`, `artista.html`, `artist-page.js` |
| Popurrís web | `popurris.html`, `popurris.js`, `medley-core.js` |
| Repertorios web | `repertorios.html`, `repertoires.js`, `repertoires-core.js` |
| Inicio y lectores Android | `mobile/App.js`, `mobile/src/app-styles.js`, `mobile/src/app-components.js` |
| Capo compartido e impresión | `mobile/src/song-capo-core.js`, `mobile/src/song-print.js` |
| Solicitudes Android | `mobile/src/request-screen-ui.js` (presentación), `mobile/src/requests.js` (validación/envío) |
| Pestañas y búsqueda Android | `mobile/src/navigation-core.js` |
| Listados y favoritos Android | `mobile/src/library-selectors.js` |
| Mis colecciones Android | `mobile/src/personal-ui.js`, `mobile/src/personal-styles.js`, `mobile/src/personal-store.js`, `mobile/src/personal-workflows.js`, `mobile/src/personal-reader-core.js` |
| Catálogo Android | `mobile/src/catalog.js` |
| Acordes Android | `mobile/src/chords.js` |
| Sincronización Android | `mobile/src/sync.js`, `mobile/src/config.js` |
| Almacenamiento sin conexión | `mobile/src/database.js`, `mobile/src/file-storage.js` |
| Navegación/metadatos del sitio | `site-shell.js`, incorporado expresamente en HTML público |
| Formularios de administración | `admin-form-layout.js`, `admin-form-layout.css`, `admin-pro.js` |
| Cursor y scroll de edición de cantos | `admin-editor-position.js` |
| Administración de repertorios | `admin-repertoires.js`, `admin.html` |
| Administración de popurrís | `admin-medleys.js`, `admin.html` |
| Acceso al administrador | `admin-auth-controller.js`, `admin-access-guard.js`, políticas SQL |
| Tablas, permisos y cambios de BD | Archivos `*.sql` en la raíz (todavía sin historial unificado) |
| Compilación y pruebas automáticas | `.github/workflows/` |

## Flujo de datos

- El sitio público consulta Supabase mediante `Supabase.js` y los módulos de cada página.
- El administrador escribe en Supabase según autenticación y políticas RLS.
- Android descarga registros públicos mediante `mobile/src/sync.js`, los guarda localmente y los presenta con `mobile/src/catalog.js` y `mobile/App.js`.
- La app no debe necesitar credenciales privadas ni modificar datos administrativos.

## Riesgos y deuda técnica identificados

- Muchos archivos públicos y de administración están mezclados en la raíz.
- El administrador carga numerosos scripts dependientes del orden de `admin.html`; **no mover ni fusionar sin verificar referencias y dependencias**.
- Nombres `*-fix.js`, `*-v2.js` y `*-polish.css` requieren auditoría de uso antes de decidir si se consolidan; **no asumir que son obsoletos**.
- `mobile/App.js` todavía contiene varias pantallas en un solo archivo. Se extrajeron estilos y la lógica de selección de pestañas; faltan separar controladores y pantallas por responsabilidad.
- `mobile/src/personal-ui.js` conserva varias vistas. Sus estilos y su lógica inmutable ya están separados en módulos con pruebas; falta extraer vistas pequeñas sin modificar navegación, importaciones ni almacenamiento.
- Los scripts SQL mezclan pasos históricos, ajustes y esquema: antes de migrarlos, documentar cuáles se ejecutaron y en qué orden. **Nunca reejecutarlos en producción a ciegas**.
- Existen varios workflows de publicación; documentar sus disparadores y destinos antes de simplificarlos.
- `mobile/README.md` debe revisarse cada vez que cambien las tablas sincronizadas; no asumir que la lista histórica es completa.

## Reglas para colaborar

1. Trabajar únicamente en `shalomcoroacordes-a11y/Shalom`. No modificar el proyecto original Juntos Hacia Dios.
2. Crear una rama o PR para cambios estructurales. Evitar mover archivos masivamente sobre `main`.
3. Mantener las URLs públicas y las rutas de GitHub Pages.
4. No incluir claves privadas, contraseñas ni tokens en Git.
5. Para cambios de base de datos, respaldar y documentar migraciones antes de ejecutarlas.
6. Verificar navegación, administrador, cantos, acordes, popurrís, repertorios, modo offline y Android antes de publicar.
7. Mantener documentación y pruebas junto a cada funcionalidad nueva.

## Próximos documentos

- `docs/PLAN-REORGANIZACION.md`: fases, criterios de aceptación y estrategia segura.
- Futuro `docs/BASE-DE-DATOS.md`: tablas, relaciones, RLS y migraciones verificadas.
- Futuro `docs/DESARROLLO.md`: instalación, pruebas, compilación y despliegue.
- Futuro `docs/GUIA-PARA-APRENDER.md`: recorrido didáctico para aprender el proyecto.

**Estado:** el mapa describe el código de la rama de revisión `refactor/clean-architecture-phase-1`. No significa que los cambios estén publicados en `main` ni que se haya completado la auditoría de lanzamiento. Consulta `docs/REFACTORIZACION-PROFESIONAL.md` y las pruebas del PR antes de integrar.
