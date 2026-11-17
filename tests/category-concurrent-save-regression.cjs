// Simulate two rapid submits; only one request may be in flight.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "..", "admin-category-browser-v2.js"), "utf8").split("// Guardado y validación de categorías: un solo módulo, sin parche externo.\n")[1];

async function scenario(throws) {
  let handler, calls = 0, resolveRequest, note = "";
  const button = { disabled: false };
  class HTMLFormElement {}
  const form = Object.create(HTMLFormElement.prototype);
  form.id = "categoryAdminForm";
  form.querySelector = () => button;
  const context = {
    window: {},
    document: {
      addEventListener(type, cb) { if (type === "submit") handler = cb; },
      createElement() { return {}; },
      head: { append() {} }
    },
    HTMLFormElement,
    FormData: class { entries() { return Object.entries({ name: "Prueba" }); } },
    AP: { categories: [], edits: {} },
    apSlug: s => s.toLowerCase(),
    apNote: s => { note = s; },
    apRefresh: async () => {},
    AdminPro: { from() { return { insert() {
      calls++;
      return new Promise(resolve => { resolveRequest = resolve; });
    } }; } }
  };
  vm.runInNewContext(source, context);
  const event = { target: form, preventDefault() {}, stopImmediatePropagation() {} };
  const first = handler(event);
  assert.equal(button.disabled, true, "disable button during request");
  const second = handler(event);
  assert.equal(calls, 1, "only one insert in flight");
  if (throws) {
    // A rejecting promise must be handled and the UI unlocked.
    resolveRequest(Promise.reject(new Error("network unavailable")));
  } else {
    resolveRequest({ error: null });
  }
  await Promise.all([first, second]);
  assert.equal(button.disabled, false, "re-enable after request");
  if (throws) {
    assert.match(note, /No se pudo confirmar el guardado/);
    assert.match(note, /network unavailable/);
    assert.match(note, /Revisa la lista antes de reintentarlo/);
  }
  const third = handler(event);
  assert.equal(calls, 2, "allow retry after completion");
  resolveRequest({ error: null });
  await third;
}

(async () => {
  await scenario(false);
  await scenario(true);
  console.log("OK: rapid submits coalesce and failed requests unlock retry.");
})().catch(error => { console.error(error); process.exitCode = 1; });
