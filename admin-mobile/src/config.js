"use strict";
// Solo clave publicable de SHALOM: la autorización real se comprueba en Supabase.
const BASE = "https://ehpvsasyzlrlypjjpzuk.supabase.co";
const KEY = "sb_publishable_v5IM8FT4I63jqZPLBRO6hQ_eoR_vW6E";
const TABLES = Object.freeze(["songs","artists","albums","categories","song_artists","song_categories","album_songs","song_links","song_capo_versions","medleys","repertoires","contact_messages","home_recommendations","site_content","donation_settings"]);
module.exports = Object.freeze({BASE,KEY,TABLES});
