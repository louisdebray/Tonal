/* ==========================================================================
   Tonal : données (catégories, réglages, ratios de cadrage, presets)
   Toute nouvelle catégorie, tout nouveau preset ou réglage s'ajoute ici,
   sans toucher au reste de l'application.
   ========================================================================== */

// Définition des réglages disponibles (utilisés par les presets ET les sliders manuels)
const SLIDER_DEFS = [
  { key: "brightness", label: "Luminosité", min: -100, max: 100, step: 1, default: 0,
    icon: "sun" },
  { key: "contrast", label: "Contraste", min: -100, max: 100, step: 1, default: 0,
    icon: "contrast" },
  { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1, default: 0,
    icon: "droplet" },
  { key: "temperature", label: "Température", min: -100, max: 100, step: 1, default: 0,
    icon: "thermometer" },
  { key: "sharpen", label: "Netteté", min: 0, max: 100, step: 1, default: 0,
    icon: "focus" },
  { key: "vignette", label: "Vignette", min: 0, max: 100, step: 1, default: 0,
    icon: "aperture" },
  { key: "grain", label: "Grain / bruit", min: 0, max: 100, step: 1, default: 0,
    icon: "grain" },
  { key: "fade", label: "Fondu des noirs", min: 0, max: 100, step: 1, default: 0,
    icon: "fade" },
  { key: "halation", label: "Halation", min: 0, max: 100, step: 1, default: 0,
    icon: "halo" },
];

// Valeurs neutres (bouton "Réinitialiser" / preset "Brut")
function defaultSettings() {
  const s = {};
  SLIDER_DEFS.forEach(d => s[d.key] = d.default);
  return s;
}

// Ratios de cadrage disponibles dans l'onglet Cadrage.
// ratio = largeur / hauteur ; null = conserve le ratio d'origine de la photo.
const CROP_RATIOS = [
  { id: "original", label: "Original", ratio: null },
  { id: "square", label: "Carré · Post", ratio: 1 },
  { id: "portrait45", label: "Portrait · Post", ratio: 4 / 5 },
  { id: "story", label: "Story / Reel", ratio: 9 / 16 },
  { id: "landscape169", label: "Paysage large", ratio: 16 / 9 },
  { id: "classic32", label: "Classique", ratio: 3 / 2 },
  { id: "standard43", label: "Standard", ratio: 4 / 3 },
];

// Catégories -----------------------------------------------------------------
const CATEGORIES = [
  {
    id: "general",
    name: "Général",
    desc: "Presets universels, pour toute photo",
    gradient: "linear-gradient(135deg,#8e9bc0,#5b6280)",
  },
  {
    id: "landscape",
    name: "Paysage",
    desc: "Montagnes, mer, grands espaces",
    gradient: "linear-gradient(135deg,#5b9df9,#3ad0c4)",
  },
  {
    id: "architecture",
    name: "Architecture",
    desc: "Bâtiments, lignes, structures",
    gradient: "linear-gradient(135deg,#6c7a92,#2c3244)",
  },
  {
    id: "portrait",
    name: "Portrait",
    desc: "Visages, peau, expressions",
    gradient: "linear-gradient(135deg,#f6a5b0,#e07a9a)",
  },
  {
    id: "night",
    name: "Nuit / basse lumière",
    desc: "Scènes nocturnes, néons, étoiles",
    gradient: "linear-gradient(135deg,#2b2f6b,#7b5fc4)",
  },
  {
    id: "nature",
    name: "Nature / macro",
    desc: "Plantes, insectes, détails naturels",
    gradient: "linear-gradient(135deg,#4c9a5b,#8fbf5f)",
  },
  {
    id: "street",
    name: "Rue / street",
    desc: "Scènes urbaines, vie quotidienne",
    gradient: "linear-gradient(135deg,#8a8f98,#4a4d55)",
  },
  {
    id: "argentique",
    name: "Argentique",
    desc: "Émulations pellicule, grain et halation soignés",
    gradient: "linear-gradient(135deg,#c98a4b,#6b3f2a)",
  },
];

// Presets par catégorie --------------------------------------------------------
// Chaque preset = combinaison complète de valeurs pour tous les réglages.
const PRESETS = {

  landscape: [
    { id: "l1", name: "Sommet clair", settings: { brightness: 9, contrast: 22, saturation: 14, temperature: 2, sharpen: 34, vignette: 12, grain: 4, fade: 0, halation: 0 } },
    { id: "l2", name: "Ciel d'orage", settings: { brightness: -12, contrast: 42, saturation: -6, temperature: -12, sharpen: 28, vignette: 28, grain: 8, fade: 4, halation: 0 } },
    { id: "l3", name: "Heure dorée", settings: { brightness: 12, contrast: 16, saturation: 24, temperature: 38, sharpen: 16, vignette: 16, grain: 6, fade: 4, halation: 14 } },
    { id: "l4", name: "Froid glacier", settings: { brightness: 5, contrast: 24, saturation: -18, temperature: -38, sharpen: 24, vignette: 14, grain: 3, fade: 0, halation: 0 } },
    { id: "l5", name: "Brume dorée", settings: { brightness: 8, contrast: -6, saturation: 2, temperature: 18, sharpen: 10, vignette: 10, grain: 6, fade: 22, halation: 8 } },
    { id: "l6", name: "Ambre du Pacifique", settings: { brightness: 8, contrast: 10, saturation: 14, temperature: 30, sharpen: 14, vignette: 12, grain: 6, fade: 10, halation: 16 } },
  ],

  architecture: [
    { id: "a1", name: "Béton contrasté", settings: { brightness: -4, contrast: 46, saturation: -22, temperature: -2, sharpen: 50, vignette: 16, grain: 4, fade: 0, halation: 0 } },
    { id: "a2", name: "Minimaliste N&B", settings: { brightness: 5, contrast: 34, saturation: -100, temperature: 0, sharpen: 40, vignette: 10, grain: 6, fade: 4, halation: 0 } },
    { id: "a3", name: "Doré urbain", settings: { brightness: 7, contrast: 20, saturation: 18, temperature: 32, sharpen: 28, vignette: 18, grain: 4, fade: 4, halation: 10 } },
    { id: "a4", name: "Nuit métropole", settings: { brightness: -14, contrast: 32, saturation: 14, temperature: -16, sharpen: 22, vignette: 32, grain: 12, fade: 0, halation: 16 } },
    { id: "a5", name: "Lignes pures", settings: { brightness: 3, contrast: 12, saturation: -10, temperature: 4, sharpen: 32, vignette: 6, grain: 0, fade: 0, halation: 0 } },
  ],

  portrait: [
    { id: "p1", name: "Peau douce", settings: { brightness: 7, contrast: -10, saturation: 8, temperature: 14, sharpen: 4, vignette: 8, grain: 0, fade: 2, halation: 0 } },
    { id: "p2", name: "Cinématique", settings: { brightness: -4, contrast: 26, saturation: -12, temperature: -6, sharpen: 16, vignette: 24, grain: 8, fade: 6, halation: 4 } },
    { id: "p3", name: "Studio naturel", settings: { brightness: 9, contrast: 10, saturation: 6, temperature: 8, sharpen: 22, vignette: 4, grain: 0, fade: 0, halation: 0 } },
    { id: "p4", name: "Vintage chaleureux", settings: { brightness: 5, contrast: 4, saturation: 12, temperature: 28, sharpen: 6, vignette: 24, grain: 14, fade: 16, halation: 8 } },
    { id: "p5", name: "Golden hour", settings: { brightness: 11, contrast: 8, saturation: 16, temperature: 36, sharpen: 10, vignette: 14, grain: 4, fade: 8, halation: 12 } },
  ],

  night: [
    { id: "n1", name: "Néon urbain", settings: { brightness: -6, contrast: 34, saturation: 30, temperature: -14, sharpen: 22, vignette: 28, grain: 10, fade: 0, halation: 20 } },
    { id: "n2", name: "Clair de lune", settings: { brightness: 3, contrast: 18, saturation: -28, temperature: -32, sharpen: 16, vignette: 22, grain: 6, fade: 2, halation: 6 } },
    { id: "n3", name: "Grain nocturne", settings: { brightness: -8, contrast: 28, saturation: -6, temperature: -10, sharpen: 10, vignette: 34, grain: 34, fade: 4, halation: 10 } },
    { id: "n4", name: "Ville sous la pluie", settings: { brightness: -10, contrast: 30, saturation: 18, temperature: -14, sharpen: 18, vignette: 30, grain: 14, fade: 0, halation: 18 } },
  ],

  nature: [
    { id: "na1", name: "Vert profond", settings: { brightness: 2, contrast: 24, saturation: 28, temperature: 0, sharpen: 34, vignette: 10, grain: 2, fade: 0, halation: 0 } },
    { id: "na2", name: "Automne", settings: { brightness: 6, contrast: 16, saturation: 22, temperature: 34, sharpen: 22, vignette: 14, grain: 4, fade: 4, halation: 6 } },
    { id: "na3", name: "Sous-bois", settings: { brightness: -5, contrast: 20, saturation: 10, temperature: -4, sharpen: 26, vignette: 26, grain: 8, fade: 4, halation: 0 } },
    { id: "na4", name: "Rosée du matin", settings: { brightness: 8, contrast: 6, saturation: 6, temperature: 2, sharpen: 18, vignette: 8, grain: 0, fade: 14, halation: 4 } },
  ],

  street: [
    { id: "s1", name: "Pellicule N&B", settings: { brightness: 0, contrast: 28, saturation: -100, temperature: 0, sharpen: 22, vignette: 16, grain: 20, fade: 8, halation: 0 } },
    { id: "s2", name: "Documentaire", settings: { brightness: 2, contrast: 14, saturation: -12, temperature: 10, sharpen: 22, vignette: 8, grain: 10, fade: 8, halation: 0 } },
    { id: "s3", name: "Contraste dur", settings: { brightness: -6, contrast: 50, saturation: -16, temperature: -2, sharpen: 32, vignette: 20, grain: 12, fade: 0, halation: 0 } },
    { id: "s4", name: "Lumière de trottoir", settings: { brightness: -2, contrast: 18, saturation: 6, temperature: 18, sharpen: 20, vignette: 14, grain: 16, fade: 10, halation: 10 } },
  ],

  general: [
    { id: "g1", name: "Chrome doux", settings: { brightness: 4, contrast: 12, saturation: 12, temperature: 16, sharpen: 14, vignette: 10, grain: 6, fade: 8, halation: 6 } },
    { id: "g2", name: "Diapositive saturée", settings: { brightness: 3, contrast: 26, saturation: 36, temperature: 10, sharpen: 22, vignette: 10, grain: 2, fade: 0, halation: 4 } },
    { id: "g3", name: "Polaroid vintage", settings: { brightness: 9, contrast: -12, saturation: 4, temperature: 24, sharpen: 0, vignette: 32, grain: 18, fade: 28, halation: 4 } },
    { id: "g4", name: "Cross-process", settings: { brightness: 0, contrast: 32, saturation: 22, temperature: -14, sharpen: 16, vignette: 22, grain: 8, fade: 0, halation: 6 } },
    { id: "g5", name: "Sépia", settings: { brightness: 5, contrast: 10, saturation: -62, temperature: 48, sharpen: 4, vignette: 22, grain: 12, fade: 10, halation: 0 } },
    { id: "g6", name: "N&B contrasté", settings: { brightness: 0, contrast: 38, saturation: -100, temperature: 0, sharpen: 26, vignette: 16, grain: 6, fade: 0, halation: 0 } },
    { id: "g7", name: "Doré californien", settings: { brightness: 9, contrast: 8, saturation: 12, temperature: 34, sharpen: 12, vignette: 14, grain: 8, fade: 12, halation: 16 } },
    { id: "g8", name: "Brut / neutre", settings: defaultSettings() },
  ],

  // Mode Argentique : émulations pellicule très travaillées, combinant
  // courbe de tons filmique (fade), grain fin et halation sur les hautes lumières.
  argentique: [
    { id: "ar1", name: "Or chaud", settings: { brightness: 5, contrast: 14, saturation: 18, temperature: 32, sharpen: 10, vignette: 14, grain: 28, fade: 16, halation: 12 } },
    { id: "ar2", name: "Portrait pastel", settings: { brightness: 8, contrast: -6, saturation: 8, temperature: 18, sharpen: 4, vignette: 10, grain: 22, fade: 20, halation: 6 } },
    { id: "ar3", name: "Tri-couleur N&B", settings: { brightness: 2, contrast: 32, saturation: -100, temperature: 0, sharpen: 18, vignette: 18, grain: 42, fade: 10, halation: 0 } },
    { id: "ar4", name: "Vision nocturne", settings: { brightness: -6, contrast: 20, saturation: 8, temperature: -14, sharpen: 12, vignette: 26, grain: 40, fade: 8, halation: 26 } },
    { id: "ar5", name: "Diapositive vive", settings: { brightness: 4, contrast: 24, saturation: 28, temperature: 8, sharpen: 16, vignette: 8, grain: 16, fade: 2, halation: 6 } },
    { id: "ar6", name: "Instantané carré", settings: { brightness: 10, contrast: -14, saturation: 4, temperature: 20, sharpen: 0, vignette: 30, grain: 32, fade: 32, halation: 4 } },
    { id: "ar7", name: "Sursaturé rétro", settings: { brightness: 3, contrast: 18, saturation: 34, temperature: -4, sharpen: 8, vignette: 28, grain: 30, fade: 6, halation: 10 } },
    { id: "ar8", name: "Rooftop pastel", settings: { brightness: 7, contrast: -18, saturation: -14, temperature: 22, sharpen: 2, vignette: 6, grain: 26, fade: 34, halation: 12 } },
  ],
};
