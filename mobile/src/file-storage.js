// Almacenamiento de rescate en Documentos internos de la APP, NO en caché de Android/Chrome.
// Dos copias alternas: una descarga interrumpida no reemplaza la última copia válida.
const { File, Paths } = require("expo-file-system");
const { TABLES, SUPABASE_URL } = require("./config");
const SHALOM_SOURCE = new URL(SUPABASE_URL).hostname.split(".")[0];

function fileFor(slot) {
  return new File(Paths.document, "shalom-offline-" + slot + ".json");
}
function prefsFile() {
  return new File(Paths.document, "shalom-offline-preferences.json");
}
function emptyData() {
  return Object.fromEntries(TABLES.map(table => [table, []]));
}
// Suma de comprobación no criptográfica: detecta escrituras incompletas
// o contenidos cambiados, sin invalidar respaldos antiguos sin checksum.
function snapshotChecksum(data) {
  const payload = JSON.stringify(data);
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash = Math.imul(hash ^ payload.charCodeAt(i), 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function validSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" ||
      typeof snapshot.syncedAt !== "string" ||
      !Number.isFinite(Date.parse(snapshot.syncedAt)) ||
      !snapshot.data || typeof snapshot.data !== "object") return false;
  // Versiones anteriores no tenían necesariamente el campo source.
  // Cuando está presente debe identificar inequívocamente la base SHALOM.
  if (snapshot.source != null && snapshot.source !== SHALOM_SOURCE) return false;
  if (snapshot.checksum != null && snapshot.checksum !== snapshotChecksum(snapshot.data)) return false;
  return TABLES.every(table => {
    const rows = snapshot.data[table];
    if (rows == null && ["medleys","repertoires"].includes(table)) return true;
    if (!Array.isArray(rows)) return false;
    const ids = new Set();
    for (const row of rows) {
      if (!row || typeof row.id !== "string" || !row.id || ids.has(row.id)) return false;
      ids.add(row.id);
    }
    return true;
  });
}
async function readSlot(slot) {
  try {
    const file = fileFor(slot);
    if (!file.exists) return null;
    const snapshot = JSON.parse(await file.text());
    return validSnapshot(snapshot) ? { ...snapshot, slot } : null;
  } catch (_) {
    // Si una escritura se interrumpió, intentar la otra copia válida.
    return null;
  }
}
async function readSnapshot() {
  const [a, b] = await Promise.all([readSlot("A"), readSlot("B")]);
  if (!a && !b) return { data: emptyData(), syncedAt: null, storage: "archivo-local" };
  const latest = !a ? b : !b ? a
    : Date.parse(a.syncedAt) >= Date.parse(b.syncedAt) ? a : b;
  return { data: {...emptyData(),...latest.data}, syncedAt: latest.syncedAt, storage: "archivo-local", slot: latest.slot };
}

async function saveSnapshot(data) {
  if (!data || !TABLES.every(table => Array.isArray(data[table]))) {
    throw new Error("El cancionero recibido está incompleto.");
  }
  const last = await readSnapshot();
  const nextSlot = last.slot === "A" ? "B" : "A";
  const next = fileFor(nextSlot);
  const syncedAt = new Date().toISOString();
  const snapshot = {
    source: SHALOM_SOURCE, syncedAt, data, version: 1,
    checksum: snapshotChecksum(data)
  };
  // Sólo sobrescribe la ranura inactiva. La última copia buena sigue intacta.
  try {
    next.create({ overwrite: true });
    await next.write(JSON.stringify(snapshot));
    const test = await readSlot(nextSlot);
    if (!test || test.source !== SHALOM_SOURCE ||
        JSON.stringify(test.data) !== JSON.stringify(data)) {
      throw new Error("No se pudo verificar que el archivo del cancionero se guardara completo.");
    }
    return syncedAt;
  } catch (error) {
    // La ranura fallida nunca debe superar a la última copia buena.
    // File.delete es la API de expo-file-system SDK 58.
    try { if (next.exists) next.delete(); } catch (_) {}
    throw error;
  }
}

async function getPreference(key, fallback = null) {
  try {
    const file = prefsFile();
    if (!file.exists) return fallback;
    const value = JSON.parse(await file.text());
    return Object.hasOwn(value, key) ? String(value[key]) : fallback;
  } catch (_) { return fallback; }
}
async function setPreference(key, value) {
  const file = prefsFile();
  let prefs = {};
  try { if (file.exists) prefs = JSON.parse(await file.text()) || {}; } catch (_) { prefs = {}; }
  prefs[key] = String(value);
  file.create({ overwrite: true });
  await file.write(JSON.stringify(prefs));
}

module.exports = { readSnapshot, saveSnapshot, getPreference, setPreference, validSnapshot };
