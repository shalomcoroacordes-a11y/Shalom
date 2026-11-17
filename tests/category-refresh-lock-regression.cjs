// Regression: saving remains locked while the category list is refreshing.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "admin-category-browser-v2.js"), "utf8").split("// Guardado y validación de categorías: un solo módulo, sin parche externo.\n")[1];

async function scenario(rejectRefresh) {
  let handler, writes = 0, finishRefresh, message = "";
  class HTMLFormElement {}
  const button = { disabled: false };
  const form = Object.create(HTMLFormElement.prototype);
  form.id = "categoryAdminForm";
  form.querySelector = () => button;
  const context = {
    window: {}, HTMLFormElement,
    FormData: class { entries() { return Object.entries({ name: "Prueba" }); } },
    AP: { categories: [], edits: {} },
    apSlug: s => s.toLowerCase(),
    apNote: s => { message = s; },
    apRefresh: () => new Promise((resolve, reject) => {
      finishRefresh = rejectRefresh ? () => reject(new Error("refresh unavailable")) : resolve;
    }),
    AdminPro: { from() { return { insert: async () => { writes++; return { error: null }; } }; } },
    document: {
      addEventListener(type, callback) { if (type === "submit") handler = callback; },
      createElement() { return {}; },
      head: { append() {} }
    }
  };
  vm.runInNewContext(source, context);
  const event = { target: form, preventDefault() {}, stopImmediatePropagation() {} };
  const first = handler(event);
  await Promise.resolve();
  assert.equal(button.disabled, true, "button stays locked during refresh");
  await handler(event);
  assert.equal(writes, 1, "second submit during refresh is ignored");
  finishRefresh();
  await first;
  assert.equal(button.disabled, false, "button unlocks after refresh");
  if (rejectRefresh) {
    assert.match(message, /La categoría se guardó/);
    assert.match(message, /Recarga el administrador/);
    assert.doesNotMatch(message, /No se pudo confirmar el guardado/);
  }
}

(async () => {
  await scenario(false);
  await scenario(true);
  console.log("OK: category form stays locked through refresh and unlocks on failure.");
})().catch(error => { console.error(error); process.exitCode = 1; });
