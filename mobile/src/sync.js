const NetInfo = require("@react-native-community/netinfo").default;
const { SUPABASE_URL, PUBLISHABLE_KEY, TABLES } = require("./config");
const { commitCatalog } = require("./database");
const PAGE_SIZE = 250;

async function networkState() {
  const state = await NetInfo.fetch();
  return {
    online: Boolean(state.isConnected && state.isInternetReachable !== false),
    wifi: state.type === "wifi",
    type: String(state.type || "unknown")
  };
}

// Conserva absolutamente todas las páginas; Supabase puede limitar a 1,000 filas por respuesta.
async function allRows(table, onBatch) {
  let offset = 0;
  const collected = [];
  while (true) {
    const query = [
      "select=*",
      "order=id.asc",
      "limit=" + PAGE_SIZE,
      "offset=" + offset
    ].join("&");
    const response = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + query, {
      method: "GET",
      headers: {
        apikey: PUBLISHABLE_KEY,
        accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error("No se pudo descargar " + table + " (" + response.status + ").");
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("Respuesta incorrecta de " + table);
    collected.push(...rows);
    if (onBatch) onBatch(table, collected.length);
    if (rows.length < PAGE_SIZE) return collected;
    offset += rows.length;
  }
}

async function syncAll({ wifiOnly = true, manual = false, onProgress } = {}) {
  const status = await networkState();
  if (!status.online) throw new Error("Sin conexión. Los cantos descargados siguen disponibles.");
  if (wifiOnly && !status.wifi && !manual) {
    return { skipped: true, reason: "Se espera conexión Wi-Fi." };
  }
  const data = {};
  for (let index = 0; index < TABLES.length; index++) {
    const table = TABLES[index];
    onProgress?.({ index: index + 1, total: TABLES.length, table });
    data[table] = await allRows(table);
  }
  onProgress?.({ index: TABLES.length, total: TABLES.length, table: "Guardando SQLite" });
  const syncedAt = await commitCatalog(data);
  return { skipped: false, syncedAt, totalSongs: data.songs.length };
}

module.exports = { networkState, syncAll };
