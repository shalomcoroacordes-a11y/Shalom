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
adb shell dumpsys package "$PKG" | grep -q 'versionCode=34'
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1
echo "SHALOM: emulador aceptó instalación encima de 0.4.10 con UID conservado."
echo "No se probaron colecciones o fotos reales: prueba manual sigue pendiente."
