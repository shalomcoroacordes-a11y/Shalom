/* Shared backup mechanics. Callers own table order, UI, permissions and recovery policy. */
(() => {
  const PAGE_SIZE = 500;
  const filenameDate = () => new Date().toISOString().replace(/[:.]/g, "-");
  function cleanRow(row, keepId = true) {
    const out = {};
    const blocked = new Set(["created_at", "updated_at", "artist", "artists", "album", "albums", "category", "categories"]);
    Object.entries(row || {}).forEach(([key, value]) => {
      if (key.startsWith("_") || blocked.has(key)) return;
      if (!keepId && key === "id") return;
      out[key] = value;
    });
    return out;
  }

  // Compare complete persisted relation values, not IDs generated on insert.
  function relationKey(row) {
    const stable = (value) => {
      if (Array.isArray(value)) return value.map(stable);
      if (!value || typeof value !== "object") return value;
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
    };
    return JSON.stringify(stable(cleanRow(row, false)));
  }

  function missingRelations(saved, existing) {
    const remaining = new Map();
    for (const row of existing) {
      const key = relationKey(row);
      remaining.set(key, (remaining.get(key) || 0) + 1);
    }
    return saved.map((row) => cleanRow(row, false)).filter((row) => {
      const key = relationKey(row);
      const count = remaining.get(key) || 0;
      if (!count) return true;
      remaining.set(key, count - 1);
      return false;
    });
  }

  async function selectAll(db, table, mapError = (error) => error) {
    const all = [];
    let start = 0;
    while (true) {
      const result = await db.from(table).select("*").range(start, start + PAGE_SIZE - 1);
      if (result.error) throw mapError(result.error, table);
      const batch = result.data || [];
      all.push(...batch);
      if (batch.length < PAGE_SIZE) return all;
      start += PAGE_SIZE;
    }
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.ShalomAdminBackupCore = Object.freeze({ cleanRow, missingRelations, selectAll, downloadJson, filenameDate });
})();
