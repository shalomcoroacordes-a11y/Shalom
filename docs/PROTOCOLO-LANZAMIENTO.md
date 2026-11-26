# SHALOM — protocolo de cierre y lanzamiento

## Estado y alcance

El candidato integral es [PR #97](https://github.com/shalomcoroacordes-a11y/Shalom/pull/97), en `integration/shalom-release-candidate`. Este documento define criterios de aceptación; no es una autorización ni evidencia de un lanzamiento. Las revisiones #120–122 aprobaron sus controles individuales (9/9, 9/9, 6/6); #123 aprobó 6/6 después de corregir una expectativa de prueba; #124 aprobó verificación de lockfiles, con otras pruebas pendientes al redactar. Verificar cada estado contra el SHA vigente. No marcar como hecho un paso por el mero hecho de que exista su código.

Versiones declaradas al redactar: Pública 0.4.24 (versionCode 47), Admin 0.1.6 (versionCode 7). Son valores del código, no una comprobación de la última release. No reservar una versión nueva hasta contrastar las releases y certificados vigentes. No modificar Juntos Hacia Dios.

## Puerta 1 — Candidato exacto

- [ ] Registrar SHA, SHA de main y comparación sin commits por detrás; no sobrescribir cambios concurrentes.
- [ ] Consolidar únicamente bloques aprobados; resolver cualquier discrepancia y volver a ejecutar controles del conjunto.
- [ ] Comprobar Public quality, análisis estático, auditorías estructural/dependencias/duplicación/código sin uso, locks nativos, tres suites PostgreSQL aisladas (RBAC, papelera, historial), preview pública, Admin Android y ensayo de actualización: 13 workflows cuando aplican al candidato integral.
- [ ] Confirmar que los artefactos pertenecen al SHA probado y no son publicaciones oficiales. Registrar links y resultados; un informe de una rama anterior no acredita una posterior.
- [ ] Clasificar hallazgos restantes: copias generadas verificadas, módulo histórico de descubrimiento sin activar, avisos Expo no configurados. No suprimir alertas para declarar éxito.

## Puerta 2 — Datos y permisos, sin modificar producción todavía

- [ ] Revisar esquema real y diferencias respecto a las pruebas aisladas: roles, bloqueos, permisos heredados, RLS, funciones de publicación, revisión de canciones, papelera y arreglos Studio.
- [ ] Identificar exactamente las migraciones necesarias, sus dependencias y orden compatible con clientes antiguos. Los scripts candidatos `sql/SHALOM_ADMIN_ROLE_PRIVILEGES.sql`, `sql/SHALOM_ADMIN_SONG_TRASH_20261121.sql` y `sql/SHALOM_STUDIO_HISTORY.sql` requieren revisar el RBAC, los arreglos publicados y las funciones ya desplegadas. Esta lista no es una orden de ejecución; no ejecutar históricos indiscriminadamente.
- [ ] Crear respaldo privado del catálogo y sus relaciones, versiones, papelera, acompañamientos y datos de acceso; incluir objetos de esquema y Storage si aplica. Un export JSON del administrador no sustituye un respaldo completo de base de datos.
- [ ] Verificar restauración en entorno aislado; registrar fecha, responsable, inventario y método. No guardar respaldos, credenciales ni datos personales en GitHub.
- [ ] Probar las migraciones juntas sobre un esquema equivalente y comprobar sesiones de visitante, usuario sin permiso, administrador limitado, propietario y cuenta bloqueada. Confirmar compatibilidad con los clientes ya instalados.
- [ ] Obtener autorización expresa del responsable antes de aplicar SQL. Detener publicaciones durante la operación y verificar conteos, relaciones, arreglos y permisos después. No borrar un canto real como prueba.

## Puerta 3 — Pruebas funcionales y visuales

Usar catálogo sintético o entorno de pruebas; en producción solo lecturas autorizadas, nunca crear/borrar registros de ensayo sin autorización.

| ID | Superficie | Verificación | Evidencia |
| --- | --- | --- | --- |
| WEB-01 | Web móvil y escritorio | Inicio, menú, búsqueda, artistas, categorías y álbumes | Pendiente |
| WEB-02 | Lectura | Letra/acordes, blancos, bemoles, transposición, capo, impresión | Pendiente |
| WEB-03 | Colecciones | Repertorios, misas, popurrís y enlaces | Pendiente |
| ADM-01 | Admin web y Android | Inicio de sesión, acceso permitido/denegado, cierre, cambio de cuenta | Pendiente |
| ADM-02 | Admin | Casos de [protocolo Admin](PROTOCOLO-PRUEBAS-ADMIN.md), guardar y recuperar borrador | Pendiente |
| STU-01 | Studio | Editar acordes, duración, rasgueos, secciones, deshacer seguro | Pendiente |
| STU-02 | Studio | Reproducción, cambio de pista, seguimiento y zoom con pellizco | Pendiente |
| STU-03 | Studio | Publicación confirmada, historial y recuperación de revisión exacta en entorno de prueba | Pendiente |
| APP-01 | Android Pública | Instalación paralela, navegación, sincronización y lectura offline | Pendiente |
| APP-02 | Android Pública | Respaldo/restauración de colecciones y actualización sin desinstalar | Pendiente |
| APP-03 | Android Admin | Instalación, editor, acceso, historial y reconexión | Pendiente |
| PERF-01 | Dispositivo físico | Apertura, navegación, búsqueda y edición/reproducción; comparar con versión estable | Pendiente |

Registrar modelo, versión Android/navegador, SHA/APK, resultado y captura no privada. Los emuladores no reemplazan estas comprobaciones. iOS requiere una validación/distribución separada; no se declara publicado por aprobar Android.

## Puerta 4 — Publicación coordinada

- [ ] Confirmar las tres puertas anteriores, aprobación explícita y plan de reversión. No fusionar si faltan migraciones requeridas por la web.
- [ ] Verificar versiones y códigos crecientes, identidad de paquete y certificado contra las últimas APK oficiales. Conservar datos locales: no exigir desinstalación.
- [ ] Preparar y verificar las versiones con los workflows de ensayo. Cualquier cambio posterior de código o manifiesto requiere validar el nuevo SHA.
- [ ] Coordinar respaldo, migraciones y revisión web. GitHub Pages publica desde main; la fusión no es una operación de prueba.
- [ ] Tras autorización, fusionar el candidato exacto y verificar despliegue de Pages, login y lectura pública.
- [ ] Ejecutar manualmente android-apk.yml y admin-apk.yml desde main con publish_official explícito. Comprobar archivos, etiquetas, certificado, versión, hashes y enlaces. No confundir previews con APK oficiales.
- [ ] Realizar comprobación posterior de web, Pública y Admin con versiones instaladas; registrar incidencias.

## Criterios de detención y reversión

Detener ante pérdida de cantos, acceso incorrecto, divergencia del esquema, fallo de apertura, pérdida de datos locales, incompatibilidad de firma, prueba fallida o discrepancia de artefacto. Mantener usuarios en la versión estable; no desinstalar, borrar historial, purgar datos ni ejecutar restauraciones masivas como primer intento. Revertir código mediante una revisión identificada y probada; planificar aparte los cambios SQL para conservar datos posteriores al respaldo. Una APK anterior con versionCode inferior normalmente no sirve como actualización directa: preparar una revisión correctiva firmada con código creciente. No sobrescribir releases. Revisar compatibilidad entre clientes y esquema antes de revertir web o base de datos.

## Registro de aprobación

| Elemento | Evidencia |
| --- | --- |
| SHA candidato final y main | Pendiente |
| 13 workflows aplicables | Pendiente |
| Respaldo restaurable y prueba de migraciones conjuntas | Pendiente |
| Matriz de permisos y casos visuales/dispositivos | Pendiente |
| Versiones, certificados y artefactos oficiales | Pendiente |
| Autorización de despliegue SQL, fusión y publicación | Pendiente |

El código puede estar listo antes de que el lanzamiento esté autorizado. Mantener separados ambos estados.

### Prueba conjunta de recuperación

El workflow de papelera ejecuta `tests/sql/combined-recovery.sql`, que reutiliza el fixture aislado original y aplica también privilegios RBAC e historial Studio. Comprueba rollback de las tres operaciones cuando falla el registro de auditoría, contrato RPC anterior, lectura de historial separada del permiso de borrado y restauración de letra, relaciones y arreglo exactos. Los permisos son simulados en el fixture; no certifican las políticas desplegadas ni un respaldo restaurado real. Pendiente verificar CI del SHA final.
