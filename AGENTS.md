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
