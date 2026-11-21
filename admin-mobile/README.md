# SHALOM Admin — APK independiente

Administración nativa Android de SHALOM. Mantiene **intacto** el paquete público com.shalomcoroacordes.cancionero, mientras Admin usa \`com.shalomcoroacordes.admin\`.

## Diseño y alcance
- Acceso con correo/contraseña Supabase Auth, token en SecureStore, autorización revalidada al publicar.
- Borradores y cola SQLite **por usuario**, sin depender de conexión.
- Cantos, enlaces, capos, artistas, álbumes, categorías, repertorios/misas, popurrís, solicitudes, destacados y páginas.
- Rol múltiple, permisos personalizados y bloqueo requieren las funciones SQL de \`sql/SHALOM_ADMIN_ROLES.sql\`.
- Escritura de cantos atómica mediante RPC \`admin_publish_song\`, que verifica permisos, conflictos y relaciones.
- Sin contraseñas de servicio en APK. El usuario no puede gestionar miembros de Supabase Dashboard mediante esta APK.

## Seguridad
El APK no crea propietarios nuevos. Los administradores se invitan por correo y el servidor verifica los permisos efectivos al escribir. La web antigua sigue usando \`jhd_is_admin()\`; no reejecutar SQL histórico ni eliminar al administrador propietario.

## Compilar
GitHub Actions > **SHALOM Admin Android (preview)**. APK instalada aparte, sin sustituir la app pública. No distribuir como versión final antes de comprobar UI, autenticación, permisos y sincronización sobre dispositivo.
