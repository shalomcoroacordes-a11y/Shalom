# Guía de desarrollo y entrega de SHALOM

Esta guía describe **cómo trabajar con el repositorio actual**. No exige mover carpetas ni cambiar la publicación existente.

## Primeros pasos

1. Clonar `shalomcoroacordes-a11y/Shalom` y abrirlo en VS Code.
2. Leer `docs/ARQUITECTURA.md` para localizar las piezas.
3. Crear una rama por bloque cohesivo de trabajo. No editar directamente la versión pública para experimentar.
4. Agrupar cambios relacionados, probar cada responsabilidad y ejecutar controles integrales al terminar el bloque.

## Sitio web

El sitio usa HTML, CSS y JavaScript en la raíz, sin paso de compilación. `index.html` es la entrada principal; `admin.html` es la entrada del administrador. Los archivos `*.html` cargan scripts mediante etiquetas `script` y hojas CSS mediante `link`.

Para modificar una página:
- Buscar su archivo `.html`.
- Revisar **todos** los `script src` y `link href` de esa página.
- Revisar las funciones que utiliza el script y su dependencia de variables globales.
- Mantener el orden de carga y las rutas relativas.
- Abrir y probar la página, incluida la navegación en móvil.

GitHub Pages publica actualmente desde la raíz. Mover HTML/CSS/JS a `web/` requiere adaptar el despliegue primero.

## Aplicación Android

Requiere Node.js 22 o compatible con el SDK Expo configurado.

```bash
cd mobile
npm install
npx expo install --check
node tests/chords.test.js
node tests/catalog.test.js
node tests/requests.test.js
node tests/medleys.test.js
npx expo start
```

- `mobile/App.js`: interfaz, pantallas, navegación y estado.
- `mobile/src/catalog.js`: relaciones y búsquedas del catálogo.
- `mobile/src/chords.js`: procesamiento de acordes.
- `mobile/src/sync.js`: descarga de datos públicos de Supabase.
- `mobile/src/database.js`: SQLite local.
- `mobile/src/file-storage.js`: respaldo privado local.
- `mobile/src/requests.js`: solicitudes de cantos/correcciones.
- `mobile/src/config.js`: URL y clave **publicable**; nunca colocar secretos.

Para publicar Android, actualizar de forma coherente `mobile/package.json` (`version`) y `mobile/app.json` (`version` y `android.versionCode`). El workflow `.github/workflows/android-apk.yml` publica la APK oficial únicamente mediante ejecución manual desde `main` con `publish_official` confirmado. Para pruebas sin publicación utilizar `android-preview.yml` o `android-upgrade-rehearsal.yml`. No afirmar que un APK está listo hasta verificar que el workflow terminó y que existe el archivo en la versión publicada.

## Pruebas web

GitHub ejecuta `.github/workflows/public-quality.yml` con:
- Sintaxis de JavaScript.
- Pruebas de guardado del administrador.
- Pestañas administrativas.
- Repertorios de misa y ensayo.
- Verificación de recursos locales en HTML.
- Verificación de la cadena de carga de Supabase.
- Búsqueda básica de secretos privados.

Localmente, con Node.js y Python:

```bash
node tests/admin-save-regression.cjs
node tests/admin-tabs-regression.cjs
node tests/repertoires-regression.cjs
```

Para la verificación completa de HTML y rutas, usar el workflow de GitHub Actions (no sustituirlo solo con las tres pruebas).

## Supabase y cambios en la base de datos

- El administrador requiere autenticación y políticas RLS.
- La app descarga **11 tablas** listadas en `mobile/src/config.js`: canciones, artistas, categorías, álbumes, relaciones, enlaces, versiones con capo, popurrís y repertorios.
- Los SQL actuales están en la raíz y **no constituyen aún un historial ordenado de migraciones**.
- Antes de ejecutar un SQL, verificar qué objetos existen, qué cambios ya se aplicaron, sus dependencias y un respaldo. No ejecutar todos los archivos SQL por orden alfabético.
- No publicar claves privadas, tokens ni datos de usuarios.

## Antes de aceptar una modificación

- [ ] La funcionalidad anterior sigue operando.
- [ ] No cambian inesperadamente URLs públicas ni nombres de tablas.
- [ ] Los cantos, acordes, capo y transposición siguen funcionando.
- [ ] Los repertorios y popurrís se leen completos, sin autodesplazamiento.
- [ ] Los permisos de administrador siguen restringidos.
- [ ] La app puede leer datos descargados sin conexión.
- [ ] Pasan los workflows aplicables.
- [ ] La documentación refleja el cambio.

## Si algo falla

1. No eliminar datos de Supabase ni desinstalar la app como primer intento.
2. Consultar el commit y workflow que introdujeron el cambio.
3. Comparar con la última versión funcional.
4. Revertir solo el cambio problemático o restaurar una versión verificada.
5. Documentar la causa y agregar una prueba cuando sea posible.

## Flujo de entrega por bloques

1. Inventario de responsabilidades, dependencias y pruebas; definir qué se conserva y qué se retira.
2. Desarrollo en rama: una revisión coherente puede incluir varios archivos y pruebas, sin mezclar migraciones de producción ni cambios de identidad de APK.
3. Pruebas rápidas durante el desarrollo; al cerrar el bloque ejecutar los workflows aplicables y revisar el commit exacto. Los informes no se trasladan a commits posteriores sin validación.
4. Consolidación con comparación contra main. No reenviar una fusión que agotó el tiempo de respuesta sin verificar primero el historial. Cerrar solicitudes redundantes solo si su historial está integrado.
5. Las APK de preview y de ensayo son artefactos temporales. Revisar los workflows de publicación antes de fusionar cambios: Admin y Pública requieren autorización manual explícita desde main para publicar APK oficial; los pushes y PR no publican. Admin sigue compilando el paquete preview cuando no se autoriza publicación. El ensayo de actualización exige certificado, paquete y versionCode compatibles y prueba en emulador.

### Caché de dependencias

Los workflows de pruebas nativas, preview público, ensayo de actualización y Admin recuperan descargas de npm (Node 22) y Gradle (Java 17, solo módulos y distribuciones) con claves separadas por aplicación y manifiestos. No se almacenan node_modules, APK, claves, datos de usuarios ni resultados de pruebas. Se mantiene npm install y Gradle completos; no se usa modo offline forzado. El primer build puede no mejorar y la caché puede faltar o quedar invalidada. Medir tiempos reales antes de atribuir mejoras.

Actualmente no hay package-lock.json versionado para las dos aplicaciones. La caché de descargas no garantiza reproducibilidad: incorporar lockfiles requiere generar y verificar ambos árboles de dependencias y compatibilidad Expo en otro bloque, antes de migrar a npm ci. No introducir lockfiles ficticios ni cambiar las versiones para sortear problemas de red.

### Autorización de APK oficiales

Después de validar CI, las migraciones necesarias, el respaldo y la versión, ir a Actions, elegir el workflow oficial de Pública o Admin, seleccionar `main` y marcar `publish_official` solo para un lanzamiento autorizado. En Pública, cualquier otra ejecución omite la tarea oficial; en Admin se conserva el flujo de prueba con paquete `.preview`. No ejecutar desde ramas de integración. Los controles de versión, certificado, emulador y prohibición de sobrescribir un Release permanecen obligatorios. Esto no modifica la publicación web de GitHub Pages desde main.

### Generación y verificación de lockfiles nativos

El workflow `native-dependency-locks.yml` resuelve por separado los manifiestos de Pública y Admin en Node 22. Si existe un lockfile, lo conserva y lo verifica. Si no existe, genera un candidato auténtico desde npm sin ejecutar scripts de instalación durante la resolución. Después valida identidad del manifiesto, origen e integridad de paquetes, ejecuta `npm ci`, compatibilidad Expo, sintaxis y pruebas, y comprueba que el lock no cambió. Los candidatos y su procedencia se conservan como artefactos temporales, sin permisos de escritura en GitHub ni publicaciones.

No se considera completada la transición hasta recuperar ambos artefactos verificados, revisarlos, versionar los dos lockfiles y repetir las pruebas de compilación y actualización con `npm ci` en todos los workflows relevantes. No cambiar los manifiestos para lograr una validación verde sin investigar la causa.
