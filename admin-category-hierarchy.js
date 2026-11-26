/* Pure tree operations shared by Admin category views. */
(() => {
  const id = value => String(value || "");
  function byId(rows, key) {
    return rows.find(row => id(row.id) === id(key));
  }
  function path(rows, item) {
    const result = [], seen = new Set();
    let current = item;
    while (current && !seen.has(id(current.id))) {
      seen.add(id(current.id));
      result.unshift(current);
      current = byId(rows, current.parent_id);
    }
    return result;
  }
  function descendants(rows, key) {
    const result = new Set([id(key)]);
    let added = true;
    while (added) {
      added = false;
      rows.forEach(row => {
        if (result.has(id(row.parent_id)) && !result.has(id(row.id))) {
          result.add(id(row.id));
          added = true;
        }
      });
    }
    return result;
  }
  function sorted(rows) {
    return [...rows].sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""), "es"));
  }
  function children(rows, parentId) {
    return sorted(rows.filter(row => id(row.parent_id) === id(parentId)));
  }
  window.ShalomAdminCategoryHierarchy = Object.freeze({byId,path,descendants,sorted,children});
})();
