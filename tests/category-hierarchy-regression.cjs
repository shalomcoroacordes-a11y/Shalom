// Simulate admin category submissions without touching Supabase.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "admin-category-browser-v2.js"), "utf8").split("// Guardado y validación de categorías: un solo módulo, sin parche externo.\n")[1];

async function submitCategory({ categories, editingId, parentId }) {
  let listener, writes = 0, message = "";
  class HTMLFormElement {}
  const form = Object.create(HTMLFormElement.prototype);
  form.id = "categoryAdminForm";
  const context = {
    window: {},
    HTMLFormElement,
    FormData: class {
      entries() { return Object.entries({ name: "Prueba", parent_id: parentId }); }
    },
    AP: { categories, edits: { category: editingId }, categoryBrowser: null },
    apSlug: (name) => name.toLowerCase(),
    apNote: (value) => { message = value; },
    apRefresh: async () => {},
    AdminPro: { from() {
      return {
        insert: async () => { writes++; return { error: null }; },
        update: () => ({ eq: async () => { writes++; return { error: null }; } })
      };
    } },
    document: {
      addEventListener(type, handler) { if (type === "submit") listener = handler; },
      createElement() { return {}; },
      head: { append() {} }
    }
  };
  vm.runInNewContext(source, context);
  await listener({
    target: form,
    preventDefault() {},
    stopImmediatePropagation() {}
  });
  return { writes, message };
}

(async () => {
  const rows = [
    { id: "a", parent_id: null, slug: "raiz", song_type: "" },
    { id: "b", parent_id: "a", slug: "hija", song_type: "" },
    { id: "c", parent_id: "b", slug: "nieta", song_type: "" }
  ];
  const cases = [
    ["self-parent", "a", "a", 0],
    ["descendant", "a", "c", 0],
    ["missing-parent", "a", "deleted", 0],
    ["valid-move", "c", "a", 1],
    ["valid-root", "b", "", 1],
    ["new-category", null, "a", 1],
    ["existing-parent", "c", "b", 1]
  ];
  for (const [label, editingId, parentId, expected] of cases) {
    const actual = await submitCategory({ categories: rows, editingId, parentId });
    assert.equal(actual.writes, expected, label);
    if (!expected) assert.ok(actual.message, `${label}: must explain rejection`);
  }
  const corrupt = [
    { id: "a", parent_id: "b" },
    { id: "b", parent_id: "a" }
  ];
  const actual = await submitCategory({ categories: corrupt, editingId: null, parentId: "a" });
  assert.equal(actual.writes, 0, "pre-existing cycle must be rejected");
  console.log("OK: 8 hierarchy validation cases.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
