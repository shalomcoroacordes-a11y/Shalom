// SHALOM Android: datos persistentes dentro de la app, nunca en la caché de Chrome.
// SQLite es el motor principal; si no está disponible en un dispositivo,
// se utiliza un archivo de respaldo en el directorio privado Documents.
const files = require("./file-storage");
const { TABLES } = require("./config");
let opening = null;
let sqliteUnavailable = false;

async function openDb() {
  if (sqliteUnavailable) throw new Error("SQLite no disponible en este dispositivo.");
  if (!opening) {
    opening = (async () => {
      const SQLite = require("expo-sqlite");
      const db = await SQLite.openDatabaseAsync("shalom-cancionero.db");
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS catalog_records (" +
        "table_name TEXT NOT NULL,record_id TEXT NOT NULL,payload TEXT NOT NULL," +
        "PRIMARY KEY(table_name,record_id));" +
        "CREATE TABLE IF NOT EXISTS metadata (" +
        "meta_key TEXT PRIMARY KEY NOT NULL,meta_value TEXT NOT NULL);"
      );
      return db;
    })().catch(err => {
      opening = null;
      sqliteUnavailable = true;
      throw err;
    });
  }
  return opening;
}

function blank() {
  return Object.fromEntries(TABLES.map(table => [table, []]));
}

async function getSqliteCatalog() {
  const db = await openDb();
  const meta = await db.getFirstAsync("SELECT meta_value FROM metadata WHERE meta_key='last_sync'");
  const syncedAt = meta?.meta_value || null;
  const data = blank();
  if (syncedAt) {
    for (const table of TABLES) {
      const rows = await db.getAllAsync(
        "SELECT payload FROM catalog_records WHERE table_name=? ORDER BY record_id", table
      );
      data[table] = rows.map(row => JSON.parse(row.payload));
    }
  }
  return { data, syncedAt, storage: "SQLite" };
}

async function getCatalog() {
  let sqlite = null, fallback = null;
  try { sqlite = await getSqliteCatalog(); } catch (_) { sqliteUnavailable = true; }
  try { fallback = await files.readSnapshot(); } catch (_) { /* SQLite puede seguir disponible. */ }
  const a = Date.parse(sqlite?.syncedAt || "") || 0;
  const b = Date.parse(fallback?.syncedAt || "") || 0;
  if (a || b) return b > a ? fallback : sqlite;
  if (sqlite) return sqlite;
  if (fallback) return fallback;
  throw new Error("No se pudo abrir el almacenamiento local. Comprueba el espacio libre.");
}

async function getMetadata(key, fallback = null) {
  if (!sqliteUnavailable) {
    try {
      const db = await openDb();
      const row = await db.getFirstAsync(
        "SELECT meta_value FROM metadata WHERE meta_key=?", key
      );
      if (row) return row.meta_value;
    } catch (_) { sqliteUnavailable = true; }
  }
  return files.getPreference(key, fallback);
}

async function setMetadata(key, value) {
  if (!sqliteUnavailable) {
    try {
      const db = await openDb();
      await db.runAsync(
        "INSERT INTO metadata(meta_key,meta_value) VALUES(?,?) " +
        "ON CONFLICT(meta_key) DO UPDATE SET meta_value=excluded.meta_value",
        key, String(value)
      );
      return;
    } catch (_) { sqliteUnavailable = true; }
  }
  await files.setPreference(key, value);
}

async function saveSqliteCatalog(data) {
  const db = await openDb();
  const timestamp = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.runAsync("DELETE FROM catalog_records");
    for (const table of TABLES) {
      for (const item of data[table]) {
        await tx.runAsync(
          "INSERT INTO catalog_records(table_name,record_id,payload) VALUES(?,?,?)",
          table, item.id, JSON.stringify(item)
        );
      }
    }
    await tx.runAsync(
      "INSERT INTO metadata(meta_key,meta_value) VALUES('last_sync',?) " +
      "ON CONFLICT(meta_key) DO UPDATE SET meta_value=excluded.meta_value",
      timestamp
    );
  });
  return timestamp;
}

async function commitCatalog(data) {
  for (const table of TABLES) {
    if (!Array.isArray(data?.[table])) throw new Error("Descarga incompleta: " + table);
    for (const item of data[table]) {
      if (!item || typeof item.id !== "string" || !item.id) {
        throw new Error("Registro inválido en: " + table);
      }
    }
  }
  if (!sqliteUnavailable) {
    try { return await saveSqliteCatalog(data); }
    catch (err) {
      sqliteUnavailable = true;
      console.warn("SHALOM: SQLite no disponible; usar Documents.");
    }
  }
  return await files.saveSnapshot(data);
}

module.exports = { openDb, getCatalog, commitCatalog, getMetadata, setMetadata };
