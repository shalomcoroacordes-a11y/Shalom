# Historial de acompañamientos SHALOM Studio

## Contrato de datos

El script `sql/SHALOM_STUDIO_HISTORY.sql` añade una tabla de historial independiente de la papelera de cantos. La fila publicada sigue siendo `song_studio_arrangements`; no cambia el contrato de los clientes Android o lectores públicos. Se archiva el valor anterior cuando se sustituye o elimina un arreglo, se cambia la revisión del canto, o se elimina el canto. El contexto musical anterior se conserva cuando coincide exactamente la revisión; si no coincide, queda nulo en lugar de asociar una letra incorrecta. No hay FK en el historial: la eliminación en cascada del canto no debe destruir estas copias. Un reemplazo y una edición de canto son eventos distintos y pueden guardar el mismo arreglo más de una vez.

El registro de historial y la operación original forman una transacción. Una actualización que no cambia el arreglo ni su revisión no crea una entrada de reemplazo. El historial solo empieza al instalar esta protección; no recupera información perdida antes de la instalación. No se ha establecido una política de purga automática; evaluar crecimiento y retención con el responsable del proyecto.

## Acceso

RLS y SELECT explícito para authenticated: se exige songs.publish a través de admin_has_permission. El visitante no tiene privilegios. No se concede modificación a los clientes. Los disparadores se ejecutan mediante funciones internas en shalom_studio_private con search_path vacío y sin EXECUTE a roles cliente; no exponer este esquema en Data API. Los disparadores no necesitan identidad adicional, porque archivan las operaciones de la tabla de origen, incluidas las cascadas y el mantenimiento autorizado. No ampliar RLS de los arreglos vigentes.

## Recuperación

Consultar las filas por song_id desde una sesión administrativa autorizada y exportar JSON junto al respaldo externo. La revisión original y el contexto permiten revisar letra y acordes antes de reconstruir un arreglo. No volver a publicar un arreglo antiguo como vigente cambiando simplemente song_revision. Falta integrar la selección y recuperación manual en la interfaz y el respaldo integral versionado; esta fase conserva los datos en el servidor, no es una copia externa completa.

## Despliegue

1. Validar el workflow PostgreSQL 17 en base sintética. Confirmar estructura exacta de RBAC, songs y Studio en producción, y respaldo restaurable.
2. Autorizar explícitamente el despliegue SQL y verificar privilegios efectivos de historial, ejecución de funciones internas, RLS y lectura pública del arreglo vigente.
3. No utilizar un canto real para probar borrados. Verificar en un entorno aislado la restauración y los clientes existentes.
4. Mantener exportación de historial antes de una eventual retirada de la funcionalidad; no borrar la tabla al desactivar los disparadores.

Estado: propuesta guardada en repositorio, sin aplicar a producción.
