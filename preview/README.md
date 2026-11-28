# SHALOM Preview (aislado)

La página utiliza el lector proporcional canónico y los archivos locales verificados de Inter. Los cantos son textos ficticios incluidos en preview.js. No conecta con Supabase, no inicia sesión, no guarda cambios, no registra un service worker ni comparte datos con la web oficial. La política CSP impide conexiones remotas.

## Construcción
Desde la raíz, ejecutar `node scripts/prepare-inter-font.js` y `node scripts/build-web-preview.js`. Servir preview-dist mediante un servidor estático (p. ej. `python3 -m http.server 8080 --directory preview-dist`). El workflow SHALOM web preview package genera el artefacto descargable.

## Publicación
Publicar únicamente preview-dist en un alojamiento estático independiente (por ejemplo un repositorio separado con GitHub Pages). No cambiar la configuración Pages de Shalom ni publicar la rama completa. No se ha configurado alojamiento público desde este PR.

## Alcance
Prueba funcional de lectura, zoom por botones, transposición, capo, comparación Courier New/Inter, navegación por secciones y simulaciones de cantos, misas, repertorios, ensayos y popurrís. Admin permite editar un borrador efímero para verificar anclajes. No es un clon completo de los flujos de administración, Studio ni sincronización.
