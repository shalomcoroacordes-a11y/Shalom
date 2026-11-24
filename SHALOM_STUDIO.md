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
