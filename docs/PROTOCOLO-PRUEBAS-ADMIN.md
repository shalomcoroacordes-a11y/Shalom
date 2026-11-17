# SHALOM — protocolo permanente de diagnóstico del administrador

Este documento es la referencia para futuras incidencias. **No contiene credenciales** y las pruebas automatizadas **no escriben datos reales en Supabase**.

## Qué se comprueba automáticamente en cada cambio a main
- Sintaxis JavaScript de los módulos del repositorio.
- Existencia y orden de dependencias de las páginas y del administrador.
- Navegación por pestañas del administrador (simulación).
- Captura de formulario de cantos y selección de colaboradores/categorías (simulación).
- Categorías: tipos, duplicados, jerarquías, concurrencia y bloqueos (pruebas aisladas).
- Artistas: representación de biografía y ausencia del parche anterior.
- Repertorios: validación de misa y ensayo, fechas, estados y controles de guardado.
- Igualdad de estilos CSS consolidados con sus archivos de origen.
- Inventario de scripts del panel y prevención de referencias a archivos inexistentes.

**Alcance:** estas pruebas son internas, deterministas y sin sesión real. No prueban por sí solas que Supabase permita insertar/editar, que el navegador muestre bien la página, ni que la app Android funcione en un teléfono.

## Prueba manual segura después de iniciar sesión
Usar **registros de prueba identificados claramente** (por ejemplo, título `PRUEBA SHALOM - FECHA`), sin tocar contenido publicado. Confirmar con el responsable antes de crear o borrar datos de prueba.

| Clave | Sección | Pasos | Resultado esperado |
| --- | --- | --- | --- |
| ADM-01 | Acceso | Entrar con usuario administrador autorizado; salir y volver a entrar | Acceso y cierre de sesión correctos |
| ADM-02 | Cantos | Crear borrador de prueba, guardar, reabrir y editar título | Datos persisten y no se duplican |
| ADM-03 | Cantos | Añadir letra/acordes; abrir vista previa, cambiar tono y desplazarse | Acordes alineados y posición de lectura conservada |
| ADM-04 | Artistas | Crear artista de prueba, modificar biografía y foto, reabrir | Información y foto correctas |
| ADM-05 | Álbumes | Crear álbum de prueba y asociarlo a artista | Relación visible y persistente |
| ADM-06 | Categorías | Crear categoría de prueba y asignarla a un canto | Aparece en selector y guarda correctamente |
| ADM-07 | Categorías | Intentar duplicado y jerarquía inválida | Mensaje de validación, sin duplicados |
| ADM-08 | Popurrís | Crear popurrí de prueba, agregar y reordenar cantos, guardar | Orden y selección persisten |
| ADM-09 | Repertorios | Crear ensayo y misa de prueba, agregar y reordenar cantos | Ambos tipos guardan sin pérdida de cambios |
| ADM-10 | Solicitudes | Abrir solicitudes y verificar estados | Se listan sin errores |
| ADM-11 | Publicación | Abrir un canto de prueba en web móvil y escritorio | Lectura, botones y navegación correctos |
| ADM-12 | Android | Abrir el canto de prueba en la aplicación | Contenido sincronizado y controles utilizables |

## Cómo reportar una falla
Se puede escribir simplemente: **«Falló ADM-03: al cambiar tono se pierde el scroll»**. También sirve «Falló guardar artista», «Falló repertorio misa» o una captura.

Para diagnosticar, revisar en este orden:
1. Última ejecución **Public quality** y **pages build and deployment** en GitHub Actions.
2. Prueba automatizada asociada a la clave y último commit.
3. Archivos de esa función, sin modificar módulos ajenos.
4. Mensaje de error, navegador/app, dispositivo y si el problema ocurre siempre.
5. Proponer corrección y añadir una prueba de regresión para que no reaparezca.

**No afirmar que un caso manual pasó si no se ejecutó en una sesión real.** No crear, editar ni borrar datos reales sin autorización.

## Referencias
- [Pruebas y despliegues](https://github.com/shalomcoroacordes-a11y/Shalom/actions)
- [Workflow de calidad](../.github/workflows/public-quality.yml)
- [Pruebas automáticas](../tests/)
