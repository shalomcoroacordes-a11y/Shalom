# SHALOM Studio — integración propuesta
Estado: núcleo inicial en rama aislada; no publicado.
## Superficies
- Web (cancion.html): opción Practicar con guitarra en acciones existentes del canto. Abrir vista independiente, no insertar un panel en la letra. En escritorio, dentro de esa vista, letra a la izquierda y guía a la derecha; en móvil, guía compacta arriba y controles reservados debajo del contenido, respetando áreas seguras.
- App pública (mobile/src/song-actions-ui.js): misma acción dentro del menú. Navegación propia, regreso nativo y restauración del scroll del canto. No modificar impresión, modo misa, favoritos ni barra global. Mostrar acción solo si hay acompañamiento publicado y compatible.
- Web Admin (admin-pro.js) y App Admin (admin-mobile): acción secundaria Configurar acompañamiento dentro de edición del canto, sin cambiar editor de letra y acordes. Leer los acordes del analizador existente. No duplicar nombres ni texto; configurar tiempos, acentos y patrones por compás/sección. Permitir borrador, vista previa y publicación explícita.
- Offline: cargar configuración publicada con el canto, no depender de red para audio ni práctica.
## Modelo inicial
studio-core.js consume filas del analizador nativo parseSong. Las posiciones de texto son independientes de los tiempos musicales. El borrador propone tiempos modificables; no debe publicarse automáticamente. Cambios a los acordes invalidan sincronización anterior. 6/8 expresa BPM en negras con puntillo. Transposición inyectada por el llamador. Los acordes de un mismo renglón tienen anclas distintas.
## Antes de publicar
Conectar adaptador del analizador web, persistencia con permisos administrativos y publicación, audio con motor y biblioteca de digitaciones (sin sustituir silenciosamente acordes desconocidos), integración de vistas y catálogo offline. Verificar los tests del núcleo, UI responsive, transposición/capo, accesibilidad, cierre y pausa al salir, navegación atrás, y sincronización. Compilar y probar Android antes de distribuir. No publicar ni migrar datos reales hasta validar el conjunto.

## Propuesta 09 — Indicaciones musicales y litúrgicas

Se editan en cada sección, eligiendo compás, acción, destinatario y detalle. El modelo canónico utiliza índice del acorde y desplazamiento musical en 24 ticks por pulso, no coordenadas visuales. Si una edición temporal dejaría una indicación fuera de su acorde o cuadrícula se rechaza hasta reubicarla. El codec v1 añade `i` opcional; los arreglos anteriores se leen sin indicaciones y no requieren migración. El reproductor muestra la indicación actual y próxima, con opción de ocultarlas, lista consultable y compatibilidad con el acompañamiento offline. Las instrucciones son visuales, no ejecutan repeticiones ni detienen el audio. Las versiones anteriores pueden leer el acompañamiento pero no preservan `i` al volver a editar/publicar: coordinar actualización de clientes administrativos antes de publicar indicaciones reales. No se modifica producción.

### Lectura normal
La proyección estática utiliza el codec canónico, valida la firma de los acordes originales y coloca las indicaciones antes del renglón anclado, incluyendo su compás del canto. No altera ni transpone las indicaciones. La web pública y Offline web usan el mismo modelo. El control de visibilidad afecta la impresión web. No se cargan motores de audio. No requiere SQL; validar la presentación en dispositivos antes de publicar.
