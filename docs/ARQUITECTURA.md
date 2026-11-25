# Arquitectura de SHALOM (estado actual)

> Documento para propietarios, colaboradores y futuros programadores. Describe el repositorio **actual**, no una estructura ya migrada.

## Qué es SHALOM

SHALOM tiene tres partes conectadas:

1. **Sitio público**: HTML, CSS y JavaScript sin compilador; GitHub Pages publica los archivos de la raíz. Entradas: `index.html`, `canciones.html`, `cancion.html`, `artistas.html`, `artista.html`, `categorias.html`, `albumes.html`, `popurris.html`, `repertorios.html` y páginas informativas.
2. **Administrador**: `admin.html` carga módulos `admin-*.js` y estilos `admin-*.css`. Acceso con Supabase Auth y permisos en la base de datos. Funciones para gestionar cantos, artistas, categorías, álbumes, popurrís, repertorios y solicitudes.
3. **App móvil**: `mobile/` contiene React Native + Expo. `mobile/App.js` reúne la interfaz y navegación; `mobile/src/` contiene catálogo, acordes, sincronización, almacenamiento y solicitudes. Su copia local usa SQLite para consultar cantos sin conexión.

## Mapa rápido: ¿dónde cambio algo?

| Necesito cambiar... | Archivo o zona actual |
| --- | --- |
| Inicio de la web | `index.html`, `home.js`, `style.css` y estilos relacionados |
| Lista de cantos de la web | `canciones.html`, `canciones.js` |
| Vista de un canto y acordes web | `cancion.html`, `cancion.js`, `song-chords.js`, `song-reading-mode.js` |
| Artistas web | `artistas.html`, `artistas.js`, `artista.html`, `artist-page.js` |
| Popurrís web | `popurris.html`, `popurris.js`, `medley-core.js` |
| Repertorios web | `repertorios.html`, `repertoires.js`, `repertoires-core.js` |
| Inicio, pestañas y lectores Android | `mobile/App.js` |
| Catálogo Android | `mobile/src/catalog.js` |
| Acordes Android | `mobile/src/chords.js` |
| Sincronización Android | `mobile/src/sync.js`, `mobile/src/config.js` |
| Almacenamiento sin conexión | `mobile/src/database.js`, `mobile/src/file-storage.js` |
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
- `mobile/App.js` contiene varias pantallas y lógica de navegación en un solo archivo; conviene extraer módulos por etapas.
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

Este documento es el **punto de partida**: no afirma que la reorganización ya esté hecha.

El perfil público se carga únicamente mediante `artist-page.js`; biografía, enlaces sociales (incluido el respaldo histórico), destacados y catálogo paginado pertenecen a ese módulo. Los antiguos complementos de perfil ya no forman parte del repositorio.

Motor musical nativo: `native-chords.js` es la fuente; `scripts/build-native-chords.js` genera `mobile/src/chords.js` y `admin-mobile/src/chords.js`. Cada APK conserva su módulo local. La verificación compara ambas salidas byte por byte con la fuente y el encabezado generado.


### Respaldo del catálogo v2

El núcleo `admin-backup-core.js` define el formato, las 13 tablas, el orden de dependencia, las claves de paginación y las reglas de revisión Studio. El importador acepta v1 sin Studio ni versiones alternativas y v2 con ambas secciones. Los arreglos vigentes en la revisión del archivo se vinculan exclusivamente a la revisión devuelta por la escritura del canto; los anteriores se conservan en el JSON sin publicarse. La descarga previa utiliza el mismo esquema. La lectura y la restauración web siguen siendo multiconsulta (no una transacción), sujetas a permisos RLS y concurrencia; los borradores locales no están incluidos. El formato de papelera es independiente.


Studio comparte `studio-native-screen.js` (fábrica de pantalla nativa), `studio-collections.js` (planificación de colecciones) y las fuentes web de Studio. `scripts/build-studio-native.js` genera las cinco salidas que usan las apps; la pantalla Admin recibe su mensaje de publicación específico y la pública su cola opcional desde el lector.

## Presentación compartida de artistas y álbumes

`catalog-list-view.js` es propietario de las tarjetas y el botón de paginación; `artistas.js` y `albumes.js` conservan sus consultas y filtros. Ambas páginas cargan `catalog-list-bundle.css` (copia concatenada y verificada de `catalog-cards.css` y `detalles.css`). Álbumes carga después `catalogo.css`, que también utiliza Categorías. No se modifica el orden de reglas ni los selectores. Si cambian los estilos fuente, actualizar el paquete y ejecutar `node tests/catalog-css-bundles-regression.cjs`. El bundle de detalle de canto conserva su propio contrato. Se elimina un paquete redundante a cambio de una hoja adicional en Álbumes, que puede aprovechar caché compartida; medir antes de afirmar una mejora de velocidad.

## Estilos de lectores de colecciones

Repertorios y Popurrís comparten `collection-reader-bundle.css` (concatenación exacta de `site-shell.css`, `public-accessibility.css` y `song-chords.css`). Cada página carga a continuación su hoja específica (`repertoires.css` o `medleys.css`) y después `studio-collection-web.css`. El orden de cascada y la importación inicial de `mobile-experience.css` se conservan. Admin sigue utilizando las hojas originales. Los controles `public-page-bundles-regression.cjs` y `studio-collection-styles.cjs` verifican el contrato. Se añade una solicitud CSS por página a cambio de reutilizar un paquete común en caché; el rendimiento debe medirse.

## Base compartida del lector y páginas informativas

`public-content-base-bundle.css` conserva, en este orden, `site-shell.css`, `public-cards.css` y `public-accessibility.css`. Canción carga a continuación `song-reader-bundle.css` con sus nueve fuentes específicas en orden original; Acerca de, Contacto y Solicitar canto cargan `public-info-pages.css`. Los dos paquetes anteriores se retiran. Las pruebas de equivalencia exacta y orden de hojas permanecen en `tests/song-detail-bundle-regression.cjs` y `tests/public-info-bundle-regression.cjs`. El lector conserva impresión, capo y preferencias. No se altera la caché de Offline. La separación agrega una petición CSS por página y permite reutilizar la base; se requiere medición y revisión visual antes de afirmar una mejora de rendimiento.

## Consulta de cantos relacionados

`song-related-catalog.js` contiene la consulta y clasificación por artista (3), categoría (2) y álbum (1), con desempate por título y límite de seis sugerencias. `cancion.js` conserva el montaje, los textos y la presentación de las tarjetas. El módulo no depende del DOM y recibe explícitamente cliente, canción y relaciones; `tests/song-related-catalog.cjs` prueba consultas simuladas y resultados. No cambia el algoritmo ni los permisos de lectura.

## Intérprete del lector web

`cancion.js` usa exclusivamente `song-chords.js` para interpretar las letras, acordes superiores, acordes entre paréntesis y secciones. El lector conserva su cálculo de transposición y capo; el intérprete compartido valida cada token y recibe una función para transponerlo. Se elimina el analizador alternativo anterior, que no soportaba todos los formatos. Si falta el script canónico, se muestra el texto fuente sin interpretar y un aviso de recarga; no se simula una transposición. `tests/song-reader-chords.cjs` verifica equivalencia de la ruta habitual y el modo degradado. No se cambia el motor nativo ni otros consumidores web.

## Retiro del intérprete histórico y equivalencia musical

`details.js` no tiene consumidores activos y se retira; su historial permanece en Git. El lector web utiliza `song-chords.js`, mientras las aplicaciones conservan las salidas generadas desde `native-chords.js`. `tests/chord-engine-parity.cjs` convierte el HTML web a filas semánticas y compara con el motor nativo para 20 ejemplos y 25 desplazamientos, incluidos espacios, secciones, acordes con bajo, formato mixto y caracteres HTML. Esta prueba comprueba equivalencia en las muestras, no una fusión de motores ni medición visual. También rechaza referencias al módulo retirado en archivos de código y configuración versionados.

## Posición del editor de cantos (Admin web)

`admin-editor-position.js` administra exclusivamente el cursor y desplazamiento horizontal/vertical por canto durante la sesión. Conserva la clave `shalom-admin-editor-positions-v1` y la estructura anterior; no guarda letras ni escribe en Supabase. `admin-pro.js` mantiene la propiedad de los eventos y del ciclo de montaje, y limpia únicamente la posición del borrador nuevo al reiniciarlo. El servicio tolera almacenamiento bloqueado o corrupto y conserva el estado en memoria. La prueba `tests/admin-editor-position.cjs` verifica restauración, límites del cursor y compatibilidad con registros anteriores.

## Preparación de borradores de cantos (Admin web)

`admin-song-draft.js` contiene las funciones puras `fromSong` y `capture`, que preparan el borrador, revisión original, relaciones, enlaces y capos, y fusionan valores del formulario sin cambiar la selección múltiple de categorías. `admin-pro.js` conserva los eventos, el estado AP y la publicación transaccional. No hay escritura de datos en el módulo nuevo. `tests/admin-song-draft.cjs` y la regresión de publicación verifican el contrato y la preservación de los cambios.

## Preparación de publicaciones de cantos (Admin web)

`admin-song-publication.js` contiene la validación de campos y la construcción pura del contrato `admin_publish_song`. No ejecuta solicitudes ni altera los borradores. `admin-pro.js` conserva la sesión autorizada, el identificador idempotente, la revisión original, el control de concurrencia, la llamada RPC y la confirmación de guardado. `tests/admin-song-publication.cjs` comprueba el contrato completo y `tests/admin-save-regression.cjs` mantiene la cobertura de errores, conflictos y cambios posteriores.

## Resumen musical de Studio

El cálculo de resumen pertenece a `studio-core.js` (`reviewSummary`); la interfaz `studio-lab.js` solamente presenta las filas. Se conserva duración, compás, número de acordes, secciones y patrones, incluidos tempos independientes. Las dos salidas nativas se mantienen idénticas y CI verifica su regeneración canónica. La caché Offline pasa a v22 para actualizar conjuntamente núcleo e interfaz y añadir `studio-save-state.js` y `studio-reading-geometry.js`, dependencias presentes en el HTML pero ausentes del inventario previo. No se modifican arreglos persistidos ni el protocolo de publicación.

## Planificación de reproducción de Studio

`studio-core.js` centraliza `playbackRange`, `liveSectionEvent` y `sequenceTrackTimeline`. Conserva prioridad de rangos, cálculo del reloj, límites de tono/capo, exigencia de fragmentos oficiales y aislamiento del rasgueo en escucha de sección, incluido el comportamiento de dejar sonar. El editor mantiene los temporizadores, audio, lectura, y validación de digitaciones. Se sincronizan las dos copias nativas y se renueva la caché Offline v23. Las pruebas comparan con la lógica anterior; no se cambia el formato de arreglos ni se modifica contenido persistido.
