# Indicaciones y opciones por aparición de canto

Tres niveles independientes: canto original (Studio), colección oficial (JSON de cada item/parte), colección personal (almacenamiento local). El objeto opcional `cue_override` oficial y `cueOverride` personal utiliza `{v:1, mode:"append"|"replace"|"hide", j:[...]}`. Ausencia = heredar; restablecer = quitar personalización. Los anclajes son relativos al fragmento mostrado.

## Implementación candidata

- Lectores Android y web con capo por aparición, menú contextual y proyección de indicaciones.
- Admin Android y web con edición de indicaciones y capos en la colección, sin escribir el canto original.
- Colecciones personales Android con editor y guardado local, copia de oficiales, impresión contextual y códigos compartidos.
- Los códigos SHALOM1 siguen admitidos. SHALOM2 incluye notas, capos e indicaciones y puede contener las frases seleccionadas (anclajes), sin fotos. Las versiones antiguas no importan SHALOM2.
- El límite de 9000 bytes del código permanece. Si se supera, no se recortan personalizaciones: el respaldo completo es una alternativa para conservar datos (restaurar sustituye los datos personales del receptor, no equivale a importar una composición).
- La copia de popurrís editados o ambiguos conserva una instantánea local de la letra y acordes exactos, con un título y las personalizaciones. No sincroniza acompañamiento de un fragmento no coincidente. SHALOM2 y respaldo conservan la instantánea; cambiarla por una sección del original requiere confirmación y restablece sus indicaciones. Las listas de más de 30 apariciones aún se rechazan explícitamente.
- El respaldo conserva las personalizaciones en Android actualizado. No restaurar en clientes anteriores que no reconocen los nuevos campos.
- Pública web tiene menú de acciones compatible con el navegador; las colecciones personales siguen siendo locales de Android.

## Validación antes de liberar

Pruebas automatizadas de persistencia y restauración, SHALOM1/2, proyección sin conexión, impresión, apariciones repetidas y anclajes desactualizados. Confirmar todas las comprobaciones CI y realizar pruebas reales de dispositivo, incluida actualización sobre la versión oficial. No publicar hasta integrar PR #133 y validar ambos clientes. No cambiar Supabase en esta fase.
