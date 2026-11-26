(() => {
  if (window.__jhdSongPreferences) return;
  window.__jhdSongPreferences = true;

  const PREFS_KEY = "jhd-song-reader-preferences-v1";
  const TRANSPOSE_PREFIX = "jhd-song-transpose-v1:";
  const MIN_SCALE = 0.86;
  const MAX_SCALE = 1.34;
  const STEP = 0.08;

  const songKey = () => {
    const params = new URLSearchParams(location.search);
    return params.get("id") || params.get("slug") || location.pathname;
  };

  function readPrefs() {
    try {
      const value = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      return {
        fontScale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.fontScale) || 1)),
        hideChords: Boolean(value.hideChords)
      };
    } catch (_) {
      return { fontScale: 1, hideChords: false };
    }
  }

  function savePrefs(next) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch (_) {}
  }

  function readTranspose() {
    try {
      const value = Number(localStorage.getItem(`${TRANSPOSE_PREFIX}${songKey()}`));
      return Number.isInteger(value) ? Math.max(-11, Math.min(11, value)) : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveTranspose(value) {
    try { localStorage.setItem(`${TRANSPOSE_PREFIX}${songKey()}`, String(Math.max(-11, Math.min(11, value)))); } catch (_) {}
  }

  function install() {
    const toolbar = document.getElementById("songReaderToolbar");
    const lyrics = document.getElementById("songLyrics");
    if (!toolbar || !lyrics || document.getElementById("songReaderPreferences")) return false;

    const prefs = readPrefs();
    let scale = prefs.fontScale;

    const apply = () => {
      document.documentElement.style.setProperty("--jhd-lyrics-scale", String(scale));
      document.body.classList.toggle("song-hide-chords", prefs.hideChords);
      const label = document.getElementById("songFontSizeLabel");
      const chordButton = document.getElementById("songChordVisibility");
      if (label) label.textContent = `${Math.round(scale * 100)}%`;
      if (chordButton) {
        chordButton.textContent = prefs.hideChords ? "Mostrar acordes" : "Ocultar acordes";
        chordButton.setAttribute("aria-pressed", String(prefs.hideChords));
      }
    };

    const preferences = document.createElement("div");
    preferences.id = "songReaderPreferences";
    preferences.innerHTML = `<div class="song-reader-preference-group" aria-label="Tamaño de letra"><button class="song-btn small-btn secondary" id="songFontDecrease" type="button" aria-label="Disminuir tamaño de letra">A−</button><span id="songFontSizeLabel" aria-live="polite"></span><button class="song-btn small-btn secondary" id="songFontIncrease" type="button" aria-label="Aumentar tamaño de letra">A+</button></div><button class="song-btn small-btn secondary" id="songChordVisibility" type="button" aria-pressed="false"></button>`;
    toolbar.append(preferences);

    document.getElementById("songFontDecrease")?.addEventListener("click", () => {
      if(window.ShalomSectionReaderWeb?.adjust(lyrics,-1))return;
      scale = Math.max(MIN_SCALE, Math.round((scale - STEP) * 100) / 100);
      prefs.fontScale = scale;
      savePrefs(prefs);
      apply();
    });
    document.getElementById("songFontIncrease")?.addEventListener("click", () => {
      if(window.ShalomSectionReaderWeb?.adjust(lyrics,1))return;
      scale = Math.min(MAX_SCALE, Math.round((scale + STEP) * 100) / 100);
      prefs.fontScale = scale;
      savePrefs(prefs);
      apply();
    });
    document.getElementById("songChordVisibility")?.addEventListener("click", () => {
      prefs.hideChords = !prefs.hideChords;
      savePrefs(prefs);
      apply();
      window.ShalomSectionReaderWeb?.refresh(lyrics);
    });

    apply();

    return true;
  }

  window.ShalomSongPreferences = { mount: install, readTranspose, saveTranspose };
})();
