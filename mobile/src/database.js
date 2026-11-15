// SQLite REAL en el almacenamiento privado de SHALOM Android/iOS, NO caché de navegador.
const SQLite = require("expo-sqlite");
const { TABLES } = require("./config");

let opening = null;
async function openDb() {
  if (!opening) {
    opening = SQLite.openDatabaseAsync("shalom-cancionero.db").then(async db => {
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS catalog_records (" +
          "table_name TEXT NOT NULL, record_id TEXT NOT NULL, payload TEXT NOT NULL, " +
          "PRIMARY KEY(table_name, record_id));" +
        "CREATE TABLE IF NOT EXISTS metadata (" +
          "meta_key TEXT PRIMARY KEY NOT NULL, meta_value TEXT NOT NULL);"
      );
      await db.execAsync("CREATE INDEX IF NOT EXISTS idx_shalom_catalog_table ON catalog_records(table_name);");
      return db;
    }).catch(err => {
      opening = null;
      throw err;
    });
  }
  return opening;
}

async function getMetadata(key, fallback = null) {
  const db = await openDb();
  const row = await db.getFirstAsync("SELECT meta_value FROM metadata WHERE meta_key = ?", key);
  return row?.meta_value ?? fallback;
}

async function setMetadata(key, value) {
  const db = await openDb();
  await db.runAsync(
    "INSERT INTO metadata(meta_key,meta_value) VALUES(?,?) " +
      "ON CONFLICT(meta_key) DO UPDATE SET meta_value=excluded.meta_value",
    key, String(value)
  );
}

async function getCatalog() {
  const db = await openDb();
  const syncedAt = await getMetadata("last_sync");
  const result = Object.fromEntries(TABLES.map(table => [table, []]));
  if (!syncedAt) return { data: result, syncedAt: null };
  for (const table of TABLES) {
    const rows = await db.getAllAsync(
      "SELECT payload FROM catalog_records WHERE table_name = ? ORDER BY record_id", table
    );
    result[table] = rows.map(row => JSON.parse(row.payload));
  }
  return { data: result, syncedAt };
}

async function commitCatalog(data) {
  for (const table of TABLES) {
    if (!Array.isArray(data[table])) throw new Error("Tabla incompleta: " + table);
    for (const row of data[table]) {
      if (!row || typeof row.id !== "string" || !row.id) {
        throw new Error("Identificador inválido en " + table);
      }
    }
  }
  const db = await openDb();
  const timestamp = new Date().toISOString();
  // Si falla una escritura, SQLite deshace TODA la operación y conserva el catálogo anterior.
  await db.withExclusiveTransactionAsync(async txn => {
    await txn.runAsync("DELETE FROM catalog_records");
    for (const table of TABLES) {
      for (const row of data[table]) {
        await txn.runAsync(
          "INSERT INTO catalog_records(table_name,record_id,payload) VALUES(?,?,?)",
          table, row.id, JSON.stringify(row)
        );
      }
    }
    await txn.runAsync(
      "INSERT INTO metadata(meta_key,meta_value) VALUES('last_sync', ?) " +
        "ON CONFLICT(meta_key) DO UPDATE SET meta_value=excluded.meta_value", timestamp
    );
  });
  return timestamp;
}

module.exports = { openDb, getCatalog, commitCatalog, getMetadata, setMetadata };
