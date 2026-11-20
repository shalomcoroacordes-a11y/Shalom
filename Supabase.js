const SUPABASE_URL = "https://ehpvsasyzlrlypjjpzuk.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_v5IM8FT4I63jqZPLBRO6hQ_eoR_vW6E";

var supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.supabaseClient = supabaseClient;
