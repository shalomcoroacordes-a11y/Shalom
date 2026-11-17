// Duplicate-category regression: no Supabase writes are performed.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "admin-category-save-fix.js"), "utf8");

async function scenario({ categories, editingId = null, parentId = "", type = "", dbError = null }) {
  let submit, writes = 0, note = "", rendered = 0, refreshed = 0;
  class HTMLFormElement {}
  const form = Object.create(HTMLFormElement.prototype);
  form.id = "categoryAdminForm";
  const AP = {
    categories,
    edits: { category: editingId },
    filters: {},
    visualForms: {},
    categoryBrowser: { type: "all", parentId: null }
  };
  const context = {
    window: {}, AP, HTMLFormElement,
    FormData: class { entries() { return Object.entries({ name: "Prueba", parent_id: parentId, song_type: type }); } },
    apSlug: (s) => s.toLowerCase(),
    apNote: (s) => { note = s; },
    apRenderView: () => { rendered++; },
    requestAnimationFrame: () => {},
    apRefresh: async () => { refreshed++; },
    AdminPro: { from() { return {
      insert: async () => { writes++; return { error: dbError }; },
      update: () => ({ eq: async () => { writes++; return { error: dbError }; } })
    }; } },
    document: {
      addEventListener(type, cb) { if (type === "submit") submit = cb; },
      createElement() { return {}; },
      head: { append() {} }
    }
  };
  vm.runInNewContext(source, context);
  await submit({ target: form, preventDefault() {}, stopImmediatePropagation() {} });
  return { writes, note, rendered, refreshed, AP };
}

(async () => {
  const duplicate = { id: "a", name: "Prueba", slug: "prueba", parent_id: null, song_type: "" };
  const parent = { id: "p", name: "Padre", slug: "padre", parent_id: null, song_type: "" };
  const cases = [
    ["same-folder", { categories: [duplicate] }, 0, true],
    ["same-category-edit", { categories: [duplicate], editingId: "a" }, 1, false],
    ["different-folder", { categories: [duplicate, parent], parentId: "p" }, 1, false],
    ["different-type", { categories: [duplicate], type: "catolico" }, 1, false]
  ];
  for (const [label, args, writes, opens] of cases) {
    const result = await scenario(args);
    assert.equal(result.writes, writes, label);
    assert.equal(result.rendered > 0, opens, label);
  }
  const error = { message: "duplicate key violates unique constraint categories_slug_parent_type_unique" };
  const missing = await scenario({ categories: [], dbError: error });
  assert.equal(missing.writes, 1);
  assert.equal(missing.rendered, 0);
  assert.match(missing.note, /Actualiza el panel/);
  assert.doesNotMatch(missing.note, /Se abrió para editarla/);

  // An update conflict must never identify the edited row itself as the duplicate.
  const selfConflict = await scenario({ categories: [duplicate], editingId: "a", dbError: error });
  assert.equal(selfConflict.writes, 1);
  assert.equal(selfConflict.rendered, 0);
  assert.match(selfConflict.note, /Actualiza el panel/);

  const generic = await scenario({ categories: [], dbError: { message: "permission denied" } });
  assert.equal(generic.refreshed, 0);
  assert.match(generic.note, /permission denied/);
  console.log("OK: duplicate category handling and truthful feedback (7 cases).");
})().catch((error) => { console.error(error); process.exitCode = 1; });
