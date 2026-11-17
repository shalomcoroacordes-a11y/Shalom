// Almacenamiento de rescate en Documentos internos de la APP, NO en caché de Android/Chrome.
// Dos copias alternas: una descarga interrumpida no reemplaza la última copia válida.
const { File, Paths } = require("expo-file-system");
const { TABLES } = require("./config");

function fileFor(slot) {
  return new File(Paths.document, "shalom-offline-" + slot + ".json");
}
function prefsFile() {
  return new File(Paths.document, "shalom-offline-preferences.json");
}
function emptyData() {
  return Object.fromEntries(TABLES.map(table => [table, []]));
}
function validSnapshot(data) {
  return Boolean(data && typeof data === "object" &&
    typeof data.syncedAt === "string" &&
    Number.isFinite(Date.parse(data.syncedAt)) &&
    data.data && TABLES.every(table => table === "medleys" && data.data[table] == null ? true : Array.isArray(data.data[table])));
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
  const snapshot = { source: "ehpvsasyzlrlypjjpzuk", syncedAt, data, version: 1 };
  // Sólo sobrescribe la ranura inactiva. La última copia buena sigue intacta.
  next.create({ overwrite: true });
  await next.write(JSON.stringify(snapshot));
  const test = await readSlot(nextSlot);
  if (!test || !TABLES.every(table => test.data[table].length === data[table].length)) {
    throw new Error("No se pudo verificar que el archivo del cancionero se guardara completo.");
  }
  return syncedAt;
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
