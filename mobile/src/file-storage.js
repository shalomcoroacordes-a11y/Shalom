// Almacenamiento de rescate en Documentos internos de la APP, NO en caché de Android/Chrome.
// Dos copias alternas: una descarga interrumpida no reemplaza la última copia válida.
const { File, Paths } = require("expo-file-system");
const { TABLES, SUPABASE_URL } = require("./config");
const { validRevisions, updatePreferences } = require("./preference-core");
// Hermes puede no implementar new URL(...) sin un polyfill.
// Nunca interpretar la URL en la carga inicial de la app: un error aquí
// cerraría SHALOM antes de montar la pantalla y abrir las colecciones.
const SHALOM_SOURCE = String(SUPABASE_URL).match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1] || "";

function fileFor(slot) {
  return new File(Paths.document, "shalom-offline-" + slot + ".json");
}
function prefsFile(slot = "") {
  return new File(Paths.document, "shalom-offline-preferences" + (slot ? "-" + slot : "") + ".json");
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
  if (snapshot.revision != null && (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0)) return false;
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
    : (a.revision || 0) !== (b.revision || 0)
      ? (a.revision || 0) > (b.revision || 0) ? a : b
      : Date.parse(a.syncedAt) >= Date.parse(b.syncedAt) ? a : b;
  return {
    data: {...emptyData(),...latest.data}, syncedAt: latest.syncedAt,
    storage: "archivo-local", slot: latest.slot, revision: latest.revision || 0
  };
}

let snapshotWrites = Promise.resolve();
function saveSnapshot(data, lastSqlSync = null) {
  const task = snapshotWrites.then(() => writeSnapshot(data, lastSqlSync));
  snapshotWrites = task.catch(() => {});
  return task;
}
async function writeSnapshot(data, lastSqlSync = null) {
  if (!data || !TABLES.every(table => Array.isArray(data[table]))) {
    throw new Error("El cancionero recibido está incompleto.");
  }
  const last = await readSnapshot();
  const nextSlot = last.slot === "A" ? "B" : "A";
  const next = fileFor(nextSlot);
  // Hora estrictamente creciente, incluso ante dos escrituras en un mismo ms.
  // SQLite puede comparar esta fecha con su última sincronización.
  const oldTime = Date.parse(last.syncedAt || "");
  const sqlTime = Date.parse(lastSqlSync || "");
  // También superar el último guardado SQLite, incluso cuando una copia
  // de archivo anterior falló y ambos almacenamientos se desfasaron.
  const nextTime = Math.max(Date.now(),
    Number.isFinite(oldTime) ? oldTime + 1 : 0,
    Number.isFinite(sqlTime) ? sqlTime + 1 : 0);
  const syncedAt = new Date(nextTime).toISOString();
  const snapshot = {
    source: SHALOM_SOURCE, syncedAt, data, version: 1,
    revision: (last.revision || 0) + 1,
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

// Preferences use their own alternating verified files; old installations
// still read the original flat JSON as the initial baseline.
function validPreferences(data) {
  return data && typeof data === "object" && !Array.isArray(data) &&
    Object.values(data).every(value => typeof value === "string");
}
async function readPreferenceSlot(slot) {
  try {
    const file = prefsFile(slot);
    if (!file.exists) return null;
    const record = JSON.parse(await file.text());
    if (!validPreferences(record.data) || !Number.isSafeInteger(record.revision) ||
        record.revision < 1) return null;
    const revisions = record.revisions ?? {};
    if (!validRevisions(record.data,revisions) || record.checksum !== snapshotChecksum(record.revisions == null ? record.data : {data:record.data,revisions})) return null;
    return { ...record, revisions, slot };
  } catch (_) { return null; }
}
async function latestPreferences() {
  const [a,b] = await Promise.all([readPreferenceSlot("A"),readPreferenceSlot("B")]);
  if (a || b) return !a ? b : !b ? a : a.revision >= b.revision ? a : b;
  try {
    const legacy = prefsFile();
    if (legacy.exists) {
      const data = JSON.parse(await legacy.text());
      if (validPreferences(data)) return { data, revisions: {}, revision: 0 };
    }
  } catch (_) {}
  return { data: {}, revisions: {}, revision: 0 };
}
async function getPreference(key, fallback = null) {
  const {data} = await latestPreferences();
  return Object.hasOwn(data,key) ? data[key] : fallback;
}
let preferenceWrites = Promise.resolve();
function enqueuePreferences(work) {
  const task = preferenceWrites.then(work);
  preferenceWrites = task.catch(() => {});
  return task;
}
function setPreference(key,value) {
  return enqueuePreferences(async()=>{
    const previous=await latestPreferences();
    return writePreferences(updatePreferences(previous,{[key]:value}),previous);
  });
}
function savePreferences(next) {
  return enqueuePreferences(async()=>writePreferences(next,await latestPreferences()));
}
async function writePreferences(next,previous) {
  const {data,revisions}=next;
  if(!validPreferences(data)||!validRevisions(data,revisions))throw Error("Preferencias incorrectas");
  const slot = previous.slot === "A" ? "B" : "A";
  const file = prefsFile(slot);
  const record = { data, revisions, revision: previous.revision + 1, checksum: snapshotChecksum({data,revisions}) };
  try {
    file.create({ overwrite: true });
    await file.write(JSON.stringify(record));
    const verified = await readPreferenceSlot(slot);
    if (!verified || verified.revision !== record.revision ||
        JSON.stringify(verified.data) !== JSON.stringify(data) || JSON.stringify(verified.revisions) !== JSON.stringify(revisions)) throw Error("No se pudo verificar la preferencia guardada.");
  } catch (error) {
    try { if (file.exists) file.delete(); } catch (_) {}
    throw error;
  }
}
module.exports = { readSnapshot, saveSnapshot, getPreference, setPreference, readPreferences: latestPreferences, savePreferences, validSnapshot };
