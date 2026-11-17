// Conexión PUBLICABLE del proyecto Supabase SHALOM. No usar service_role ni claves privadas.
const SUPABASE_URL = "https://ehpvsasyzlrlypjjpzuk.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_v5IM8FT4I63jqZPLBRO6hQ_eoR_vW6E";
const TABLES = Object.freeze([
  "songs", "artists", "categories", "albums", "song_artists",
  "song_categories", "album_songs", "song_links", "song_capo_versions", "medleys"
]);
module.exports = { SUPABASE_URL, PUBLISHABLE_KEY, TABLES };
