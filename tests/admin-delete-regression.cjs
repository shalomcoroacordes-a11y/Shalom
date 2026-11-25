const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const source = fs.readFileSync("admin-pro.js", "utf8");
const start = source.indexOf("async function apHandleDeleteError(");
const end = source.indexOf("async function apSaveDonation(", start);
assert.ok(start >= 0 && end > start);
const notices = [];
const refreshes = [];
let confirmed = true;
let related = false;
const calls = [];
const client = { from(table) { return { delete() { return { eq(field, id) {
  calls.push({ table, field, id });
  return Promise.resolve({ error: related ? { message: "No autorizado" } : null });
} }; } }; } };
const scope = {
  AdminPro: client,
  AP: { songs: [], albums: [], categories: [] },
  apId: String,
  apNote: (...args) => notices.push(args),
  apRefresh: async message => refreshes.push(message),
  window: { ShalomAdminBackup: { deleteSong: async id => calls.push({ table: "protected-song", id }) } },
  confirm: () => confirmed
};
vm.createContext(scope);
vm.runInContext(source.slice(start, end), scope);
(async () => {
  assert.equal(await scope.apHandleDeleteError(null), false);
  assert.equal(await scope.apHandleDeleteError({ message: "Denegado" }), true);
  assert.equal(notices.at(-1)[0], "Error: Denegado");
  notices.length = 0;
  await scope.apDeleteArtist("artist-1");
  assert.equal(calls.at(-1).table, "artists");
  assert.equal(refreshes.at(-1), "Artista eliminado.");
  await scope.apDeleteCategory("category-1");
  assert.equal(calls.at(-1).table, "categories");
  await scope.apDeleteAlbum("album-1");
  assert.equal(calls.at(-1).table, "albums");
  await scope.apDeleteSong("song-1");
  assert.equal(calls.at(-1).table, "protected-song");
  assert.equal(calls.at(-1).id,"song-1");
  scope.window.ShalomAdminBackup = null;
  const beforeMissing=calls.length;
  await scope.apDeleteSong("song-2");
  assert.equal(calls.length,beforeMissing);
  assert.match(notices.at(-1)[0],/protección de papelera/);
  const count = refreshes.length;
  related = true;
  await scope.apDeleteArtist("artist-2");
  assert.equal(refreshes.length, count, "Failed delete must not refresh as successful");
  assert.equal(notices.at(-1)[0], "Error: No autorizado");
  related = false;
  confirmed = false;
  const prior = calls.length;
  await scope.apDeleteCategory("category-2");
  assert.equal(calls.length, prior, "Cancelled deletion must not query Supabase");
  console.log("Admin deletion regression: artist, category, album and song flows preserved.");
})().catch(error => { console.error(error); process.exitCode = 1; });
