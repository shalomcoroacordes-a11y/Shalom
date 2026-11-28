# SHALOM — reglas permanentes de ingeniería

Estas reglas se aplican a todo el repositorio, web pública, Admin, Studio, mobile y admin-mobile. Leer docs/ARQUITECTURA.md, docs/CONVENCIONES.md y docs/PLAN-REORGANIZACION.md antes de cambios estructurales.

## Antes de editar
- Identifica la implementación propietaria del comportamiento, sus consumidores, pruebas, orden de carga HTML y contratos de datos. No asumas que un archivo llamado fix, legacy o v2 está inactivo.
- Localiza la causa raíz; reproduce el fallo con una prueba cuando sea posible.
- Conserva el diseño y las funcionalidades aprobadas. No cambies otras áreas sin necesidad.

## Al modificar
- Corrige la implementación propietaria. No envuelvas funciones existentes, reasignes globals ni uses observadores del DOM para corregir una salida que controla el propio proyecto cuando puedas modificar el origen.
- No añadas archivos fix, patch, hotfix, workaround, polish, v2/v3 ni copias de implementación para ocultar un defecto. Un adaptador de compatibilidad, migración o módulo con responsabilidad distinta puede ser válido; documenta su motivo, consumidores y criterio de retirada si es temporal.
- Mantén una responsabilidad principal por módulo; nombres funcionales, dependencias explícitas, lógica musical pura compartida solo cuando sea compatible con ambos entornos. Evita abstracciones especulativas.
- Retira el código sustituido únicamente tras comprobar consumidores, rutas dinámicas, caché, pruebas y compatibilidad. Nunca elimines datos ni historial para limpiar código.
- CSS: modifica el selector/componente propietario en lugar de añadir una regla de sobreescritura al final; documenta excepciones legítimas de la cascada.
- Conserva rutas públicas, accesibilidad, almacenamiento offline, respaldos y compatibilidad de actualizaciones. No cambies esquema, permisos o datos de producción como parte de una refactorización sin plan y respaldo aprobados.
- No modificar Juntos Hacia Dios ni incluir credenciales privadas.

## Antes de integrar
- Ejecuta pruebas existentes y nuevas de comportamiento; verifica sintaxis, dependencias, navegador y flujos nativos relevantes. No sustituir pruebas de comportamiento por solo comprobar texto.
- Trabaja cambios estructurales en rama y PR. Describe causa, implementación original modificada, código retirado, compatibilidad, pruebas y pendientes.
- Si un control falla, resuelve el origen; no desactives pruebas ni escondas fallos para obtener un verde. No afirmar que el APK o la publicación están listos sin confirmación.
- Si no se puede verificar una modificación, conservar la rama sin integrar y explicar el bloqueo. La regla de nombres es una barrera mínima, no demuestra por sí sola calidad.

## Herramientas
Revisar las herramientas de auditoría existentes en scripts/ y las pruebas de .github/workflows/. Incorporar analizadores externos de manera gradual con versiones fijadas y configuración adecuada a JavaScript clásico y Expo. Nunca borrar automáticamente candidatos de código no utilizado.

## Trabajo por bloques integrales
- Agrupa cambios relacionados por responsabilidad y contrato de datos. Planifica el bloque y sus pruebas antes de editar; no crear una rama por cada ajuste menor.
- Ejecuta primero las pruebas específicas y de sintaxis; las validaciones completas de web, Admin, Android y actualización siguen siendo obligatorias según los archivos afectados antes de integrar.
- No modifiques una rama que está compilando salvo que exista un fallo reproducido. Mientras tanto, revisa módulos independientes sin duplicar el trabajo ni abrir ramas superpuestas. Un resultado de CI pertenece al commit probado, no a futuras modificaciones.
- Las cachés solo aceleran descargas; nunca sustituyen instalación, pruebas, verificación de firma, arranque o actualización. No almacenar APK, secretos ni datos de usuarios en cachés.
- Antes de fusionar, verifica el estado de main, conflictos y las consecuencias de los workflows de publicación automática. No iniciar publicación oficial como parte de una prueba. La APK oficial requiere ejecución manual desde main y confirmación explícita; un push no debe publicar APK. Ver docs/DESARROLLO.md.

- Los lockfiles de Pública y Admin deben permanecer versionados. Para instalar, usar npm ci; para cambiar dependencias, actualizar manifiesto y lockfile juntos y verificar Expo y todas las pruebas aplicables.

## Base oficial obligatoria (Pública, Admin, Studio y web)
- Antes de editar, consulta las releases oficiales de Pública y Admin por separado: ignora borradores y prereleases, resuelve el tag al SHA real y consulta el último despliegue exitoso de GitHub Pages en main. Comprueba que las tres referencias oficiales sean ancestros de la base. No elegir main solo por ser la rama predeterminada. Si falla, detener y reconciliar la rama sin eliminar funciones ni datos.
- Ejecuta `node scripts/release-base-guard.cjs --ref origin/main` tras `git fetch origin --prune`. Si main está atrasada o diverge, no crear ramas desde ella. Integra desde la release más reciente que incluya las tres líneas oficiales y conserva los cambios exclusivos de main mediante revisión. Ejecuta el mismo control en la rama candidata antes de editar, compilar o fusionar.
- Mantén manifiestos y locks coherentes; para publicar incrementa versión y versionCode respecto de la release real. El guard exige el SHA completo autorizado y no permite reutilizar una versión publicada. No cambiar etiquetas oficiales ni reemplazar APK existentes.
- Ejecuta las regresiones completas de funciones aprobadas y los ensayos de actualización del candidato exacto. Nunca presentar una APK de ensayo como oficial. Si main o la release cambiaron desde la aprobación, repite la comprobación y las pruebas. No publicar automáticamente.
