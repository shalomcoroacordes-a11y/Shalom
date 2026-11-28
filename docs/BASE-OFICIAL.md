# Base oficial y control de publicación

La autoridad son los tags de las últimas releases estables de Pública (`android-vX.Y.Z`) y Admin (`admin-vX.Y.Z`), con sus APK oficiales. No se confía en el nombre de una rama, ni en un número escrito en un manifiesto, ni en el endpoint de una única release latest.

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

Antes de publicar una app, el workflow llama al mismo control con `--publish public|admin --approved-sha <SHA>`. Debe comprobar el mismo SHA aprobado, mayor versión y versionCode y ambas líneas oficiales. Mantén los ensayos de actualización con el APK oficial real más reciente y las pruebas de firma/UID. El check de ascendencia no sustituye las regresiones de funcionalidades ni la revisión de cambios de web/Supabase.

Situación detectada al 28 de noviembre de 2026: Pública 0.4.27 (50), Admin 0.1.8 (9); main conserva historial divergente de una versión anterior. El control debe rechazar esa base hasta reconciliarla. No se ha autorizado ninguna migración SQL por esta medida.
