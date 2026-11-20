const assert=require("node:assert/strict");
const fs=require("node:fs");
const sql=fs.readFileSync("docs/sql-proposals/shalom-save-song-bundle-v2.sql","utf8");
const client=fs.readFileSync("admin-song-persistence.js","utf8");
assert.match(sql,/NO EJECUTAR SIN RESPALDO/);
assert.match(sql,/create or replace function public\.shalom_save_song_bundle_v2\(/i);
assert.match(sql,/security invoker/i);
assert.match(sql,/set search_path = ''/i);
assert.match(sql,/if not public\.jhd_is_admin\(\)/i);
assert.match(sql,/p_categories jsonb/i);
assert.match(sql,/jsonb_array_elements\(p_categories\)/i);
for(const table of ["song_artists","song_categories","album_songs","song_links","song_capo_versions"]){
 assert.match(sql,new RegExp("delete from public\\."+table));
}
assert.match(sql,/revoke all on function public\.shalom_save_song_bundle_v2/i);
assert.match(sql,/from public,anon;/i);
assert.match(sql,/grant execute on function public\.shalom_save_song_bundle_v2/i);
assert.match(sql,/to authenticated;/i);
assert.match(sql,/raise exception 'Acceso administrativo requerido'/);
assert.doesNotMatch(sql,/\bsecurity definer\b/i);
assert.doesNotMatch(sql,/\btruncate\b/i);
assert.match(client,/result\.error\?\.code === "PGRST202"/);
assert.match(client,/saveViaMultiCategoryRpc\(db, multiCategoryRpcArguments\(plan, id\)\)/);
console.log("SHALOM: propuesta atómica v2 preparada y contratos de acceso verificados.");
