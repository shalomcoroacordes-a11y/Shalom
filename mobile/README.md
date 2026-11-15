# SHALOM — Aplicación nativa Android + iPhone

Esta carpeta contiene la aplicación móvil real de SHALOM con **React Native + Expo**.
No es una PWA ni depende de la caché de Chrome o Safari. Los cantos descargados
se almacenan en **SQLite**, dentro de los datos privados de la aplicación.

## Organización

- `App.js`: interfaz Android/iPhone, búsqueda, filtros, lectura y transposición.
- `src/config.js`: conexión publicable del **Supabase propio de SHALOM**.
- `src/database.js`: SQLite persistente, transacciones y última sincronización.
- `src/sync.js`: descarga paginada de las nueve tablas públicas y control Wi-Fi.
- `src/chords.js`: intérprete local de acordes y letras.
- `app.json`: identificadores nativos para Android e iPhone.
- `eas.json`: perfiles de compilación.

## Qué guarda

Todos los registros públicos de `songs`, `artists`, `categories`,
`albums`, `song_artists`, `song_categories`, `album_songs`,
`song_links` y `song_capo_versions`, incluidos textos y relaciones.

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
