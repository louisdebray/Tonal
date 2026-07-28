/* ==========================================================================
   Tonal : persistance locale (presets perso + préférence de thème)
   ========================================================================== */

const Storage = (() => {
  const PRESETS_KEY = "tonal.myPresets";
  const THEME_KEY = "tonal.theme";

  function getMyPresets() {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Tonal: lecture des presets perso impossible", e);
      return [];
    }
  }

  function saveMyPresets(list) {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Tonal: écriture des presets perso impossible", e);
    }
  }

  function addMyPreset(name, settings, thumbDataUrl) {
    const list = getMyPresets();
    const preset = {
      id: "custom-" + Date.now(),
      name,
      settings,
      thumb: thumbDataUrl,
      createdAt: Date.now(),
    };
    list.push(preset);
    saveMyPresets(list);
    return preset;
  }

  function deleteMyPreset(id) {
    const list = getMyPresets().filter(p => p.id !== id);
    saveMyPresets(list);
    return list;
  }

  function renameMyPreset(id, newName) {
    const list = getMyPresets();
    const p = list.find(p => p.id === id);
    if (p) { p.name = newName; saveMyPresets(list); }
    return list;
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY);
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  return { getMyPresets, saveMyPresets, addMyPreset, deleteMyPreset, renameMyPreset, getTheme, setTheme };
})();
