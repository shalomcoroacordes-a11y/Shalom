const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const source = fs.readFileSync("admin-pro.js", "utf8");
const begin = source.indexOf("function apCaptureSongDraft() {");
const end = source.indexOf("function apDraftValue(", begin);
assert.ok(begin >= 0 && end > begin, "Debe existir el capturador de canciones");

const form = { id: "songAdminForm" };
const values = { title: "Canto de prueba", main_artist_id: "a1", category_id: "c1", tone: "G", lyrics: "[Verso]\\nG\\nHola" };
let collaborators = [{ value: "a2" }, { value: "a3" }];
const state = { draft: { category_ids: ["c1", "c2"], category_id: "c1" } };
class FakeFormData {
  constructor(target) { assert.equal(target, form); }
  entries() { return Object.entries(values)[Symbol.iterator](); }
}
const scope = {
  AP: state,
  FormData: FakeFormData,
  ap$: selector => selector === "#songAdminForm" ? form : null,
  ap$$: selector => {
    assert.equal(selector, "input[name='collaborator']:checked");
    return collaborators;
  }
};
vm.createContext(scope);
vm.runInContext(source.slice(begin, end) + "\napCaptureSongDraft();", scope);
assert.deepEqual(Array.from(state.draft.collaborators), ["a2", "a3"]);
assert.deepEqual(Array.from(state.draft.category_ids), ["c1", "c2"]);
assert.equal(state.draft.title, values.title);

collaborators = [];
values.title = "Canción sin colaboradores";
vm.runInContext("apCaptureSongDraft();", scope);
assert.deepEqual(Array.from(state.draft.collaborators), []);
assert.equal(state.draft.title, values.title);
assert.deepEqual(Array.from(state.draft.category_ids), ["c1", "c2"]);
console.log("SHALOM: guardado de canciones — formulario y selección múltiple correctos.");
