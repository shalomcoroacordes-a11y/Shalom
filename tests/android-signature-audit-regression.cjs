// Comprobar que la auditoría histórica es de solo lectura y no publica APK.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const w=fs.readFileSync(".github/workflows/android-signature-audit.yml","utf8");
assert.match(w,/name: SHALOM Android certificate history/);
assert.match(w,/pull_request:/);
assert.match(w,/permissions:\s*\n  contents: read/);
assert.match(w,/android-v0\.4\.8/);
assert.match(w,/android-v0\.4\.10/);
assert.match(w,/apksigner/);
assert.match(w,/aapt/);
assert.match(w,/dump badging SHALOM-Android-v0\.4\.8\.apk/);
assert.match(w,/dump badging SHALOM-Android-v0\.4\.10\.apk/);
assert.match(w,/com\.shalomcoroacordes\.cancionero/);
assert.match(w,/CODE_048.*>=.*CODE_0410/);
assert.match(w,/SHA_048.*!=.*SHA_0410/);
assert.match(w,/exit 1/);
assert.doesNotMatch(w,/gh release create|gh release upload|contents: write|secrets\.|git push/);
console.log("SHALOM: auditoría de firma histórica en solo lectura.");
