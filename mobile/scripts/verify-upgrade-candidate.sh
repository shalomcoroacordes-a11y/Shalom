#!/usr/bin/env bash
# Works inside mobile/ in disposable GitHub Actions runner only.
set -euo pipefail
NEW="android/app/build/outputs/apk/release/app-release.apk"
OLD="$RUNNER_TEMP/shalom-upgrade/SHALOM-Android-v0.4.10.apk"
SIGNER="$ANDROID_HOME/build-tools/35.0.0/apksigner"
AAPT="$ANDROID_HOME/build-tools/35.0.0/aapt"
test -s "$NEW"
test -s "$OLD"
test -x "$SIGNER"
test -x "$AAPT"
extract_certificate(){
  "$SIGNER" verify --print-certs "$1" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' | head -1
}
extract_package(){
  "$AAPT" dump badging "$1" | sed -n "s/^package: name='\([^']*\)'.*/\1/p" | head -1
}
extract_code(){
  "$AAPT" dump badging "$1" | sed -n "s/^package: name='[^']*' versionCode='\([^']*\)'.*/\1/p" | head -1
}
OLD_SHA=$(extract_certificate "$OLD")
NEW_SHA=$(extract_certificate "$NEW")
OLD_PKG=$(extract_package "$OLD")
NEW_PKG=$(extract_package "$NEW")
OLD_CODE=$(extract_code "$OLD")
NEW_CODE=$(extract_code "$NEW")
echo "APK oficial: $OLD_PKG | versionCode=$OLD_CODE | SHA-256=$OLD_SHA"
echo "APK candidata: $NEW_PKG | versionCode=$NEW_CODE | SHA-256=$NEW_SHA"
if [[ "$OLD_PKG" != "com.shalomcoroacordes.cancionero" ||
      "$NEW_PKG" != "$OLD_PKG" || "$OLD_CODE" != "33" || "$NEW_CODE" != "37" ]]; then
  echo "::error::Paquete o versión incorrecta. No distribuir APK ni probar actualización." >&2
  exit 1
fi
if [[ -z "$OLD_SHA" || -z "$NEW_SHA" || "$OLD_SHA" != "$NEW_SHA" ]]; then
  echo "::error::Certificado diferente al de 0.4.10. BLOQUEADO: se necesita la clave de firma histórica, nunca desinstalar la app para forzar una actualización." >&2
  exit 1
fi
echo "Identidad, versionCode y certificado válidos para ensayo no publicado."
sha256sum "$NEW"
