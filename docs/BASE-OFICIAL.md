# Base oficial y control de publicación

La autoridad son tres referencias independientes: los tags de las últimas releases estables de Pública (`android-vX.Y.Z`) y Admin (`admin-vX.Y.Z`), con sus APK oficiales, y el SHA del último despliegue exitoso de GitHub Pages en main (web pública, Admin web y Offline). El guard verifica el trabajo deploy y su paso de publicación; no basta un push ni un build de prueba. No se confía en el nombre de una rama, ni en un número escrito en un manifiesto, ni en el endpoint de una única release latest.

Antes de iniciar una mejora:

```sh
git fetch origin --prune
node scripts/release-base-guard.cjs --ref origin/main
```

Si el control aprueba, crea la nueva rama desde main actualizada. Si falla, no desarrolles sobre main: inspecciona los tags oficiales, conserva los cambios exclusivos de cada historial y prepara una integración revisada. Nunca hagas reset forzado ni cambies los tags publicados. El script usa Git y GitHub CLI autenticado; un error de red o una release sin artefacto bloquea el proceso, no activa un fallback antiguo.

```sh
node tests/release-base-guard.cjs
node scripts/release-base-guard.cjs
```

El workflow **SHALOM official base guard / Official base guard** valida el SHA de origen de cada PR, no solo el merge sintético. Valida también ramas de desarrollo y main. Para aplicar una barrera obligatoria en GitHub, configura Settings → Rules → Rulesets (o Branches → Branch protection rules), exige ese check y Public quality, exige PR y bloquea force push y eliminación de main; no habilites bypass ordinario. Esto requiere permisos de administración del repositorio. El archivo YAML solo no configura las reglas del servidor.

Antes de publicar una app, el workflow llama al mismo control con `--publish public|admin --approved-sha <SHA>`. Debe comprobar el mismo SHA aprobado, mayor versión y versionCode y las tres líneas oficiales. Mantén los ensayos de actualización con el APK oficial real más reciente y las pruebas de firma/UID. El check de ascendencia no sustituye las regresiones de funcionalidades ni la revisión de cambios de web/Supabase.

Situación detectada al 28 de noviembre de 2026: Pública 0.4.27 (50), Admin 0.1.8 (9); main conserva historial divergente de una versión anterior. El control debe rechazar esa base hasta reconciliarla. No se ha autorizado ninguna migración SQL por esta medida.

El control web usa el workflow de Pages generado por GitHub (`dynamic/pages/pages-build-deployment`) en main y consulta todas las páginas de ejecuciones exitosas. Si se cambia el método o la rama de despliegue, adaptar y verificar el control antes de publicar. El historial de despliegues no sustituye una prueba de navegador o verificación funcional de la web. Los workflows requieren permiso `actions: read` para consultar el historial. No modificar la configuración de Pages ni desplegar automáticamente desde la rama candidata.
