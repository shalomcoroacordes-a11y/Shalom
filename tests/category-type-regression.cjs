// Regression: the admin category save payload must satisfy the live
// categories_song_type_check constraint: '', 'catolico', 'cristiano'.
// No network or Supabase credentials are used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "admin-category-browser-v2.js"), "utf8").split("// Guardado y validación de categorías: un solo módulo, sin parche externo.\n")[1];

async function saveWithType(songType) {
  let submit;
  let captured;
  let refreshed = false;
  const form = { id: "categoryAdminForm" };
  class HTMLFormElement {}
  Object.setPrototypeOf(form, HTMLFormElement.prototype);
  const context = {
    window: {},
    document: {
      addEventListener(event, callback, capture) {
        if (event === "submit") {
          assert.equal(capture, true, "category submit must be intercepted in capture phase");
          submit = callback;
        }
      },
      createElement() { return { defer: false }; },
      head: { append() {} }
    },
    HTMLFormElement,
    FormData: class {
      entries() {
        return Object.entries({ name: "Prueba", song_type: songType });
      }
    },
    AP: { categories: [], edits: { category: null } },
    apSlug: (value) => value.toLowerCase(),
    AdminPro: {
      from(table) {
        assert.equal(table, "categories");
        return {
          async insert(rows) {
            captured = rows[0];
            return { error: null };
          }
        };
      }
    },
    apRefresh: async () => { refreshed = true; },
    apNote: () => { throw new Error("Unexpected validation error"); }
  };
  vm.runInNewContext(source, context, { filename: "admin-category-save-fix.js" });
  assert.equal(typeof submit, "function", "submit handler must be installed");
  let prevented = false;
  let stopped = false;
  await submit({
    target: form,
    preventDefault() { prevented = true; },
    stopImmediatePropagation() { stopped = true; }
  });
  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(refreshed, true);
  return captured.song_type;
}

(async () => {
  const cases = [
    ["catolico", "catolico"],
    ["cristiano", "cristiano"],
    ["", ""],
    ["general", ""],
    ["mixto", ""],
    ["CATOLICO", "catolico"]
  ];
  for (const [input, expected] of cases) {
    const actual = await saveWithType(input);
    assert.equal(actual, expected, `Wrong database category type for ${JSON.stringify(input)}`);
  }
  console.log("OK: category save payload honors Supabase CHECK constraint (6 cases).");
})().catch((error) => { console.error(error); process.exitCode = 1; });
