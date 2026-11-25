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
