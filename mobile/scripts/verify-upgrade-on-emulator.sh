#!/usr/bin/env bash
# Run from repository root. Preserve all app-private data across in-place installation.
set -euo pipefail
PKG="com.shalomcoroacordes.cancionero"
OLD="$RUNNER_TEMP/shalom-upgrade/SHALOM-Android-v0.4.10.apk"
NEW="mobile/android/app/build/outputs/apk/release/app-release.apk"
test -s "$OLD" && test -s "$NEW"
adb wait-for-device
adb install "$OLD"
old_uid=$(adb shell dumpsys package "$PKG" | sed -n 's/.*userId=\([0-9]*\).*/\1/p' | head -1 | tr -d '\r')
test -n "$old_uid"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1
sleep 5
adb install -r "$NEW"
new_uid=$(adb shell dumpsys package "$PKG" | sed -n 's/.*userId=\([0-9]*\).*/\1/p' | head -1 | tr -d '\r')
test -n "$new_uid"
test "$old_uid" = "$new_uid"
adb shell pm path "$PKG" | grep -q '^package:'
adb shell dumpsys package "$PKG" | grep -q 'versionCode=35'
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1
sleep 12
if ! adb shell pidof "$PKG" >/dev/null 2>&1; then
  echo "::error::La aplicación se cerró tras el splash. React Native / Android logcat:" >&2
  adb logcat -d -v brief -s AndroidRuntime:E ReactNativeJS:E ReactNative:E | tail -n 120
  exit 1
fi
echo "SHALOM: emulador aceptó instalación encima de 0.4.10 con UID conservado y la app sigue viva después del splash."
echo "No se probaron colecciones o fotos reales: prueba manual sigue pendiente."
