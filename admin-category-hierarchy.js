// Jerarquia de categorías de SHALOM Admin. Consultas puras, sin red ni DOM.
(() => {
  "use strict";

  const id = value => String(value || "");
  function categoryIndex(rows) {
    const indexed = new Map();
    for (const row of rows || []) {
      const key = id(row.id);
      if (!indexed.has(key)) indexed.set(key, row);
    }
    return indexed;
  }
  function pathFrom(indexed, item) {
    const segments = [];
    const seen = new Set();
    let current = item;
    while (current && !seen.has(id(current.id))) {
      seen.add(id(current.id));
      segments.unshift(current.name || "Categoría");
      current = indexed.get(id(current.parent_id));
    }
    return segments.join(" › ");
  }
  function path(rows, item) {
    return pathFrom(categoryIndex(rows), item);
  }
  function descendants(rows, key) {
    const out = new Set([id(key)]);
    const children = new Map();
    for (const item of rows || []) {
      const parent = id(item.parent_id);
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(id(item.id));
    }
    const pending = [id(key)];
    for (let index = 0; index < pending.length; index++) {
      for (const child of children.get(pending[index]) || []) {
        if (out.has(child)) continue;
        out.add(child);
        pending.push(child);
      }
    }
    return out;
  }
  function flat(rows) {
    const values = Array.isArray(rows) ? rows : [];
    const indexed = categoryIndex(values);
    return [...values].sort((a, b) =>
      pathFrom(indexed, a).localeCompare(pathFrom(indexed, b), "es"));
  }

  window.ShalomAdminCategoryHierarchy = Object.freeze({ path, descendants, flat });
})();
