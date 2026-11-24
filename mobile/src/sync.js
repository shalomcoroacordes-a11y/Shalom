const NetInfo = require("@react-native-community/netinfo").default;
const { SUPABASE_URL, PUBLISHABLE_KEY, TABLES } = require("./config");
const { commitCatalog } = require("./database");
const PAGE_SIZE = 250;
const REQUEST_TIMEOUT_MS = 30000;

async function networkState() {
  const state = await NetInfo.fetch();
  return {
    online: Boolean(state.isConnected && state.isInternetReachable !== false),
    wifi: state.type === "wifi",
    type: String(state.type || "unknown")
  };
}

// Conserva absolutamente todas las páginas; Supabase puede limitar a 1,000 filas por respuesta.
async function allRows(table, onBatch, idField="id", optional=false) {
  let cursor = null;
  const collected = [];
  while (true) {
    // Paginación por clave estable: si el administrador elimina o inserta
    // filas anteriores durante la descarga, nunca se desplaza la ventana.
    const query = [
      "select=*",
      "order="+idField+".asc",
      "limit=" + PAGE_SIZE,
      ...(cursor === null ? [] : [idField+"=gt." + encodeURIComponent(cursor)])
    ].join("&");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let rows;
    try {
      const response = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + query, {
        method: "GET",
        signal: controller.signal,
        headers: {
          apikey: PUBLISHABLE_KEY,
          accept: "application/json"
        }
      });
      if (!response.ok) {
        if(optional && cursor===null && response.status===404){const body=await response.json().catch(()=>null);if(body?.code==="PGRST205"||body?.code==="42P01")return [];}
        throw new Error("No se pudo descargar " + table + " (" + response.status + ").");
      }
      rows = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw new Error("La descarga de " + table + " tardó demasiado. Inténtalo de nuevo con una conexión estable.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    if (!Array.isArray(rows) || rows.length > PAGE_SIZE)
      throw new Error("Respuesta incorrecta de " + table);
    // IDs UUID/texto normalizados por PostgREST; el orden por id debe
    // avanzar estrictamente. Nunca escribir una descarga incompleta.
    let lastId = cursor;
    for (const row of rows) {
      if (!row || typeof row[idField] !== "string" || !row[idField] ||
          (lastId !== null && row[idField] <= lastId)) {
        throw new Error("Página desordenada o duplicada en " + table +
          ". La copia anterior del cancionero se conserva.");
      }
      lastId = row[idField];
    }
    collected.push(...rows);
    if (onBatch) onBatch(table, collected.length);
    if (rows.length < PAGE_SIZE) return collected;
    cursor = lastId;
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
  if(data.songs?.some(song=>song.updated_at)){
    onProgress?.({ index: TABLES.length, total: TABLES.length, table: "Acompañamientos de guitarra" });
    const studio=await allRows("song_studio_arrangements",null,"song_id",true);
    data.songs=require("./studio-catalog").attachArrangements(data.songs,studio);
  }
  onProgress?.({ index: TABLES.length, total: TABLES.length, table: "Guardando SQLite" });
  const syncedAt = await commitCatalog(data);
  return { skipped: false, syncedAt, totalSongs: data.songs.length };
}

module.exports = { networkState, syncAll };
