# SHALOM — Aplicación nativa Android + iPhone

Esta carpeta contiene la aplicación móvil real de SHALOM con **React Native + Expo**.
No es una PWA ni depende de la caché de Chrome o Safari. Los cantos descargados
se almacenan en **SQLite**, dentro de los datos privados de la aplicación.

## Organización

- `App.js`: interfaz Android/iPhone, búsqueda, filtros, lectura y transposición.
- `src/config.js`: conexión publicable del **Supabase propio de SHALOM**.
- `src/database.js`: SQLite persistente, transacciones y última sincronización.
- `src/sync.js`: descarga paginada de las once tablas públicas y control Wi-Fi.
- `src/chords.js`: intérprete local de acordes y letras.
- `app.json`: identificadores nativos para Android e iPhone.
- `eas.json`: perfiles de compilación.

## Qué guarda

Todos los registros públicos de `songs`, `artists`, `categories`,
`albums`, `song_artists`, `song_categories`, `album_songs`,
`song_links`, `song_capo_versions`, `medleys` y `repertoires`, incluidos textos y relaciones.

**No guarda** contraseñas, sesiones de administradores ni claves privadas.
No descarga todavía las imágenes binarias ni vídeos externos; sus referencias
se conservan en la base local, pero esos recursos requieren conexión.

La aplicación lee solo información pública autorizada por RLS. No edita
Supabase ni necesita acceso de administrador.

## Sincronización

1. Al ejecutar **Descargar cancionero**, consulta todas las páginas de cada tabla.
2. Prepara la copia completa antes de escribirla.
3. Graba todos los datos en una sola transacción SQLite; un fallo conserva la
   última descarga buena.
4. Al abrir la app o volver a primer plano, si han pasado 20 minutos desde
   la última descarga, intenta sincronizar preferentemente por Wi-Fi.
5. Si la red es celular y la preferencia Wi-Fi está activada, solicita
   confirmación antes de una descarga manual.

**Limitación:** el sistema operativo puede restringir las tareas con la app
cerrada. En esta versión se sincroniza al abrirla, al recuperar primer plano
o al detectarse la red compatible. SQLite persiste entre reinicios normales,
pero desinstalar la app o borrar sus datos elimina la copia del dispositivo.

## Desarrollo y pruebas

Requiere Node.js >= 22.13 y una cuenta de Expo.

```bash
cd mobile
npm install
npx expo install --check
npx expo start
```

Para probar en dispositivos, utiliza Expo Go (para módulos incluidos en Expo Go)
o una compilación de desarrollo.

## Generar apps instalables con EAS Build

Entra con una cuenta propia de Expo y configura el proyecto:

```bash
cd mobile
npx eas-cli login
npx eas-cli build:configure
```

Android, prueba directa mediante un **APK**:

```bash
npx eas-cli build --platform android --profile preview
```

iPhone requiere el aprovisionamiento de Apple correspondiente.
Con cuenta de Apple Developer, una compilación iOS de prueba:

```bash
npx eas-cli build --platform ios --profile preview
```

Para distribución general, usar los perfiles de producción y las tiendas
correspondientes. La compilación y firma necesitan credenciales del propietario.
No compartas contraseñas, tokens Expo ni certificados en chats o commits.

Antes de publicar a terceros: probar descarga completa por Wi-Fi, modo avión,
reinicio de la app, guardado tras actualización fallida, límites de almacenamiento,
estilos en iPhone/Android y transposición.

## Independencia

Solo se comunica con `ehpvsasyzlrlypjjpzuk` (**SHALOM**).
No modifica ni utiliza el proyecto Juntos Hacia Dios.


## Portadas personales Android 0.3.9

- **Mis colecciones** ahora usa tarjetas visuales de dos columnas con portadas, detalles de color y una galería de inspiración sin mostrar cantos ficticios.
- En **Crear colección** y **Personalizar**, el usuario selecciona uno de ocho fondos prediseñados o una foto de la galería de Android. Puede cambiar la paleta de colores y la portada sin perder sus misas ni popurrís.
- Las imágenes personales se convierten en miniaturas JPEG y se copian a **Documentos privados de SHALOM**, nunca a Supabase Storage ni GitHub. Solo se guarda el nombre del archivo en las preferencias locales.
- Las colecciones que existían en 0.3.8 conservan sus misas y popurrís y reciben una portada prediseñada por defecto. **No borrar los datos de Android** al actualizar.
- Al desinstalar se eliminan los documentos privados. Las fotografías de portada **no se incluyen en los códigos SHALOM1-**; los códigos solo transfieren las referencias musicales.

## Mis colecciones privadas: misas y popurrís flexibles

- Desde **Más > Mis colecciones** se crean carpetas personales con color.
- Dentro de cada carpeta se crean misas y popurrís utilizando **únicamente referencias** a los cantos públicos de SHALOM.
- Cada fragmento puede seleccionar una estrofa/coro existente, tono local (±11 semitonos), posición en la lista y, en misas, momento litúrgico. Un canto puede repetirse en distintos fragmentos.
- El lector muestra las partes consecutivamente sin modificar el original.
- Compartir utiliza un **código SHALOM1-...** mediante el menú nativo de Android (WhatsApp, etc.). El destinatario copia y pega el mensaje en **Importar código**. El código contiene IDs, secciones, orden, tonos y momentos; **no contiene letras ni acordes**.
- Importar valida el identificador SHALOM, versión, checksum, límites y estructura. Si faltan cantos o cambian sus secciones, la app lo avisa en lugar de inventar letras.
- Carpeta, misa, popurrí y código se gestionan **en almacenamiento privado del teléfono** usando la misma preferencia local SQLite/archivo que ya usa la aplicación. **No hay escrituras a Supabase**.
- Los códigos pueden generarse sin conexión; para enviarlos por WhatsApp se requiere conexión cuando WhatsApp lo necesite. El destinatario debe tener la app y los cantos públicos descargados.
- **Importante:** desinstalar o borrar los datos de la app elimina estas colecciones. Compartir códigos sirve para intercambiar composiciones; no es un respaldo completo automático de todas las carpetas.


## Versión 0.4.0 — Perfil personal y banner editable

- La quinta pestaña de Android es **Perfil**. El menú **⋯ > Editar perfil** permite cambiar nombre, subtítulo, foto circular y portada de perfil usando la galería del teléfono.
- Desde el mismo editor se configura una imagen **independiente** para el destacado de Inicio, un título y el botón: Explorar cantos / Ver repertorios / Continuar leyendo / Mis me gusta / Mis popurrís.
- Foto, portada y banner se guardan como JPEG privados en el teléfono. El perfil y sus rutas se almacenan en preferencias locales; **no hay escrituras a Supabase**.
- Perfil muestra **cantidades reales** de Mis me gusta, misas, popurrís y colecciones locales, además de favoritos y accesos para abrirlos. No se muestran seguidores ni reproducciones ficticios.
- Canciones y repertorios usan recuadros con iniciales y colores deterministas en vez de fotografías. Artistas muestra tarjetas en **dos columnas**, con nombre/tipo/cantidad real de cantos.
- Mis colecciones, lectores, acordes, códigos SHALOM1 y álbumes/categorías permanecen accesibles. Las colecciones de Android 0.3.8 y 0.3.9 no se migran a Supabase.
- Para no perder datos locales, actualizar la APK encima de la versión anterior **sin desinstalar**. La galería y las fotos deben probarse en un dispositivo real.


## SHALOM Android 0.4.2 — Avisos con deshacer y respaldo personal

- Al marcar o quitar un canto de **Mis me gusta**, guardar el perfil, crear una colección, renombrar o agregar un canto a una composición personal, aparece un aviso pequeño con botón **Deshacer** durante aproximadamente cinco segundos. No modifica la apariencia del lector de letras/acordes.
- **Más > Respaldo personal** o **Perfil > ⋯ > Respaldo y restauración** abre la pantalla para exportar o importar.
- **Exportar** genera un único archivo `SHALOM-respaldo-AAAA-MM-DD.shalom.json` con perfil, foto, portada, banner, favoritos, repertorios/misas/popurrís personales, colecciones, estrofas, tonos, orden y último canto consultado. Las fotografías se incluyen como datos JPEG reales y no solo como rutas del teléfono.
- El archivo se crea localmente y abre el selector de compartir de Android, para que el usuario **elija dónde guardarlo**. SHALOM no lo sube a Supabase, GitHub ni a ningún servidor; enviarlo a otra aplicación mediante compartir queda bajo decisión del usuario.
- **Importar** usa el selector de archivos de Android. Primero valida formato, versión, tamaño, integridad, IDs y todas las fotos. Muestra un resumen y pide confirmación antes de **reemplazar** los datos personales existentes. Guarda las fotografías reconstruidas en el directorio privado y solo entonces cambia las preferencias; si falla una escritura intenta recuperar las preferencias anteriores.
- Los cantos y repertorios **oficiales** publicados no se exportan ni se modifican; en un teléfono nuevo deben descargarse de SHALOM.
- **Privacidad:** el archivo JSON no está cifrado; puede contener fotografías y nombres personales. No compartir públicamente. Límite aproximado: 42 MB por respaldo. La opción Deshacer se aplica a cambios rápidos, no a una restauración completa.
- **Actualización:** instalar 0.4.2 sobre la APK anterior sin desinstalar, para conservar el almacenamiento local y las portadas ya existentes.


## SHALOM Android 0.4.3 — Canciones/Artistas y acordes idénticos al administrador

- **Canciones y Artistas** usan el mismo estilo: banner ilustrado verde, búsqueda visible, filtros redondeados y tarjetas con proporciones, color y espaciado coherentes.
- Canciones mantiene **iniciales de colores (sin falsas fotografías)**, favoritas reales en carrusel horizontal, contadores del catálogo y acceso a **Me gusta** y al panel de **⋮** directamente desde cada lista.
- Artistas conserva la **doble columna** con avatares circulares: muestra foto real cuando el catálogo proporciona un enlace válido y usa iniciales si no existe.
- El lector de canción incorpora **tipo, título, tono y letra/acordes en panel oscuro**, inspirándose en la vista previa del administrador sin añadir editores.
- **Alineación reparada:** `mobile/src/chords.js` reproduce las mismas reglas de parseo que `song-chords.js` de la web/admin, conserva las columnas y espacios originales y los transpone sin alterar las posiciones iniciales.
- Android muestra la línea de acordes y la línea de letra en **el mismo componente de texto monoespaciado**, con tamaño y espaciado iguales, sin autoescalado y con espacios no separables. Las líneas largas se desplazan horizontalmente en vez de reacomodarse.
- El mismo renderizador se reutiliza para **Cantos, Misas, Repertorios y Popurrís**; la impresión y los códigos de composición siguen usando el texto original.
- Pruebas nuevas comparan casos reales de estrofas, coros, saltos de línea y cambios de tono con el parser de la propia web/admin.
- **Actualizar sin desinstalar**, para conservar perfil, fotografías, favoritos y colecciones privadas.


## SHALOM Android 0.4.4 — Corrección física de columnas de acordes

- La versión anterior 0.4.3 ya comparaba el **texto** del parser con el administrador, pero Android podía medir espacios y espacios no separables de manera distinta a letras. Como resultado, el acorde D podía verse demasiado a la izquierda en «Ahí en la Eucaristía» aunque tuviese el índice correcto.
- Ahora `src/chord-grid.js` extrae la **columna exacta de cada acorde y palabra** directamente de las cadenas originales; `src/aligned-score-ui.js` coloca cada token con una coordenada horizontal `columna × ancho real de celda`.
- Cada dispositivo **mide una muestra corta de caracteres de la misma fuente monoespaciada** y aplica una única cuadrícula para acordes y letra. No se dibujan espacios NBSP cuya anchura pueda variar o que Android pueda comprimir.
- Este render se utiliza en canciones, misas, repertorios y popurrís. Respeta transposición, tipos de sección y desplazamiento horizontal de líneas largas.
- Se preserva la interacción del lector, incluyendo tamaño de letra, impresión, compartir, Me gusta y el botón nativo de regresar.
- Las pruebas comparan posiciones de columnas concretas del ejemplo «Ahí en la Eucaristía», además de anchuras calibradas y tamaños distintos.
- **Actualizar encima de la versión anterior sin desinstalar**: los datos personales permanecen privados en el teléfono.


## SHALOM Android 0.4.5 — Letra continua como en la web

En 0.4.4 los acordes y palabras se dividían en tokens colocados de forma absoluta a partir de una medición aproximada; esto generaba espacios muy exagerados y una lectura entrecortada. La web pública y el administrador, en cambio, dibujan cada línea **completa** con una fuente monoespaciada y `white-space: pre`.

- Reemplazado el posicionamiento individual de palabras/acordes por **un renglón completo de texto** para cada línea de letra y cada línea de acordes, sin alterar espacios ni columnas del editor.
- Acordes y letra usan **exactamente la misma fuente, tamaño, peso y espaciado**; solo cambia el color. Ya no hay mediciones independientes de posiciones, conversión a espacios no separables ni separación artificial de palabras.
- Interlineado compacto como en la web (1.22), espaciado de 3 puntos entre parejas de acordes/letra y tamaño de letra inicial de 15 puntos; los controles de aumento/disminución siguen disponibles.
- Cada línea sigue sin saltos automáticos, con desplazamiento horizontal si es más larga que la pantalla.
- Se utiliza el mismo componente para cantos, misas, repertorios y popurrís; no se modifican las letras, los acordes guardados ni Supabase.
- Tests de regresión comprueban que nunca se dividan las palabras, se preserve la cadena íntegra y que Android lea las mismas parejas que el parser web.
- Instalar esta APK encima de la anterior, **sin desinstalar** para conservar favoritos, fotografías y colecciones personales.


## SHALOM Android 0.4.6 — Misma tipografía y posición que la web

La 0.4.5 dibujaba renglones completos en React Native, pero Android aún alteraba la separación entre las letras y los acordes respecto al navegador. Tras comparar capturas reales, **el bloque de cantos se renderiza con Chromium local dentro de la app**, utilizando las mismas reglas de `song-chords.css` de la web: Courier New, `white-space: pre`, `line-height: 1.22`, sin ligaduras y con los mismos colores.

- **Sin internet:** el bloque HTML se genera a partir de las letras/acordes ya descargados; no visita una URL ni consulta el servidor. CSP restringe recursos remotos.
- **Posiciones:** reutiliza `parseSong`, que ya se verifica contra el parser real de web/admin; ahora se dibuja con el mismo motor de texto de navegador, no con React Native Text ni coordenadas estimadas.
- **Lectura limpia:** renglones completos, espacios originales, saltos de línea, etiquetas de estrofas/coros y desplazamiento horizontal propio del bloque.
- **Integración:** la vista calcula su altura y deja el desplazamiento vertical a la pantalla Android; tamaño de letra, tono, capo, imprimir, compartir y navegación permanecen nativos.
- **Respaldo:** si un dispositivo no puede abrir el motor embebido, muestra la lectura nativa anterior en lugar de quedar en blanco.
- La solución se reutiliza en Canciones, Misas, Repertorios y Popurrís, sin modificar los cantos del administrador ni Supabase.
- Se añadieron pruebas que comparan **el HTML completo de pares acorde/letra** contra el intérprete de la web en distintos tonos y tamaños.
- **Actualiza encima de la versión instalada sin desinstalar**, para conservar fotos, perfil, colecciones y favoritos.


## SHALOM 0.4.7 — Lectura sin caja y sin recorte

- Eliminada la tarjeta azul alrededor de letra y acordes: sin borde, esquinas, recorte ni acolchado lateral.
- El lector WebView local se integra con el mismo fondo oscuro (#0e1219) del resto de SHALOM y aprovecha el ancho de la pantalla.
- Se conservan las reglas de tipografía de la web: espacios originales, acordes alineados por columnas, tamaño ajustable y desplazamiento horizontal si hace falta.
- Los controles de tono, capo, imprimir, compartir y YouTube permanecen igual. No se modifica el catálogo ni Supabase.
- Nueva prueba de regresión para evitar que regrese un contenedor que recorte o tape las líneas.
- Instalar la APK encima de la anterior, sin desinstalar, para mantener los favoritos y colecciones locales.


## SHALOM Android 0.4.8 — Perfil y Mis creaciones simplificados

- **Mi perfil** muestra accesos directos **Crear misa**, **Crear repertorio**, **Crear popurrí** y **Recibir composición**, además de las creaciones personales recientes que abren con un toque.
- **No es necesario crear una colección antes de empezar.** La acción Crear pide nombre, ofrece una carpeta opcional y, si no se elige ninguna, usa/crea **Mis creaciones** de forma transparente.
- **Mis creaciones** es una biblioteca de composiciones plana con filtros por tipo. Las carpetas originales y sus portadas siguen disponibles desde **Organizar por carpetas**; no hay migración, eliminación ni cambio de IDs.
- El editor destaca **Añadir canto**, el orden y la lectura. Los controles avanzados de estrofas, tono y momento de misa aparecen al tocar **Ajustar** en un canto concreto.
- **Compartir** abre una pantalla clara con **Enviar por WhatsApp u otra app** y **Copiar mensaje**. El destinatario usa **Perfil → Recibir composición → Pegar desde el portapapeles → Revisar → Guardar en mi teléfono**.
- El código existente **SHALOM1-...** se conserva: incluye referencias a cantos, orden, estrofas y transposición, no fotos ni letras completas. Puede importarse sin login, aunque hace falta tener descargados los cantos para leerlos.
- **Privacidad:** todas las composiciones y carpetas se conservan en SQLite local; ningún cambio modifica Supabase ni el cancionero oficial. Los respaldos y Mis me gusta anteriores se mantienen.
- El botón nativo Regresar recorre Crear/Editar/Leer/Compartir/Recibir y vuelve a Mis creaciones o la carpeta correcta.
- Instalar la nueva APK **encima de la anterior sin desinstalar** para preservar los datos locales.


## SHALOM Android 0.4.9 — Accesos minimalistas + Hoy en SHALOM

- Los cuatro accesos de Inicio (Mis me gusta, Mis popurrís, Mis misas y Mis creaciones) usan tarjetas **2×2** minimalistas con degradado verde/azul oscuro, sin portadas ilustradas detrás del texto, con un icono pequeño, título, subtítulo y **contador real**.
- Los números proceden **únicamente de los datos privados locales**: favoritos, popurrís, misas y total de composiciones. No mezclan las publicaciones oficiales del administrador.
- Debajo aparece **Hoy en SHALOM**, una sección con lo que el coro haya **publicado desde el administrador**: la misa o ensayo de hoy/próximo y el popurrí publicado más reciente. Tocar un elemento abre directamente su lector oficial (no una copia personal).
- Los elementos no publicados, incompletos o con fecha pasada no se anuncian como misa de hoy ni se muestran como eventos próximos. Si no hay publicaciones, aparece un mensaje explicativo, sin contenido inventado.
- El botón **↻ Actualizar** vuelve a descargar el catálogo y sus publicaciones oficiales. Las últimas descargas permanecen disponibles sin conexión; la actualización requiere internet.
- En el administrador de repertorios y popurrís se explica que marcar **Publicar** permite que aparezcan automáticamente en esta sección. No se añadió un segundo flujo de subida ni se cambiaron las tablas de Supabase.
- Se conserva Destacado con el banner personal, el buscador, Mis me gusta y el resto de Inicio; no cambia el lector de acordes.
- Instalar la APK encima de la versión anterior, sin desinstalar, para conservar imágenes, perfil y colecciones locales.


## SHALOM Android 0.4.10 — Perfil siempre abre en modo lectura

En 0.4.8/0.4.9, después de usar «Editar perfil» una vez, la señal de edición persistía en el estado de navegación. Cada remontaje de la pantalla Perfil interpretaba la señal anterior como si el usuario hubiera pulsado «Editar perfil» de nuevo.

- **Corregido:** las solicitudes de edición de los tres puntos se consumen una sola vez inmediatamente después de abrir el editor.
- Al salir de Perfil, también se elimina cualquier solicitud de edición pendiente.
- **Guardar cambios**, **Cancelar** y el regreso nativo cierran el editor; al volver desde otra sección aparece Mi perfil normal, con su portada, foto y contenido.
- Cancelar descarta el borrador sin guardar. Guardar conserva el perfil en SQLite privado del teléfono, como antes.
- Test de regresión en \`mobile/tests/local-profile.test.js\` verifica que la señal se consume, se limpia al cambiar de pestaña y que el editor solo se solicita desde los tres puntos.
- Incluye el Inicio 2×2 con contadores y «Hoy en SHALOM» introducido en 0.4.9.
- Instalar encima de la aplicación anterior sin desinstalar para mantener fotos, portada, misas, popurrís, favoritos y colecciones.
