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
