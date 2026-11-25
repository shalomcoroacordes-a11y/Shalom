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

## Política de refactorización desde el origen

Consultar `AGENTS.md` antes de cada tarea. Los nombres históricos no prueban que un módulo esté sin uso; el objetivo es consolidar responsabilidades con pruebas, no solo renombrar archivos. El control `scripts/check_clean_changes.py` bloquea nuevos archivos de implementación con nombres de parche o versión, no sustituye una revisión de arquitectura. Las excepciones legítimas se documentan y revisan explícitamente.

### Ciclo de renderizado de Admin

`admin-pro.js` es el propietario de `apRenderView`. Los módulos de formularios y categorías exponen `ShalomAdminFormLayout.enhance()` y `ShalomAdminSongCategories.mount()` respectivamente; el propietario los invoca de forma explícita. No reemplazar `apRenderView` para añadir nuevas funciones. El selector de categorías se monta solo en la vista de cantos y conserva su estado y selección mediante su módulo existente. Otros envoltorios históricos requieren revisión separada.

`Respaldo` pertenece a las pestañas de `apRenderShell`; `apRenderView` llama `ShalomAdminBackup.mount(view)`, y la vista de respaldo llama `ShalomAdminBackupImport.mount()` después de crear su contenido. No se necesitan observadores de página ni reemplazar el renderizador para estas vistas. La protección de eliminación existente sigue separada; no modificar su lógica sin pruebas específicas de recuperación.

Los estilos de formularios, navegación, respaldo, papelera e importación de Admin pertenecen a `admin-pro.css`. Sus módulos JS no crean etiquetas `style`; los cambios de presentación se hacen en los selectores responsables. Se mantiene el orden relativo de los bloques extraídos tras los estilos base y móviles. No se considera equivalente visualmente hasta comprobar el navegador en escritorio y móvil.

### SHALOM Studio

`studio-save-state.js` decide el estado visual de guardado y publicación mediante una función pura. `studio-lab.js` renderiza el resultado y conserva la coordinación de persistencia, confirmaciones y transporte. `studio-core.js` conserva la lógica musical, y `studio-codec.js` la serialización. Los bundles de `mobile/` y `admin-mobile/` se generan desde las fuentes web con `node scripts/build-studio-native.js`; nunca editarlos a mano. Public quality comprueba que ambos sean idénticos y reproducibles, sin necesidad de red durante el uso de Studio.

`studio-reading-geometry.js` concentra los cálculos puros de escala de letra, distancia y centro del gesto de dos dedos, y desplazamiento para seguimiento de letra. `studio-lab.js` conserva los eventos del DOM, el estado de gestos y la aplicación del desplazamiento. Las pruebas de zoom y seguimiento importan el módulo original en lugar de extraer funciones del texto de la interfaz.

Los patrones predefinidos y la interpretación de códigos de rasgueo pertenecen a `studio-core.js` (`presetHits`, `decodeRhythmCode`). La interfaz conserva confirmaciones, alcance de aplicación, edición y mensajes. Las pruebas de carga de dependencias verifican precedencia, no adyacencia innecesaria entre scripts independientes.

Los límites de secciones, selección de compases y rango de escucha de transición se calculan exclusivamente en `studio-core.js` (`groupRange`, `sectionBarCount`, `sectionBarSelection`, `sectionTransitionRange`). El editor conserva el estado y los controles de navegación. No duplicar el cálculo de límites en la interfaz ni en las apps.

El reloj de reproducción de Studio pertenece a `studio-core.js`: `playbackSpeed`, `playbackEvent`, `playbackFrame` y `sequenceFrame` calculan velocidad, tiempos de eventos, posición visual, pausas y transiciones. `studio-lab.js` conserva temporizadores, Web Audio, cancelación, interacción y presentación; no duplicar allí los cálculos del reloj. La escucha de un compás mantiene su transporte independiente para aceptar cambios en vivo.

### Aplicación pública

`mobile/src/library-selectors.js` es responsable de resolver filtros, búsqueda y registros abiertos del catálogo; `mobile/src/studio-queue.js` decide la posición de la cola de práctica sin modificar el estado anterior. `mobile/App.js` conserva los hooks, navegación y presentación. Los selectores deben conservar la diferencia existente entre identificadores estrictos de detalles y equivalencia textual en acciones de canto. No cambiar el modelo de almacenamiento ni rutas al extraer estas funciones.

`mobile/src/song-reader-actions.js` concentra las acciones de compartir, imprimir, comprobar disponibilidad offline y abrir video del lector público. Recibe servicios nativos y el estado actual desde `mobile/App.js`; no posee hooks ni modifica catálogo o almacenamiento. `song-print.js` sigue siendo el único responsable del HTML de impresión. Las acciones se prueban con servicios simulados y conservan los mensajes y rutas existentes.

`mobile/src/navigation-core.js` posee el orden de prioridad del retroceso (`handleBack`), incluidos los paneles, detalle, navegación anidada, búsquedas, carpetas e historial. `mobile/App.js` conecta el botón de Android y las acciones de pantalla con el estado actual; las pruebas simulan los controles y verifican que las rutas internas se consulten solo cuando corresponde. No duplicar la jerarquía de retroceso en las pantallas.

`mobile/src/settings-screen-ui.js` posee la presentación de Configuración (preferencias, estado de sincronización, métricas, respaldo e información). Recibe el estado, estilos y callbacks originales desde App; la sincronización, preferencias y almacenamiento siguen en sus responsables existentes. Las pruebas de cabecera y retroceso consultan el módulo propietario de cada responsabilidad.

`mobile/src/exploration-screens-ui.js` contiene las pantallas secundarias Más, Explorar y Álbumes. Reciben los componentes visuales compartidos y callbacks de navegación desde App, sin acceso directo a almacenamiento o sincronización. Las regresiones verifican las rutas y filtros en el módulo propietario, además de comprobar que App lo renderiza.

### Aplicación Admin

`admin-mobile/src/model.js` concentra el esquema de edición, hidratación de registros y relaciones (`initial`, `fromServer`) y normalización de borradores (`draftRecord`). `admin-mobile/App.js` conserva la interfaz, identidad del usuario, permisos, escritura local y sincronización. Las revisiones esperadas, claves de contenido, estados de cola y valores nulos se preservan; las pruebas verifican estos contratos sin escribir a Supabase.

`admin-mobile/src/components/Controls.js` contiene los controles visuales reutilizados por el editor y las demás pantallas. `EditorFields.js` posee el despacho de campos, fragmentos/repertorios, enlaces y capos; recibe el callback de creación de identificadores desde App. La autenticación, permisos, revisión de cambios, almacenamiento y publicación permanecen en sus responsables. No duplicar controles ni reconstruir formularios mediante parches en App.

### Auditoría de duplicados (JSCPD)

El workflow independiente `SHALOM duplication audit` ejecuta JSCPD 4.0.5 sobre JavaScript y CSS de producción. Compara la base del PR (o el commit anterior de main) y el resultado de checkout con la misma configuración `.jscpd.json`. Excluye dependencias, pruebas, scripts auxiliares, salidas de compilación y los bundles de Studio regenerados; los módulos originales siguen en alcance. Umbrales: 8 líneas y 80 tokens; el reporte indica pares de archivos con aumento de bloques o líneas coincidentes, sin depender de la posición exacta de las líneas. Los JSON y la comparación se conservan como artefacto de Actions. La herramienta y las pruebas deben ejecutarse correctamente; el aumento de duplicados se informa inicialmente, no bloquea por porcentaje histórico ni autoriza borrados. Revisar primero duplicados legítimos entre web/Expo antes de endurecer el umbral. La versión del analizador está fijada; la resolución de sus dependencias transitivas por npm aún no tiene lockfile dedicado. Ejecución local: `npm exec --yes --package=jscpd@4.0.5 -- jscpd . --config .jscpd.json --absolute --output /tmp/shalom-jscpd`. No instala dependencias en las aplicaciones ni modifica su código.

### Análisis estático (ESLint)

`SHALOM static code analysis` usa ESLint 9.39.1 con flat config y reglas de defectos comunes, sin imponer un formateo general. Web clásica: scripts independientes que comparten variables globales, por lo que no se aplica `no-undef` global ni se marcan declaraciones globales sin uso; se revisan variables locales. Apps: CommonJS y globals de React Native explícitos, con `no-undef` y `no-unused-vars` en todo App/src. Los bundles de Studio generados se excluyen; los módulos fuente sí se analizan. Se comprueba que el linter detecta tres defectos intencionales y se comparan hallazgos por archivo/regla con la base del PR. El reporte inicial es informativo (warnings), los errores de análisis no se ocultan. No borrar variables o archivos automáticamente ni ejecutar --fix indiscriminado. Las pruebas de contratos y alcance de Babel siguen vigentes. La dependencia directa tiene versión fija, sin lockfile transitivo dedicado todavía. Ejecución local: `npm exec --yes --package=eslint@9.39.1 -- eslint '*.js' 'mobile/App.js' 'mobile/src/**/*.js' 'admin-mobile/App.js' 'admin-mobile/src/**/*.js'`. Consultar https://eslint.org/docs/latest/use/configure/language-options para la configuración por entorno.

### Inventario de código potencialmente sin uso (Knip)

El workflow `SHALOM unused code audit` ejecuta Knip 5.70.2 con TypeScript 5.9.3 en cada aplicación Expo por separado. Los puntos de entrada incluyen App.js, scripts y pruebas, para no confundir módulos de mantenimiento o regresiones con código abandonado; el plugin Expo detecta su configuración. Se conservan las referencias a bundles y módulos nativos. Analiza archivos, dependencias declaradas, no declaradas y referencias no resueltas. No analiza la web clásica mediante Knip: sus dependencias globales, scripts HTML e inyección dinámica requieren el inventario existente y revisión manual. Los informes son candidatos, no una autorización para borrar; no se utiliza --fix. El análisis instala dependencias solo en el runner, sin modificar manifiestos ni lockfiles, y conserva JSON como artefacto. La resolución transitiva aún no tiene lockfile dedicado. Consultar https://knip.dev/reference/plugins/expo y https://knip.dev/reference/cli. Para ejecución local desde cada aplicación con dependencias instaladas: `npm exec --yes --package=knip@5.70.2 --package=typescript@5.9.3 -- knip --config knip.json --include files --include dependencies --include unlisted --include unresolved --reporter json --no-exit-code`.

### Arquitectura de dependencias (Dependency Cruiser)

El workflow `SHALOM dependency architecture` usa Dependency Cruiser 17.0.0 para el grafo de import/require estáticos de los JS de raíz y App/src de ambas apps. Reporta ciclos, importaciones directas entre aplicaciones y dependencias de producción hacia pruebas. Conserva aristas a bundles Studio sin recorrer su implementación generada; tampoco recorre node_modules. No instala las dependencias Expo ni pretende validar su resolución con Metro: para ello están Knip y compilaciones. Los scripts web clásicos mantienen dependencias globales/HTML no visibles al grafo, cubiertas por los inventarios existentes. Las reglas comienzan como advertencias; una prueba con cuatro infracciones deliberadas demuestra que no son controles vacíos. Se guarda JSON con el grafo y las infracciones. No borrar código automáticamente. El analizador tiene versión fija sin lockfile transitivo dedicado. Ejecución local: `npm exec --yes --package=dependency-cruiser@17.0.0 -- depcruise --config .dependency-cruiser.cjs --output-type json ./*.js mobile/App.js mobile/src admin-mobile/App.js admin-mobile/src`. Referencia: https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md.

### Auditoría estructural (ast-grep)

`SHALOM structural code audit` usa ast-grep 0.39.7 y reglas AST de JavaScript en `quality/ast-grep/rules`. Reporta reasignaciones a apRenderView y propiedades window con prefijo render/apRender, creación de MutationObserver e inserción potencial de CSS mediante document.createElement("style"). Las pruebas positivas/negativas de las reglas se ejecutan antes de escanear los JS de producción (raíz y App/src de ambas apps, sin bundles Studio ni minificados). Los hallazgos son candidatos a revisar: un observador de contenido externo o un renderizador publicado explícitamente puede ser legítimo. No hay autofix ni supresión general; se conserva JSON con archivo y línea. No cubre todas las formas de parches, como alias indirectos o CSS en HTML. Ejecución local de pruebas: `npm exec --yes --package=@ast-grep/cli@0.39.7 -- ast-grep test --skip-snapshot-tests`. Referencia: https://ast-grep.github.io/guide/test-rule.

### Primera reducción de advertencias ESLint

Tras la auditoría de 29 advertencias, se retiran 19 declaraciones locales e importaciones sin uso de 12 archivos (incluyendo asignaciones a dos variables locales sin lectores). No se retiran exports ni componentes completos. Se conservan las dependencias npm, los módulos con consumidores, la lógica de autenticación, sincronización, estilos y publicación. La comprobación de sintaxis se hizo en memoria; la reducción efectiva debe verificarse en CI con el mismo ESLint y las pruebas de regresión existentes. Las funciones antiguas y los patrones estructurales restantes requieren revisión de sus consumidores y pruebas antes de suprimirlos.

El selector de categorías de cantos (`admin-song-category-picker.js`) deja de crear una etiqueta style en ejecución. Sus declaraciones originales se conservan byte por byte en la sección `Admin song category picker` de `admin-pro.css`; las referencias de admin.html cambian de versión para invalidar caché. La prueba de consolidación verifica el contenido y ausencia de inyección. La cascada final en navegador debe comprobarse visualmente; no se altera la selección ni el guardado de categorías.

Los estilos del navegador de categorías, buscador de artista principal y formulario de perfil de artista se trasladan desde sus módulos JS a `admin-pro.css`, conservando cada cadena CSS y su orden interno. La hoja y los tres scripts actualizan su versión de caché. Se conserva el ciclo de montaje, la búsqueda, la gestión de relaciones y el guardado; no se alteran consultas ni permisos. La prueba de consolidación valida huellas de contenido y ausencia de inyección. La cascada entre hojas y estilos dinámicos remanentes requiere verificación visual.

El buscador de artista principal se monta explícitamente desde `apRenderView` después de crear y enlazar el formulario de cantos. Se conserva el arranque inicial y la carga única del auxiliar de versiones; se retira el MutationObserver global del buscador. No se cambia la lógica de búsqueda, selección, evento change ni guardado. La prueba del ciclo de montaje cubre remontaje, idempotencia, búsqueda sin acentos, teclado y notificación de cambio.

El módulo `admin-artist-profile-storage.js` se carga antes de `admin-pro.js`, se monta desde `apBindArtists` y devuelve si posee el formulario. El guardado básico solo se enlaza cuando el módulo no puede montarse; se conserva íntegro el guardado de biografía, enlaces y destacados. La normalización de descripción con bio se realiza al cargar el catálogo, no mediante observación del DOM ni mutación posterior de filas. Se prueba el montaje, idempotencia, campos, consulta de destacados, orden de carga y elección del controlador con DOM simulado. No se modifican operaciones de Supabase; la secuencia de guardado existente aún no es transaccional.

El administrador de opciones de donación (`admin-donations-plus.js`) pasa a ser propietario directo de la vista de donaciones. `apRenderView` lo monta sin crear primero el formulario básico; dicho formulario permanece como respaldo cuando no carga el módulo. Se retira el observador global, se actualiza el orden de scripts y se comprueba que la respuesta de carga no renderice una sección sustituida. Consultas, validación, guardado, visibilidad y eliminación permanecen sin cambios. Pruebas de ciclo de vida con DOM y consultas simulados; no se escriben datos reales.

Mensajes es una pestaña nativa de `apRenderShell`, conserva el ID `adminMessagesTab` para los enlaces existentes y se monta desde `apRenderView`. Se retira el observador global y se protege el renderizado frente a navegación o respuestas de carga obsoletas. Se conservan consultas, filtros, notas, estados y eliminación; no se modifican permisos ni datos. Pruebas simuladas de carga, concurrencia y errores. Se evita acoplar las pruebas de orden de scripts a la versión de caché de Admin.

Solicitar canto pasa a ser una pestaña nativa de Admin, preservando `adminRequestPageTab` y el contrato de escritura `site_content/request_song`. Su módulo monta una sección propia sin MutationObserver. Una carga tardía no reemplaza otra vista, un formulario restaurado ni texto editado; los resultados de guardado solo actualizan el formulario que los inició. Se conservan textos, campos, enlace público, restauración y operaciones de datos. Pruebas simuladas de carga, navegación, edición y errores; guardado real no ejecutado.

Mantenimiento pasa a ser una pestaña nativa de `apRenderShell`, conserva `data-jhd-audit-tab` y monta su vista desde `apRenderView`. Se retiran el observador global y la gestión duplicada del estado activo. Las 17 comprobaciones del catálogo y sus consultas de solo lectura permanecen intactas; se conservan Reanalizar, Editar cantos y Ver solicitudes. Las respuestas antiguas no pueden reemplazar otra vista ni un análisis posterior. Pruebas simuladas de diagnóstico, navegación y errores; no se ejecutó el diagnóstico sobre datos reales.

Inicio pasa a ser una pestaña nativa de Admin, en la primera posición y conservando el atributo de navegación previo. Se retiran el observador y el bloqueo global de apertura; las consultas vigentes aplican resultados únicamente a su sección y secuencia activa. Se conservan las reglas de clasificación y las operaciones de escritura, con comprobaciones de propiedad de vista antes de recargar después de guardar. Se prueban clasificación, carga, navegación, configuración faltante y errores con datos simulados; no se ejecutan escrituras reales.

Página pública (Acerca de) pasa a ser una pestaña nativa de Admin y conserva `adminPublicPagesTab` y el contrato `site_content/about`. Se elimina su observador global y se delimita cada montaje. Las respuestas de carga no sustituyen formularios editados, restaurados o abandonados. Las respuestas de guardado se aplican al formulario que las inició. Se conservan textos, campos, enlace público, restauración y escritura. Pruebas simuladas de carga, edición, restauración, navegación y errores; no se ejecutan escrituras reales.

El panel de versiones musicales se carga directamente desde admin.html y recibe el formulario e identificador del canto desde apRenderView. Se retiran la carga dinámica desde el buscador de artistas, el observador global, los eventos de captura y el temporizador de montaje. Se preservan las consultas y operaciones de relación, con protección contra respuestas de un canto anterior y remontaje del mismo canto sin consultas redundantes. Pruebas simuladas de montaje y navegación; no se ejecutan escrituras reales.

En Categorías, la limpieza del sufijo histórico `JHD_HOME_ACCESS` se realiza al generar las tarjetas y el encabezado de cantos en `categorias.js`, antes de escapar HTML. Se elimina el módulo `category-home-meta-clean.js` y su referencia HTML después de comprobar que solo Categorías lo enlazaba. La función conserva el comportamiento anterior para valores normales, metadatos malformados y textos de respaldo. No modifica descripciones almacenadas, búsquedas, conteos ni consultas. Pruebas de equivalencia y renderizado simulado; revisión visual pendiente.

El enlace Reportar detalle se genera directamente desde renderSong en cancion.js, tras renderizar los recursos. Se conserva su estructura visual, ubicación y parámetros de contacto; el enlace se actualiza en un remontaje y no se crea si la canción falla al cargar. Se retira la referencia HTML al observador song-feedback-link.js; el archivo se mantiene temporalmente hasta verificar consumidores externos o históricos. Prueba simulada de parámetros y montaje; revisión visual pendiente.

El lector público genera los encabezados de presentación, letra y recursos desde cancion.js, conservando clases, IDs, orden y textos. Recursos aparece únicamente cuando existen enlaces. Se eliminan los archivos song-overview.js y song-feedback-link.js tras comprobar referencias HTML y offline; su lógica ya reside en el lector. Prueba simulada de montaje, actualización y visibilidad; revisión visual pendiente.

El perfil público de artistas ya tiene un propietario único, `artist-page.js`. Se retiran `artist-profile-data.js` y `artist-profile-fields.js`, módulos históricos sin referencias en las 16 páginas HTML ni el servicio offline; la búsqueda de sus nombres y marcadores en el repositorio tampoco mostró consumidores. No se cambia el renderizador vigente. Se añade una regresión de carga con Supabase y DOM simulados para biografía actual y antigua, redes con protocolo permitido, orden de destacados, límite y ausencia de consultas duplicadas. La limpieza elimina código muerto, no supone una reducción de consultas en producción porque dichos archivos ya no estaban cargados.

El lector invoca explícitamente los módulos de preferencias y modo lectura tras generar controles y letra. Se eliminan ambos observadores; se conservan los eventos de desplazamiento, cambio de tamaño, botones y apertura de ajustes. La transposición guardada se restaura en el estado musical antes del primer render, no con clics simulados. El dueño del tono persiste su valor real limitado a [-11,11] para almacenamiento, manteniendo la transposición en vivo sin ese límite, como antes. Así se evita la divergencia histórica entre dos contadores al superar el límite y regresar. No cambian claves locales, CSS, impresión ni datos. Pruebas simuladas de escritorio; revisión móvil real pendiente.

Los controles públicos de práctica de Studio para Popurrís y Repertorios comparten `studio-collection-web.css`, cargado después de sus bundles. Se trasladan las declaraciones fijas del diálogo, filas y regla de impresión desde JavaScript a clases CSS, sin modificar sus valores. Se incluye la hoja en la caché pública offline y se aumenta su versión; no se cambia la caché de datos ni las apps nativas. Prueba simulada del diálogo, lanzamiento de práctica, referencias y declaraciones; cascada visual e instalación offline real pendientes.

SEO público: `seo.js` conserva los generadores de metadatos y JSON-LD. Canción, álbum y perfil de artista invocan directamente setSong/setAlbum/setArtist con sus datos ya cargados, sin extraer valores de etiquetas visuales ni observar cambios del DOM. Se retiran song-seo.js y album-seo.js y los módulos históricos artist-profile-seo.js y site-seo-static.js (sin referencias en HTML ni offline). Se incorpora SEO dinámico al perfil actual, también al álbum consultado por ID. El tono y las categorías provienen de los campos reales, no de una expresión regular sobre etiquetas mixtas. Se conserva el criterio anterior de URL canónica; se evita que DOMContentLoaded reemplace metadatos de detalle ya generados. Pruebas simuladas de metadatos y referencias; no se afirma mejora de indexación ni se verifican rastreadores reales.

Inicio genera directamente las recomendaciones automáticas y manuales en home.js; se retira home-access-control.js y su observador. La carga reutiliza las consultas de categorías, song_categories y song_artists para la sección y los contenidos recientes (7 consultas de catálogo en lugar de 10 en la carga anterior, sin contar el buscador bajo demanda). Conserva la clasificación, orden, límite, visibilidad, deduplicación, conteos y rutas finales del módulo anterior; en ausencia de conexión se usa la presentación automática. Se eliminan admin-artist-links.js y category-counts.js, desconectados del HTML y offline y reemplazados por el editor de perfil y los conteos del catálogo actuales. Se mantiene artist-discovery.js para evaluar su funcionalidad histórica de descubrimiento, que no está cargada actualmente; no se retira por la mera ausencia de referencias. Pruebas de render simulado y sintaxis; revisión real pendiente.

Inicio público y su editor administrativo comparten `home-recommendation-core.js`: clasificación del tipo y asignación de columna, sin dependencias de DOM, Supabase ni permisos. Se elimina la lógica repetida y el adaptador redundante sourceType. Se preserva la prioridad católico/cristiano, la elección manual para mixto/general, el orden, los datos y la interfaz. Pruebas de clasificación y asignación en CommonJS y contexto de navegador simulado, más regresiones de ambos consumidores. No se modifica la arquitectura de las apps nativas en esta fase.

La interacción del menú público de siete páginas (Inicio, Categorías, Canciones, Canto, Artistas, Álbumes y Donaciones) reside en `web-menu.js`. Los propietarios llaman mount en su punto original; JHD.initCommon conserva su API. El módulo mantiene aria-expanded, apertura/cierre y cierre al seleccionar enlace; WeakSet evita listeners duplicados. No cambia rutas, HTML de los menús, estilos, SEO ni datos. Se mantienen las otras páginas y site-public-nav.js fuera de este alcance hasta revisar sus funciones particulares. Pruebas de interacción simulada; comprobación visual pendiente.

El motor nativo de acordes tiene una única fuente editable: `native-chords.js`. Los archivos `mobile/src/chords.js` y `admin-mobile/src/chords.js` son salidas generadas para conservar el empaquetado independiente de cada app, sin cambiar Metro ni dependencias. Después de editar la fuente ejecutar `node scripts/build-native-chords.js` y versionar ambas salidas. La validación obligatoria `node scripts/build-native-chords.js --check` rechaza cualquier divergencia, incluso si solo cambia una copia. El algoritmo y las exportaciones son idénticos al motor anterior; la web mantiene `song-chords.js` y su prueba de paridad. Se mantienen las copias generadas en el alcance actual de JSCPD para no cambiar artificialmente la métrica; se distinguen duplicación de distribución y duplicación de mantenimiento.
