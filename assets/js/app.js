/* ==========================================================================
   Tonal : application principale
   Gère la navigation entre écrans, l'upload, le cadrage, le rendu temps réel
   et l'export.
   ========================================================================== */

(() => {
  "use strict";

  // ---------------------------------------------------------------------
  // Référentiel d'icônes (mini-set inline, style trait fin façon SF Symbols)
  // ---------------------------------------------------------------------
  const ICONS = {
    sun: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
    contrast: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>',
    droplet: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z"/></svg>',
    thermometer: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V4a2 2 0 1 0-4 0v10.76a4 4 0 1 0 4 0z"/></svg>',
    focus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"/><path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"/></svg>',
    aperture: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v6M20.4 7.3l-5.2 3M20.4 16.7l-5.2-3M12 21.5v-6M3.6 16.7l5.2-3M3.6 7.3l5.2 3"/></svg>',
    grain: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6" cy="7" r=".6" fill="currentColor"/><circle cx="13" cy="5" r=".6" fill="currentColor"/><circle cx="18" cy="9" r=".6" fill="currentColor"/><circle cx="8" cy="13" r=".6" fill="currentColor"/><circle cx="16" cy="15" r=".6" fill="currentColor"/><circle cx="5" cy="18" r=".6" fill="currentColor"/><circle cx="12" cy="19" r=".6" fill="currentColor"/><circle cx="19" cy="18" r=".6" fill="currentColor"/></svg>',
    fade: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c3-6 6-9 9-9s6 3 9 9"/></svg>',
    halo: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="8" opacity=".45"/></svg>',
    relief: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 19l6-10 4.5 6 2-3L21.5 19z"/></svg>',
  };

  // ---------------------------------------------------------------------
  // État applicatif
  // ---------------------------------------------------------------------
  const state = {
    category: null,
    fullCanvas: null,       // canvas hors-champ à la résolution originale (image brute)
    fullWidth: 0,
    fullHeight: 0,
    previewCanvas: null,     // canvas hors-champ réduit (image brute, non filtrée)
    previewFilteredCache: null, // ImageData filtrée de l'aperçu complet (mode cadrage)
    imageAspect: 1,          // largeur / hauteur de la photo importée
    settings: defaultSettings(),
    activePresetId: null,
    activeTab: "crop",
    renderPending: false,
    crop: { ratio: null, zoom: 1, cx: 0.5, cy: 0.5 },
    dragging: null,
    camera: {
      stream: null,
      facing: "environment",
      rafId: null,
      settings: defaultSettings(),
      running: false,
    },
    homeMode: "import",
  };

  const CAMERA_LIVE_MAX = 480; // résolution de l'aperçu caméra en direct (fluidité)

  const PREVIEW_MAX = 1100; // plus grande dimension de l'aperçu temps réel
  const THUMB_SIZE = 240;    // résolution des vignettes de presets (source)

  // ---------------------------------------------------------------------
  // Éléments DOM
  // ---------------------------------------------------------------------
  const el = {
    stepCategory: document.getElementById("step-category"),
    stepUpload: document.getElementById("step-upload"),
    stepEditor: document.getElementById("step-editor"),
    categoryGrid: document.getElementById("categoryGrid"),
    categoryHeroTitle: document.getElementById("categoryHeroTitle"),
    categoryHeroSub: document.getElementById("categoryHeroSub"),
    homeModeToggle: document.getElementById("homeModeToggle"),
    uploadCatLabel: document.getElementById("uploadCatLabel"),
    backToCategory: document.getElementById("backToCategory"),
    dropzone: document.getElementById("dropzone"),
    fileInput: document.getElementById("fileInput"),
    backToUpload: document.getElementById("backToUpload"),
    canvasWrap: document.getElementById("canvasWrap"),
    mainCanvas: document.getElementById("mainCanvas"),
    canvasLoading: document.getElementById("canvasLoading"),
    cropOverlay: document.getElementById("cropOverlay"),
    cropFrame: document.getElementById("cropFrame"),
    ratioGrid: document.getElementById("ratioGrid"),
    cropZoomInput: document.getElementById("cropZoomInput"),
    cropZoomValue: document.getElementById("cropZoomValue"),
    cropResetBtn: document.getElementById("cropResetBtn"),
    presetCatLabel: document.getElementById("presetCatLabel"),
    presetGrid: document.getElementById("presetGrid"),
    myPresetGrid: document.getElementById("myPresetGrid"),
    myPresetsEmpty: document.getElementById("myPresetsEmpty"),
    sliderContainer: document.getElementById("sliderContainer"),
    savePresetBtn: document.getElementById("savePresetBtn"),
    resetBtn: document.getElementById("resetBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    compareBtn: document.getElementById("compareBtn"),
    newPhotoBtn: document.getElementById("newPhotoBtn"),
    themeToggle: document.getElementById("themeToggle"),
    panelTabs: document.querySelectorAll(".panel-tab"),
    panelPanes: document.querySelectorAll(".panel-pane"),
    nameModal: document.getElementById("nameModal"),
    presetNameInput: document.getElementById("presetNameInput"),
    cancelNameBtn: document.getElementById("cancelNameBtn"),
    confirmNameBtn: document.getElementById("confirmNameBtn"),
    workCanvas: document.getElementById("workCanvas"),
    thumbCanvas: document.getElementById("thumbCanvas"),
    openCameraBtn: document.getElementById("openCameraBtn"),
    cameraUnsupportedNote: document.getElementById("cameraUnsupportedNote"),
    cameraOverlay: document.getElementById("cameraOverlay"),
    cameraVideo: document.getElementById("cameraVideo"),
    cameraCanvas: document.getElementById("cameraCanvas"),
    cameraErrorMsg: document.getElementById("cameraErrorMsg"),
    cameraCloseBtn: document.getElementById("cameraCloseBtn"),
    cameraSwitchBtn: document.getElementById("cameraSwitchBtn"),
    cameraPresetStrip: document.getElementById("cameraPresetStrip"),
    cameraShutterBtn: document.getElementById("cameraShutterBtn"),
  };

  const mainCtx = el.mainCanvas.getContext("2d");

  // ---------------------------------------------------------------------
  // Thème
  // ---------------------------------------------------------------------
  function initTheme() {
    const saved = Storage.getTheme();
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }
  el.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme")
      || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    Storage.setTheme(next);
  });

  // ---------------------------------------------------------------------
  // Navigation entre écrans
  // ---------------------------------------------------------------------
  function showScreen(name) {
    el.stepCategory.classList.toggle("hidden", name !== "category");
    el.stepUpload.classList.toggle("hidden", name !== "upload");
    el.stepEditor.classList.toggle("hidden", name !== "editor");
    el.newPhotoBtn.classList.toggle("hidden", name === "category");
  }

  // ---------------------------------------------------------------------
  // Étape 1 : catégories
  // ---------------------------------------------------------------------
  function renderCategories() {
    el.categoryGrid.innerHTML = "";
    CATEGORIES.forEach(cat => {
      const card = document.createElement("button");
      card.className = "category-card";
      card.style.setProperty("--card-grad", cat.gradient);
      card.innerHTML = `
        <div class="cat-icon">${categoryIcon(cat.id)}</div>
        <div class="cat-name">${cat.name}</div>
        <div class="cat-desc">${cat.desc}</div>
      `;
      card.addEventListener("click", () => selectCategory(cat.id));
      el.categoryGrid.appendChild(card);
    });
  }

  function categoryIcon(id) {
    const map = {
      general: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-5 5-3-3-2 2"/></svg>',
      landscape: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 17l5-7 4 5 3-4 6 6"/><circle cx="17" cy="6" r="2"/></svg>',
      architecture: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-6h6v6M4 21h16"/></svg>',
      portrait: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8.5" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
      night: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
      nature: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 22V12M12 12c0-4 3-7 7-7 0 4-3 7-7 7zM12 12C12 8 9 5 5 5c0 4 3 7 7 7z"/></svg>',
      street: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 21V9l7-6 7 6v12"/><path d="M9 21v-4h6v4M12 9v.01"/></svg>',
      argentique: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="6" width="19" height="13" rx="2.5"/><circle cx="12" cy="12.5" r="4"/><path d="M8 6l1.5-2h5L16 6"/></svg>',
    };
    return map[id] || map.general;
  }

  function selectCategory(id) {
    state.category = id;
    const cat = CATEGORIES.find(c => c.id === id);
    el.uploadCatLabel.textContent = cat.name;
    el.presetCatLabel.textContent = cat.name;
    if (state.homeMode === "camera") {
      openCamera();
    } else {
      showScreen("upload");
    }
  }

  el.backToCategory.addEventListener("click", () => { closeCamera(); showScreen("category"); });
  el.newPhotoBtn.addEventListener("click", () => { closeCamera(); showScreen("category"); });

  el.homeModeToggle.querySelectorAll(".home-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.homeMode = btn.dataset.mode;
      el.homeModeToggle.querySelectorAll(".home-mode-btn").forEach(b => b.classList.toggle("active", b === btn));
      if (state.homeMode === "camera") {
        el.categoryHeroTitle.innerHTML = "Quel type de photo voulez-vous prendre&nbsp;?";
        el.categoryHeroSub.textContent = "Choisissez une catégorie pour ouvrir l'appareil photo avec les presets adaptés déjà prêts, en aperçu direct.";
      } else {
        el.categoryHeroTitle.innerHTML = "Quel type de photo souhaitez-vous retoucher&nbsp;?";
        el.categoryHeroSub.textContent = "Choisissez une catégorie pour accéder à des presets pensés pour ce type de scène, ou partez du général si vous n'êtes pas sûr.";
      }
    });
  });

  // ---------------------------------------------------------------------
  // Étape 2 : upload (clic + drag & drop)
  // ---------------------------------------------------------------------
  el.dropzone.addEventListener("click", () => el.fileInput.click());
  el.fileInput.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });

  ["dragenter", "dragover"].forEach(evt =>
    el.dropzone.addEventListener(evt, e => {
      e.preventDefault();
      el.dropzone.classList.add("drag-over");
    })
  );
  ["dragleave", "drop"].forEach(evt =>
    el.dropzone.addEventListener(evt, e => {
      e.preventDefault();
      el.dropzone.classList.remove("drag-over");
    })
  );
  el.dropzone.addEventListener("drop", e => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  el.backToUpload.addEventListener("click", () => showScreen("upload"));

  // ---------------------------------------------------------------------
  // Appareil photo : capture directe avec aperçu filtré en direct
  // ---------------------------------------------------------------------
  const cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (!cameraSupported) {
    el.cameraUnsupportedNote.textContent =
      "La prise de photo directe nécessite un navigateur compatible et une connexion sécurisée (HTTPS ou localhost).";
  }

  const cameraCtx = el.cameraCanvas.getContext("2d");
  const cameraCapture = document.createElement("canvas"); // buffer basse résolution pour le rendu temps réel

  el.openCameraBtn.addEventListener("click", openCamera);
  el.cameraCloseBtn.addEventListener("click", closeCamera);
  el.cameraSwitchBtn.addEventListener("click", switchCamera);
  el.cameraShutterBtn.addEventListener("click", captureFromCamera);

  function showCameraError(message) {
    el.cameraErrorMsg.textContent = message;
    el.cameraErrorMsg.classList.add("active");
    el.cameraVideo.hidden = true;
    el.cameraCanvas.classList.add("hidden");
  }

  async function openCamera() {
    if (!cameraSupported) {
      showCameraError("La prise de photo directe n'est pas disponible sur ce navigateur ou cette connexion (HTTPS requis).");
      el.cameraOverlay.classList.remove("hidden");
      return;
    }
    el.cameraOverlay.classList.remove("hidden");
    el.cameraErrorMsg.classList.remove("active");
    el.cameraCanvas.classList.remove("hidden");
    buildCameraPresetStrip();
    await startCameraStream();
  }

  async function startCameraStream() {
    stopCameraStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: state.camera.facing },
        audio: false,
      });
      state.camera.stream = stream;
      el.cameraVideo.srcObject = stream;
      await el.cameraVideo.play();
      state.camera.running = true;
      cameraLoop();
    } catch (err) {
      showCameraError("Impossible d'accéder à la caméra : " + (err && err.message ? err.message : "accès refusé ou indisponible."));
    }
  }

  function stopCameraStream() {
    state.camera.running = false;
    if (state.camera.rafId) cancelAnimationFrame(state.camera.rafId);
    state.camera.rafId = null;
    if (state.camera.stream) {
      state.camera.stream.getTracks().forEach(t => t.stop());
      state.camera.stream = null;
    }
  }

  function closeCamera() {
    stopCameraStream();
    el.cameraOverlay.classList.add("hidden");
  }

  function switchCamera() {
    state.camera.facing = state.camera.facing === "environment" ? "user" : "environment";
    startCameraStream();
  }

  function cameraLoop() {
    if (!state.camera.running) return;
    const vw = el.cameraVideo.videoWidth, vh = el.cameraVideo.videoHeight;
    if (vw && vh) {
      const scale = Math.min(1, CAMERA_LIVE_MAX / Math.max(vw, vh));
      const cw = Math.max(1, Math.round(vw * scale)), ch = Math.max(1, Math.round(vh * scale));
      cameraCapture.width = cw; cameraCapture.height = ch;
      const cctx = cameraCapture.getContext("2d");
      cctx.drawImage(el.cameraVideo, 0, 0, cw, ch);
      const frame = cctx.getImageData(0, 0, cw, ch);
      const result = Engine.applyAll(frame, state.camera.settings);
      el.cameraCanvas.width = cw; el.cameraCanvas.height = ch;
      cameraCtx.putImageData(result, 0, 0);
    }
    state.camera.rafId = requestAnimationFrame(cameraLoop);
  }

  function buildCameraPresetStrip() {
    el.cameraPresetStrip.innerHTML = "";
    const list = [{ id: "brut", name: "Brut", settings: defaultSettings() }, ...(PRESETS[state.category] || PRESETS.general)];
    state.camera.settings = list[0].settings;
    list.forEach((preset, i) => {
      const chip = document.createElement("button");
      chip.className = "camera-preset-chip" + (i === 0 ? " active" : "");
      chip.textContent = preset.name;
      chip.addEventListener("click", () => {
        state.camera.settings = { ...defaultSettings(), ...preset.settings };
        el.cameraPresetStrip.querySelectorAll(".camera-preset-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
      });
      el.cameraPresetStrip.appendChild(chip);
    });
  }

  function captureFromCamera() {
    const vw = el.cameraVideo.videoWidth, vh = el.cameraVideo.videoHeight;
    if (!vw || !vh) return;
    const shot = document.createElement("canvas");
    shot.width = vw; shot.height = vh;
    shot.getContext("2d").drawImage(el.cameraVideo, 0, 0, vw, vh);
    const dataUrl = shot.toDataURL("image/jpeg", 0.95);
    const chosenSettings = { ...state.camera.settings };
    closeCamera();
    loadImage(dataUrl, chosenSettings);
  }

  function handleFile(file) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = ev => loadImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  function loadImage(dataUrl, initialSettings) {
    const img = new Image();
    img.onload = () => {
      prepareCanvases(img);
      state.settings = initialSettings ? { ...defaultSettings(), ...initialSettings } : defaultSettings();
      state.activePresetId = null;
      state.crop = { ratio: null, zoom: 1, cx: 0.5, cy: 0.5 };
      buildSliders();
      buildRatioGrid();
      buildPresetGrid();
      buildMyPresetGrid();
      setActiveTab("crop");
      showScreen("editor");
    };
    img.src = dataUrl;
  }

  function prepareCanvases(img) {
    state.fullWidth = img.naturalWidth;
    state.fullHeight = img.naturalHeight;
    state.imageAspect = state.fullWidth / state.fullHeight;

    const full = el.workCanvas;
    full.width = state.fullWidth;
    full.height = state.fullHeight;
    full.getContext("2d").drawImage(img, 0, 0);
    state.fullCanvas = full;

    // Version réduite (non filtrée) pour l'édition en temps réel
    const scale = Math.min(1, PREVIEW_MAX / Math.max(state.fullWidth, state.fullHeight));
    const pw = Math.max(1, Math.round(state.fullWidth * scale));
    const ph = Math.max(1, Math.round(state.fullHeight * scale));

    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = pw;
    previewCanvas.height = ph;
    previewCanvas.getContext("2d").drawImage(img, 0, 0, pw, ph);
    state.previewCanvas = previewCanvas;
    state.previewFilteredCache = null;
  }

  // ---------------------------------------------------------------------
  // Géométrie du cadrage
  // ---------------------------------------------------------------------
  function clampNum(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // Dimensions relatives (0..1) du cadre pour un ratio et un zoom donnés,
  // indépendantes de la résolution (préview ou pleine résolution).
  function cropDims(ratio, zoom, imageAspect) {
    const targetRatio = ratio || imageAspect;
    const k = targetRatio / imageAspect;
    let rw, rh;
    if (k <= 1) { rh = 1; rw = k; } else { rw = 1; rh = 1 / k; }
    rw /= zoom; rh /= zoom;
    return { rw, rh };
  }

  // Rectangle de cadrage relatif final {rx, ry, rw, rh}, tout en [0,1].
  function computeCropRect() {
    const { rw, rh } = cropDims(state.crop.ratio, state.crop.zoom, state.imageAspect);
    const cx = clampNum(state.crop.cx, rw / 2, 1 - rw / 2);
    const cy = clampNum(state.crop.cy, rh / 2, 1 - rh / 2);
    return { rx: cx - rw / 2, ry: cy - rh / 2, rw, rh };
  }

  // Extrait la zone cadrée d'un canvas source (préview ou pleine résolution)
  // et la renvoie comme ImageData, prête pour Engine.applyAll.
  function extractCroppedImageData(sourceCanvas, rect) {
    const sw = sourceCanvas.width, sh = sourceCanvas.height;
    const sx = rect.rx * sw, sy = rect.ry * sh, cw = rect.rw * sw, ch = rect.rh * sh;
    const dest = document.createElement("canvas");
    dest.width = Math.max(1, Math.round(cw));
    dest.height = Math.max(1, Math.round(ch));
    dest.getContext("2d").drawImage(sourceCanvas, sx, sy, cw, ch, 0, 0, dest.width, dest.height);
    return dest.getContext("2d").getImageData(0, 0, dest.width, dest.height);
  }

  // ---------------------------------------------------------------------
  // Rendu temps réel
  // ---------------------------------------------------------------------
  function renderPreview() {
    if (!state.previewCanvas) return;
    if (state.activeTab === "crop") {
      state.previewFilteredCache = null; // les réglages ont pu changer
      renderCropModeCanvas();
    } else {
      renderEditView();
    }
  }

  function renderEditView() {
    if (state.renderPending) return;
    state.renderPending = true;
    requestAnimationFrame(() => {
      state.renderPending = false;
      const rect = computeCropRect();
      const cropped = extractCroppedImageData(state.previewCanvas, rect);
      const result = Engine.applyAll(cropped, state.settings);
      el.mainCanvas.width = result.width;
      el.mainCanvas.height = result.height;
      mainCtx.putImageData(result, 0, 0);
    });
  }

  // Mode cadrage : affiche la photo entière (filtrée) avec le cadre superposé.
  function renderCropModeCanvas() {
    const pw = state.previewCanvas.width, ph = state.previewCanvas.height;
    el.mainCanvas.width = pw;
    el.mainCanvas.height = ph;
    if (!state.previewFilteredCache) {
      const full = state.previewCanvas.getContext("2d").getImageData(0, 0, pw, ph);
      state.previewFilteredCache = Engine.applyAll(full, state.settings);
    }
    mainCtx.putImageData(state.previewFilteredCache, 0, 0);
    el.cropOverlay.classList.remove("hidden");
    syncOverlayToCanvas();
  }

  function showOriginalPreview(show) {
    if (state.activeTab === "crop") return; // pas de comparaison pendant le cadrage
    if (show) {
      const rect = computeCropRect();
      const cropped = extractCroppedImageData(state.previewCanvas, rect);
      el.mainCanvas.width = cropped.width;
      el.mainCanvas.height = cropped.height;
      mainCtx.putImageData(cropped, 0, 0);
    } else {
      renderPreview();
    }
  }

  // Avant / après (maintenir pour comparer)
  ["mousedown", "touchstart"].forEach(evt =>
    el.compareBtn.addEventListener(evt, e => { e.preventDefault(); showOriginalPreview(true); el.compareBtn.classList.add("active"); })
  );
  ["mouseup", "mouseleave", "touchend"].forEach(evt =>
    el.compareBtn.addEventListener(evt, () => { showOriginalPreview(false); el.compareBtn.classList.remove("active"); })
  );

  // ---------------------------------------------------------------------
  // Onglet Cadrage : grille de ratios, zoom, glisser pour repositionner
  // ---------------------------------------------------------------------
  function buildRatioGrid() {
    el.ratioGrid.innerHTML = "";
    CROP_RATIOS.forEach(r => {
      const chip = document.createElement("button");
      chip.className = "ratio-chip";
      chip.dataset.ratioId = r.id;
      if (r.ratio === state.crop.ratio) chip.classList.add("active");
      const shapeRatio = r.ratio || state.imageAspect;
      const shapeW = shapeRatio >= 1 ? 22 : 22 * shapeRatio;
      const shapeH = shapeRatio >= 1 ? 22 / shapeRatio : 22;
      chip.innerHTML = `
        <span class="ratio-swatch"><span class="ratio-swatch-shape" style="width:${shapeW}px;height:${shapeH}px;"></span></span>
        <span>${r.label}</span>
      `;
      chip.addEventListener("click", () => {
        state.crop.ratio = r.ratio;
        document.querySelectorAll(".ratio-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        syncOverlayToCanvas();
      });
      el.ratioGrid.appendChild(chip);
    });
  }

  el.cropZoomInput.addEventListener("input", () => {
    state.crop.zoom = parseFloat(el.cropZoomInput.value);
    el.cropZoomValue.textContent = state.crop.zoom.toFixed(2) + "×";
    syncOverlayToCanvas();
  });

  el.cropResetBtn.addEventListener("click", () => {
    state.crop.zoom = 1;
    state.crop.cx = 0.5;
    state.crop.cy = 0.5;
    el.cropZoomInput.value = "1";
    el.cropZoomValue.textContent = "1.00×";
    syncOverlayToCanvas();
  });

  // Positionne le cadre (crop-frame) et les masques par-dessus le canvas,
  // en s'alignant précisément sur la boîte réellement rendue du canvas.
  function syncOverlayToCanvas() {
    if (state.activeTab !== "crop") return;
    const w = el.mainCanvas.offsetWidth, h = el.mainCanvas.offsetHeight;
    el.cropOverlay.style.left = el.mainCanvas.offsetLeft + "px";
    el.cropOverlay.style.top = el.mainCanvas.offsetTop + "px";
    el.cropOverlay.style.width = w + "px";
    el.cropOverlay.style.height = h + "px";

    const rect = computeCropRect();
    const left = rect.rx * 100, top = rect.ry * 100, width = rect.rw * 100, height = rect.rh * 100;
    el.cropFrame.style.left = left + "%";
    el.cropFrame.style.top = top + "%";
    el.cropFrame.style.width = width + "%";
    el.cropFrame.style.height = height + "%";

    const masks = el.cropOverlay.querySelectorAll(".crop-mask");
    const [mTop, mBottom, mLeft, mRight] = masks;
    mTop.style.left = "0"; mTop.style.top = "0"; mTop.style.width = "100%"; mTop.style.height = top + "%";
    mBottom.style.left = "0"; mBottom.style.top = (top + height) + "%"; mBottom.style.width = "100%"; mBottom.style.height = (100 - top - height) + "%";
    mLeft.style.left = "0"; mLeft.style.top = top + "%"; mLeft.style.width = left + "%"; mLeft.style.height = height + "%";
    mRight.style.left = (left + width) + "%"; mRight.style.top = top + "%"; mRight.style.width = (100 - left - width) + "%"; mRight.style.height = height + "%";
  }

  function startDrag(clientX, clientY) {
    state.dragging = {
      startX: clientX,
      startY: clientY,
      startCx: state.crop.cx,
      startCy: state.crop.cy,
      canvasW: el.mainCanvas.offsetWidth,
      canvasH: el.mainCanvas.offsetHeight,
    };
  }

  function moveDrag(clientX, clientY) {
    if (!state.dragging) return;
    const d = state.dragging;
    const dxRel = (clientX - d.startX) / d.canvasW;
    const dyRel = (clientY - d.startY) / d.canvasH;
    state.crop.cx = d.startCx + dxRel;
    state.crop.cy = d.startCy + dyRel;
    syncOverlayToCanvas();
  }

  function endDrag() { state.dragging = null; }

  el.cropFrame.addEventListener("mousedown", e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener("mousemove", e => moveDrag(e.clientX, e.clientY));
  window.addEventListener("mouseup", endDrag);

  el.cropFrame.addEventListener("touchstart", e => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener("touchmove", e => {
    if (!state.dragging) return;
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener("touchend", endDrag);

  window.addEventListener("resize", () => { if (state.activeTab === "crop") syncOverlayToCanvas(); });

  // ---------------------------------------------------------------------
  // Sliders de réglages manuels
  // ---------------------------------------------------------------------
  function buildSliders() {
    el.sliderContainer.innerHTML = "";
    SLIDER_DEFS.forEach(def => {
      const row = document.createElement("div");
      row.className = "slider-row";
      const value = state.settings[def.key];
      row.innerHTML = `
        <div class="slider-head">
          <span class="slider-name">${ICONS[def.icon] || ""}${def.label}</span>
          <input type="number" class="slider-value-input" data-value-for="${def.key}"
                 min="${def.min}" max="${def.max}" step="${def.step}" value="${value}" inputmode="numeric" />
        </div>
        <div class="slider-track-wrap">
          <input type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${value}" data-key="${def.key}" />
        </div>
      `;
      el.sliderContainer.appendChild(row);
    });
    el.sliderContainer.querySelectorAll("input[type=range]").forEach(input => {
      updateSliderFill(input);
      input.addEventListener("input", onSliderInput);
    });
    el.sliderContainer.querySelectorAll(".slider-value-input").forEach(input => {
      input.addEventListener("input", onValueInputTyping);
      input.addEventListener("change", onValueInputCommit);
      input.addEventListener("keydown", e => { if (e.key === "Enter") input.blur(); });
    });
  }

  function updateSliderFill(input) {
    const min = parseFloat(input.min), max = parseFloat(input.max), val = parseFloat(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty("--fill", pct + "%");
  }

  function applySliderValue(key, val) {
    state.settings[key] = val;
    const rangeInput = el.sliderContainer.querySelector(`input[type=range][data-key="${key}"]`);
    if (rangeInput) { rangeInput.value = val; updateSliderFill(rangeInput); }
    const valueInput = el.sliderContainer.querySelector(`.slider-value-input[data-value-for="${key}"]`);
    if (valueInput && document.activeElement !== valueInput) valueInput.value = val;
    state.activePresetId = null;
    clearPresetSelection();
    renderPreview();
  }

  function onSliderInput(e) {
    applySliderValue(e.target.dataset.key, parseFloat(e.target.value));
  }

  // Pendant la frappe, on n'applique que si la valeur est déjà un nombre
  // exploitable (évite de recalculer l'image sur "-" ou un champ vide).
  function onValueInputTyping(e) {
    const val = parseFloat(e.target.value);
    if (!Number.isNaN(val)) applySliderValue(e.target.dataset.valueFor, clampToDef(e.target, val));
  }

  // À la validation (Entrée / perte de focus), on nettoie et recadre la
  // valeur pour que le champ affiche toujours un nombre valide et borné.
  function onValueInputCommit(e) {
    const def = SLIDER_DEFS.find(d => d.key === e.target.dataset.valueFor);
    let val = parseFloat(e.target.value);
    if (Number.isNaN(val)) val = state.settings[e.target.dataset.valueFor] ?? def.default;
    val = clampToDef(e.target, val);
    e.target.value = val;
    applySliderValue(e.target.dataset.valueFor, val);
  }

  function clampToDef(input, val) {
    const min = parseFloat(input.min), max = parseFloat(input.max);
    return Math.min(max, Math.max(min, Math.round(val)));
  }

  function syncSlidersFromSettings() {
    el.sliderContainer.querySelectorAll("input[type=range]").forEach(input => {
      const key = input.dataset.key;
      input.value = state.settings[key];
      updateSliderFill(input);
    });
    el.sliderContainer.querySelectorAll(".slider-value-input").forEach(input => {
      input.value = state.settings[input.dataset.valueFor];
    });
  }

  // ---------------------------------------------------------------------
  // Presets de catégorie : vignettes avec aperçu réel du rendu, sur la
  // zone effectivement cadrée, pour refléter le cadrage final choisi.
  // ---------------------------------------------------------------------
  function getThumbSourceImageData() {
    const rect = computeCropRect();
    const cropped = extractCroppedImageData(state.fullCanvas, rect);
    const scale = Math.min(1, THUMB_SIZE / Math.max(cropped.width, cropped.height));
    const w = Math.max(1, Math.round(cropped.width * scale));
    const h = Math.max(1, Math.round(cropped.height * scale));
    const src = document.createElement("canvas");
    src.width = cropped.width; src.height = cropped.height;
    src.getContext("2d").putImageData(cropped, 0, 0);
    const tc = el.thumbCanvas;
    tc.width = w; tc.height = h;
    const tctx = tc.getContext("2d");
    tctx.drawImage(src, 0, 0, w, h);
    return { imageData: tctx.getImageData(0, 0, w, h), w, h };
  }

  function renderThumbDataUrl(settings, source) {
    const result = Engine.applyAll(source.imageData, settings);
    const tc = el.thumbCanvas;
    tc.getContext("2d").putImageData(result, 0, 0);
    return tc.toDataURL("image/jpeg", 0.85);
  }

  function buildPresetGrid() {
    el.presetGrid.innerHTML = "";
    const list = PRESETS[state.category] || PRESETS.general;
    const source = getThumbSourceImageData();
    list.forEach(preset => {
      const card = document.createElement("div");
      card.className = "preset-card";
      card.dataset.presetId = preset.id;
      const thumbUrl = renderThumbDataUrl(preset.settings, source);
      card.innerHTML = `
        <img class="preset-thumb" src="${thumbUrl}" alt="${preset.name}" />
        <div class="preset-label"><span>${preset.name}</span></div>
      `;
      card.addEventListener("click", () => applyPreset(preset));
      el.presetGrid.appendChild(card);
    });
  }

  function buildMyPresetGrid() {
    const myPresets = Storage.getMyPresets();
    el.myPresetGrid.innerHTML = "";
    el.myPresetsEmpty.classList.toggle("hidden", myPresets.length > 0);
    if (!myPresets.length) return;
    const source = getThumbSourceImageData();
    myPresets.forEach(preset => {
      const card = document.createElement("div");
      card.className = "preset-card";
      card.dataset.presetId = preset.id;
      const thumbUrl = renderThumbDataUrl(preset.settings, source);
      card.innerHTML = `
        <img class="preset-thumb" src="${thumbUrl}" alt="${preset.name}" />
        <div class="preset-label">
          <span>${preset.name}</span>
          <button class="preset-delete" title="Supprimer" data-delete-id="${preset.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      `;
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-delete-id]")) return;
        applyPreset(preset);
      });
      card.querySelector("[data-delete-id]").addEventListener("click", (e) => {
        e.stopPropagation();
        Storage.deleteMyPreset(preset.id);
        buildMyPresetGrid();
      });
      el.myPresetGrid.appendChild(card);
    });
  }

  function applyPreset(preset) {
    state.settings = { ...defaultSettings(), ...preset.settings };
    state.activePresetId = preset.id;
    syncSlidersFromSettings();
    clearPresetSelection();
    const activeCard = document.querySelector(`.preset-card[data-preset-id="${preset.id}"]`);
    if (activeCard) activeCard.classList.add("selected");
    renderPreview();
  }

  function clearPresetSelection() {
    document.querySelectorAll(".preset-card.selected").forEach(c => c.classList.remove("selected"));
  }

  // ---------------------------------------------------------------------
  // Onglets du panneau latéral
  // ---------------------------------------------------------------------
  function setActiveTab(tabName) {
    state.activeTab = tabName;
    el.panelTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabName));
    el.panelPanes.forEach(p => p.classList.toggle("active", p.id === "pane-" + tabName));
    if (tabName === "crop") {
      renderCropModeCanvas();
    } else {
      el.cropOverlay.classList.add("hidden");
      renderEditView();
      // Les vignettes reflètent le cadrage : on les régénère au cas où il a changé.
      if (tabName === "presets") buildPresetGrid();
      if (tabName === "mine") buildMyPresetGrid();
    }
  }

  el.panelTabs.forEach(tab => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });

  // ---------------------------------------------------------------------
  // Réinitialiser
  // ---------------------------------------------------------------------
  el.resetBtn.addEventListener("click", () => {
    state.settings = defaultSettings();
    state.activePresetId = null;
    syncSlidersFromSettings();
    clearPresetSelection();
    renderPreview();
  });

  // ---------------------------------------------------------------------
  // Sauvegarde d'un preset personnel
  // ---------------------------------------------------------------------
  el.savePresetBtn.addEventListener("click", () => {
    el.presetNameInput.value = "";
    el.nameModal.classList.remove("hidden");
    setTimeout(() => el.presetNameInput.focus(), 50);
  });
  el.cancelNameBtn.addEventListener("click", () => el.nameModal.classList.add("hidden"));
  el.nameModal.addEventListener("click", e => { if (e.target === el.nameModal) el.nameModal.classList.add("hidden"); });

  el.confirmNameBtn.addEventListener("click", () => {
    const name = el.presetNameInput.value.trim();
    if (!name) { el.presetNameInput.focus(); return; }
    const source = getThumbSourceImageData();
    const thumb = renderThumbDataUrl(state.settings, source);
    Storage.addMyPreset(name, { ...state.settings }, thumb);
    el.nameModal.classList.add("hidden");
    buildMyPresetGrid();
    setActiveTab("mine");
  });
  el.presetNameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") el.confirmNameBtn.click();
  });

  // ---------------------------------------------------------------------
  // Téléchargement : cadrage + traitement à pleine résolution
  // ---------------------------------------------------------------------
  el.downloadBtn.addEventListener("click", async () => {
    if (!state.fullCanvas) return;
    el.canvasLoading.classList.add("active");
    el.downloadBtn.disabled = true;
    // Laisse le temps au navigateur d'afficher le spinner avant le calcul lourd
    await new Promise(r => setTimeout(r, 30));

    const rect = computeCropRect();
    const croppedFull = extractCroppedImageData(state.fullCanvas, rect);
    const processed = Engine.applyAll(croppedFull, state.settings);

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = processed.width;
    exportCanvas.height = processed.height;
    exportCanvas.getContext("2d").putImageData(processed, 0, 0);

    exportCanvas.toBlob(async blob => {
      const file = new File([blob], "tonal-photo.png", { type: "image/png" });

      // Sur mobile, un simple lien <a download> ouvre souvent juste l'image
      // dans le navigateur sans proposer de l'enregistrer dans la galerie.
      // Le partage natif (Web Share API) affiche lui la vraie feuille de
      // partage du système, avec l'option "Enregistrer l'image" / "Enregistrer
      // dans Photos". On y recourt quand le navigateur le permet pour ce
      // fichier ; sinon on retombe sur le téléchargement classique (desktop).
      const canShareFile = navigator.canShare && navigator.canShare({ files: [file] });
      if (canShareFile) {
        try {
          await navigator.share({ files: [file], title: "Tonal" });
          el.canvasLoading.classList.remove("active");
          el.downloadBtn.disabled = false;
          return;
        } catch (err) {
          // L'utilisateur a annulé le partage, ou celui-ci a échoué :
          // on retombe silencieusement sur le téléchargement classique.
          if (err && err.name === "AbortError") {
            el.canvasLoading.classList.remove("active");
            el.downloadBtn.disabled = false;
            return;
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tonal-photo.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      el.canvasLoading.classList.remove("active");
      el.downloadBtn.disabled = false;
    }, "image/png");
  });

  // ---------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------
  initTheme();
  renderCategories();
  showScreen("category");

})();
