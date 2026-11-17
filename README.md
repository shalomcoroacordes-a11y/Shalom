# SHALOM — Guía del repositorio

Cancionero web y aplicación móvil del coro SHALOM.

## Empieza aquí

| Quieres... | Lee |
| --- | --- |
| Entender qué hace cada parte | [Arquitectura](docs/ARQUITECTURA.md) |
| Instalar, probar o publicar cambios | [Desarrollo](docs/DESARROLLO.md) |
| Aprender programación con este proyecto | [Guía para aprender](docs/GUIA-PARA-APRENDER.md) |
| Saber cómo nombrar y organizar código | [Convenciones](docs/CONVENCIONES.md) |
| Comprender tablas y permisos | [Base de datos](docs/BASE-DE-DATOS.md) |
| Revisar relaciones y políticas RLS verificadas | [Relaciones y permisos](docs/RELACIONES-Y-PERMISOS.md) |
| Consultar riesgos de permisos SQL detectados | [Auditoría de seguridad Supabase](docs/AUDITORIA-SEGURIDAD-SUPABASE.md) |
| Ver problemas detectados | [Auditoría](docs/AUDITORIA-REPOSITORIO.md) |
| Consultar lo pendiente de reorganización | [Plan de reorganización](docs/PLAN-REORGANIZACION.md) |
| Trabajar en Android | [Manual móvil](mobile/README.md) |

## Organización actual

- **Raíz:** páginas HTML, scripts y estilos del sitio público y administrador. Actualmente GitHub Pages usa esta estructura; no mover sin adaptar publicación.
- **`mobile/`:** aplicación React Native/Expo para Android y pruebas de módulos móviles.
- **`tests/`:** pruebas de regresión de la web y el administrador.
- **`scripts/`:** herramientas de auditoría de dependencias, de solo lectura.
- **`docs/`:** documentación técnica y didáctica.
- **`.github/workflows/`:** validaciones, publicación y compilación de APK.
- **Archivos SQL de la raíz:** scripts históricos. **No ejecutar automáticamente.**

## Cómo colaborar sin romper la aplicación

1. Leer la arquitectura y localizar los archivos afectados.
2. Crear una rama para el cambio.
3. Probar antes y después.
4. No introducir claves privadas ni cambiar permisos sin revisión.
5. Abrir una revisión de cambios antes de publicar.
6. Mantener documentación y pruebas al día.

**Aviso:** la reorganización estructural está en curso. Los nombres de carpetas propuestos en el plan todavía no reflejan cambios aplicados. No modificar el repositorio original Juntos Hacia Dios.
