# SHALOM Preview (aislado)

La página utiliza el lector proporcional canónico y los archivos locales verificados de Inter. Los cantos son textos ficticios incluidos en preview.js. No conecta con Supabase, no inicia sesión, no guarda cambios, no registra un service worker ni comparte datos con la web oficial. La política CSP impide conexiones remotas.

## Construcción
Desde la raíz, ejecutar `node scripts/prepare-inter-font.js` y `node scripts/build-web-preview.js`. Servir preview-dist mediante un servidor estático (p. ej. `python3 -m http.server 8080 --directory preview-dist`). El workflow SHALOM web preview package genera el artefacto descargable.

## Publicación
Publicar únicamente preview-dist en un alojamiento estático independiente (por ejemplo un repositorio separado con GitHub Pages). No cambiar la configuración Pages de Shalom ni publicar la rama completa. No se ha configurado alojamiento público desde este PR.

## Alcance
Prueba funcional de lectura, zoom por botones y pellizco, transposición, capo, comparación Courier New/Inter, navegación por secciones y simulaciones de cantos, misas, repertorios, ensayos y popurrís. Admin permite editar un borrador efímero para verificar anclajes. No es un clon completo de los flujos de administración, Studio ni sincronización.

### Configuración de un proyecto Vercel separado
Importar el repositorio en un proyecto nuevo, no en el proyecto oficial. Elegir la rama `design/inter-music-reader` como rama de producción de ese proyecto de pruebas, Framework Preset `Other`, Root Directory `.`, Build Command `node scripts/prepare-inter-font.js && node scripts/build-web-preview.js`, Output Directory `preview-dist`. No agregar variables de Supabase ni secretos. Verificar la dirección nueva antes de compartirla; no modificar el dominio ni el proyecto oficial.
