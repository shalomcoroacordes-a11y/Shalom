const SUPABASE_URL = "https://ehpvsasyzlrlypjjpzuk.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_v5IM8FT4I63jqZPLBRO6hQ_eoR_vW6E";

var supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.supabaseClient = supabaseClient;

(() => {
  if (/(^|\/)admin\.html$/i.test(location.pathname)) return;
  ["site-footer-links.js?v=1", "site-public-nav.js?v=1"].forEach((src) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.head.append(script);
  });
})();
