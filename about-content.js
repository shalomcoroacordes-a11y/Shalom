(() => {
  const fallback = window.ShalomAboutDefaults;

  const render = (content) => {
    const values = { ...fallback, ...(content || {}) };
    document.querySelectorAll("[data-about]").forEach((element) => {
      const value = values[element.dataset.about];
      if (typeof value === "string" && value.trim()) element.textContent = value;
    });
  };

  const load = async () => {
    render(fallback);
    const db = window.supabaseClient;
    if (!db) return;
    const { data, error } = await db.from("site_content").select("content").eq("content_key", "about").maybeSingle();
    if (!error && data?.content && typeof data.content === "object") render(data.content);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true });
  else load();
})();