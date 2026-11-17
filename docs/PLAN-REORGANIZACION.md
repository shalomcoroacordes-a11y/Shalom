# Plan de reorganización segura de SHALOM

**Meta:** que una persona nueva pueda entender el proyecto, localizar funciones y realizar cambios sin depender de conversaciones anteriores.

## Fase 0 — Inventario y documentación (iniciada)

- [x] Identificar zonas: web pública, administración, app móvil, Supabase, pruebas y workflows.
- [x] Crear `docs/ARQUITECTURA.md` con un mapa inicial.
- [x] Incorporar inventario reproducible de referencias HTML → JS/CSS (`scripts/audit_html_dependencies.py`).
- [x] Añadir inventario estático de importaciones JS y require (`scripts/audit_js_dependencies.py`).
- [ ] Completar análisis de scripts globales, cargas dinámicas y referencias a rutas.
- [ ] Identificar código realmente sin uso mediante búsqueda de referencias y pruebas.
- [x] Documentar los seis workflows y señalar tres publicadores históricos (`docs/AUDITORIA-REPOSITORIO.md`).
- [ ] Verificar ejecuciones y retirar publicadores históricos solo tras confirmar que no se usan.
- [ ] Registrar versión estable y una lista de comprobación funcional.

## Fase 1 — Seguridad y pruebas

- [ ] Validar pruebas existentes y agregar cobertura a flujos críticos.
- [ ] Probar inicio de sesión y autorización de administrador, guardado de cantos y repertorios.
- [ ] Probar lectores de cantos, popurrís y repertorios con acordes y desplazamiento manual.
- [ ] Probar descarga offline, sincronización, actualización Android y restauración ante fallo.
- [ ] Crear lista de verificación para publicación y reversión.

## Fase 2 — Documentación para aprender y colaborar

- [x] Escribir `docs/DESARROLLO.md`: requisitos, ejecución local, pruebas y publicación.
- [x] Crear mapa inicial de tablas, almacenamiento y riesgos de permisos (`docs/BASE-DE-DATOS.md`).
- [x] Verificar inventario de tablas y función de administración vigentes en Supabase (solo lectura).
- [x] Documentar relaciones FK y políticas RLS de las 19 tablas (`docs/RELACIONES-Y-PERMISOS.md`).
- [x] Auditar GRANT, funciones y vistas de `public`; documentar privilegios excesivos en `medleys` (`docs/AUDITORIA-SEGURIDAD-SUPABASE.md`).
- [x] Corregir privilegios excesivos de `medleys` y verificar `has_table_privilege` (2026-11-17).
- [ ] Probar flujos de popurrís desde web/Android con cuentas reales tras la corrección.
- [ ] Revisar cuerpos de funciones, Storage, pruebas por rol y orden real de migraciones en Supabase.
- [x] Escribir `docs/GUIA-PARA-APRENDER.md`: conceptos básicos, recorrido del código y ejercicios.
- [ ] Explicar contratos de datos entre web, Supabase y Android.
- [x] Actualizar `mobile/README.md` con las once tablas sincronizadas.
- [ ] Auditar el resto del README frente a los flujos actuales.

## Fase 3 — Refactorización por módulos

- [ ] Extraer componentes de `mobile/App.js` de uno en uno, con pruebas.
- [ ] Consolidar lógica repetida de búsqueda, navegación y lectores sin alterar el resultado.
- [ ] Revisar scripts `*-fix.js`, `*-v2.js` y estilos superpuestos: conservar o fusionar **solo con evidencia**.
- [x] Definir convenciones de nombres, comentarios y carpetas (`docs/CONVENCIONES.md`).
- [ ] Reducir dependencias del orden de scripts del administrador donde sea seguro.

## Fase 4 — Carpetas y despliegue

Estructura objetivo **propuesta**, no aplicada:

```text
SHALOM/
  web/                 # sitio público
  admin/               # panel administrativo
  mobile/              # app React Native / Expo
  database/migrations/ # migraciones verificadas
  shared/              # solo módulos que realmente compartan entornos
  tests/
  docs/
  .github/workflows/
```

**Precaución:** GitHub Pages sirve actualmente HTML/JS/CSS desde la raíz. Antes de mover `web/` o `admin/`, cambiar y probar el proceso de publicación, rutas relativas, enlaces y caché. No mover todo en un solo commit.

## Fase 5 — Entrega a terceros

- [ ] Mapa definitivo de archivos y responsables.
- [ ] Instrucciones para levantar el sitio y la app desde cero.
- [ ] Guía de tareas frecuentes (agregar una sección, modificar una pantalla, agregar tabla).
- [ ] Lista de variables públicas y privadas, sin incluir secretos.
- [ ] Historial de migraciones y procedimiento de respaldo.
- [ ] Validación de publicación web y APK, con versión de recuperación.

## Criterios de aceptación

La limpieza se considera terminada cuando:
1. Una persona nueva puede localizar una función en menos de unos minutos usando la documentación.
2. Las pruebas automáticas pasan y los flujos manuales críticos están comprobados.
3. La web conserva URLs y funciones; el administrador conserva permisos y guardado.
4. La app conserva canciones offline, acordes, transposición, popurrís y repertorios.
5. Se puede volver a una versión estable si una publicación falla.
6. No se eliminan datos de Supabase ni se modifica el repositorio original.

**Política:** evitar borrados y movimientos irreversibles antes de tener pruebas y copia estable.
