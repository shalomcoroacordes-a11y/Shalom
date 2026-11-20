# Guía de desarrollo y entrega de SHALOM

Esta guía describe **cómo trabajar con el repositorio actual**. No exige mover carpetas ni cambiar la publicación existente.

## Primeros pasos

1. Clonar `shalomcoroacordes-a11y/Shalom` y abrirlo en VS Code.
2. Leer `docs/ARQUITECTURA.md` para localizar las piezas.
3. Crear una rama para cada cambio. No editar directamente la versión pública para experimentar.
4. Cambiar una sola funcionalidad y probarla antes de mezclar otras.

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
npm run test:syntax
npm test
npx expo start
```

El comando `npm test` descubre todos los archivos `mobile/tests/*.test.js` y ejecuta cada uno en un proceso de Node independiente; no hace falta editar listas al agregar pruebas. `npm run test:syntax` revisa `App.js`, `src/`, `scripts/` y `tests/`. Ambos comandos se ejecutan también en `.github/workflows/native-check.yml`. Las verificaciones automáticas no sustituyen las pruebas en un teléfono real.

- `mobile/App.js`: coordinación de pantallas, navegación y estado.
- `mobile/src/catalog.js`: relaciones y búsquedas del catálogo.
- `mobile/src/library-selectors.js`: consultas de canciones, artistas, favoritos y resultados de Inicio.
- `mobile/src/chords.js`: procesamiento de acordes.
- `mobile/src/sync.js`: descarga de datos públicos de Supabase.
- `mobile/src/database.js`: SQLite local.
- `mobile/src/file-storage.js`: respaldo privado local.
- `mobile/src/requests.js`: solicitudes de cantos/correcciones.
- `mobile/src/config.js`: URL y clave **publicable**; nunca colocar secretos.

Para obtener un APK de revisión, el workflow `.github/workflows/android-apk.yml` compila en `main` y guarda el artefacto en Actions, **sin publicar automáticamente**. Para publicar una nueva versión se debe incrementar de manera coherente `mobile/package.json.version`, `mobile/app.json.expo.version` y `android.versionCode`, ejecutar `node scripts/release-preflight.js` dentro de `mobile/`, completar las pruebas físicas y lanzar `workflow_dispatch` sobre `main` con `publish_release=true`. El workflow bloqueará un tag repetido y verificará que el certificado coincida con Android 0.4.10. Una firma diferente significa que no puede actualizarse con seguridad sin arriesgar los datos locales.

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

Consulta también `docs/LANZAMIENTO-CHECKLIST.md` para la aceptación de versiones y actualización sin pérdida de datos. Las pruebas en dispositivos reales son obligatorias.

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
