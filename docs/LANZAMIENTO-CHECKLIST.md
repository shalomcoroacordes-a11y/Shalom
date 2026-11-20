# SHALOM — Checklist de lanzamiento y pruebas reales

**Estado: candidato en rama. No significa aprobación de lanzamiento.**
Los workflows validan lógica y contratos simulados; las casillas manuales deben
realizarse en teléfonos, sesiones y navegadores reales.

## 1. Seguridad y Supabase
- [x] Esquema real inspeccionado sin escrituras: RLS, políticas Admin y funciones RPC.
- [x] Función actual para guardado atómico de cero/una categoría verificada.
- [x] Propuesta v2 de guardado multicategroría escrita y probada a nivel de contrato.
- [ ] Respaldo verificable y ensayo de restauración de SHALOM en entorno de pruebas.
- [ ] Instalar y ensayar función v2 en staging, como admin y no-admin; probar rollback por FK.
- [ ] Habilitar protección contra contraseñas filtradas en Supabase Auth.
- [ ] Validar con cuentas reales la privacidad de borradores, mensajes y administradores.

## 2. Página y administrador
- [x] Pruebas simuladas de guardado, categorías, medleys, repertorios y rutas.
- [ ] Crear con Admin un canto de prueba con 2 categorías, colaboradores, capo y enlace; reabrir.
- [ ] Publicar misa y ensayo, comprobar su lectura y orden desde la página pública.
- [ ] Publicar un popurrí, transponer, cambiar fragmentos e imprimir.
- [ ] Comprobar con visitante que no aparezcan borradores ni mensajes privados.
- [ ] Comparar la presentación móvil/escritorio: menú, búsqueda, filtros, acordes y tamaño.

## 3. Android y continuidad de datos
- [x] Validaciones automatizadas de catálogo, favoritos, SQLite y respaldos.
- [x] Gate de publicación manual: solo main, tag nuevo y certificado compatible con v0.4.10.
- [ ] Descargar e instalar la APK aislada «SHALOM Pruebas» del PR sin reemplazar SHALOM 0.4.10.
- [ ] Probar en un Android físico: sincronizar todas las tablas y abrir lectores en modo avión.
- [ ] Guardar perfil, favoritos, fotos y colecciones; reiniciar y comprobar persistencia.
- [ ] Exportar e importar respaldo SHALOM1; validar datos y ausencia de duplicados.
- [ ] Actualizar APK sobre v0.4.10 SIN DESINSTALAR y verificar certificado, versión y datos.
- [ ] Repetir con red lenta, sin Wi-Fi, fallas parciales y diferentes tamaños de pantalla.

## 4. Lanzamiento Go/No-Go
- [ ] Completar revisión de PR y fusionar cambios solo después de pruebas manuales.
- [ ] Incrementar version y versionCode; no cambiar package ni proyecto de Supabase.
- [ ] Compilar APK, revisar hash, firma y funcionamiento en móvil real.
- [ ] Ejecutar publicación manual con publish_release=true únicamente tras validación.
- [ ] Confirmar plan de reversión y respaldo; autorización de al menos dos responsables.

**NO GO si falla cualquier prueba de acceso, datos, firma o recuperación.**
Una ejecución verde de GitHub no convierte en aprobadas las pruebas manuales.
