# Auditoría inicial de archivos y automatizaciones

Fecha de revisión: 2026-11-17. Esta es una **auditoría estática parcial**: se revisaron nombres y archivos específicos del repositorio, no se ha probado cada función en un dispositivo ni se ha demostrado qué scripts pueden eliminarse.

## Entradas y dependencias

El sitio tiene 15 entradas HTML en la raíz:

`acerca.html`, `admin.html`, `albumes.html`, `artista.html`, `artistas.html`, `cancion.html`, `canciones.html`, `categorias.html`, `contacto.html`, `donaciones.html`, `index.html`, `offline.html`, `popurris.html`, `repertorios.html` y `solicitar-canto.html`.

**Ejemplo: `index.html`** carga `style.css`, `public-accessibility.css`, `card-polish.css`, `home-access-control.css`; y los scripts Supabase SDK, `Supabase.js`, `seo.js`, `public-core.js`, `home.js` y `home-access-control.js`.

**Ejemplo: `admin.html`** carga `style.css` y varias hojas administrativas; también carga numerosos scripts, incluidos `admin-auth-controller.js`, `admin-pro.js`, `admin-medleys.js`, `admin-repertoires.js`, `admin-search-fix.js`, `admin-category-save-fix.js`, `admin-backup.js` y `admin-backup-import.js`.

**Conclusión:** los scripts con nombre `fix` siguen estando referenciados en HTML. **No son candidatos seguros a borrado por su nombre.** Antes de consolidar, mapear funciones exportadas/globales y los eventos DOM que registran.

## Workflows de GitHub Actions

| Workflow | Función observada | Acción recomendada |
| --- | --- | --- |
| `android-apk.yml` | Compila APK desde `mobile/**` y publica `android-v<version>` | **Mantener**; flujo Android principal |
| `native-check.yml` | Comprueba dependencias Expo y ejecuta cuatro pruebas Android | **Mantener** |
| `public-quality.yml` | Sintaxis JS, pruebas web, recursos HTML y control básico de secretos | **Mantener** |
| `publish-android-apk.yml` | Publicación histórica 0.1.0 desde run fijo `43674008302` | Revisar desactivación tras comprobar historial |
| `publish-shalom-icon.yml` | Publicación histórica 0.1.1 desde run fijo `43676615936` | Revisar desactivación tras comprobar historial |
| `publish-shalom-v2.yml` | Publicación histórica 0.2.0 desde run fijo `43678905684` | Revisar desactivación tras comprobar historial |

**Riesgo concreto:** los tres workflows históricos tienen `workflow_dispatch` y referencias a runs/etiquetas antiguas; ejecutarlos manualmente no construye la versión actual. No se han borrado porque conviene conservar trazabilidad y comprobar si hay dependencias externas.

## Documentación móvil desactualizada detectada

`mobile/README.md` describía nueve tablas. El archivo real `mobile/src/config.js` lista **11** (incluye `medleys` y `repertoires`). Se corrigió el README para que coincida con la configuración.

## Reglas para decidir si eliminar un archivo

1. Comprobar si aparece en HTML, importaciones, `require`, workflows, rutas, CSS, Service Worker o documentación.
2. Comprobar si declara variables globales usadas indirectamente.
3. Confirmar que las pruebas existentes pasan **antes y después**.
4. Revisar el funcionamiento manual en páginas críticas y móvil.
5. Retirar en rama/PR reversible, nunca mediante borrado masivo sin verificación.

## Pendiente para completar esta auditoría

- Inventario automático exhaustivo de enlaces HTML → JS/CSS y dependencias de ejecución.
- Búsqueda de referencias dinámicas a nombres de archivo.
- Mapa de scripts globales y duplicación de lógica.
- Revisión de todas las hojas CSS y reglas sobreescritas.
- Verificación de los SQL ejecutados en Supabase y políticas RLS actuales.
- Comprobación de cada workflow, de su última ejecución y sus permisos.
- Cobertura adicional de pruebas para las pantallas y el administrador.

**Resultado actual:** se identificaron zonas prioritarias; no se ha confirmado ningún archivo como seguro para eliminar.
