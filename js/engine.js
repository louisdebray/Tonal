/* ==========================================================================
   Tonal : moteur de traitement d'image (Canvas API, 100% local)
   Toutes les fonctions travaillent sur un ImageData / contexte 2D.
   Ordre d'application, fixe et volontaire :
   1. Température  2. Luminosité  3. Contraste  4. Saturation
   5. Courbe filmique (fondu des noirs + split-toning)
   6. Netteté (convolution)  7. Halation (bloom sur les hautes lumières)
   8. Vignette  9. Grain
   ========================================================================== */

const Engine = (() => {

  // Bruit déterministe rapide (évite Math.random() coûteux à chaque frame identique)
  function fastRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function clamp(v, lo = 0, hi = 255) { return v < lo ? lo : v > hi ? hi : v; }

  /**
   * Applique l'ensemble des réglages à un ImageData et retourne un nouvel ImageData.
   * `settings` : objet avec les clés de SLIDER_DEFS (brightness, contrast, ...).
   */
  function applyAll(imageData, settings) {
    const { width, height } = imageData;
    const src = imageData.data;
    const out = new Uint8ClampedArray(src); // copie de travail

    const brightness = settings.brightness || 0; // -100..100
    const contrast = settings.contrast || 0;       // -100..100
    const saturation = settings.saturation || 0;   // -100..100
    const temperature = settings.temperature || 0; // -100..100
    const fade = settings.fade || 0;                // 0..100

    // Facteurs précalculés
    const brightAdd = brightness * 1.3; // -130..130
    const contrastFactor = (100 + contrast) / 100; // pivot autour de 1
    const satFactor = 1 + saturation / 100; // 0..2
    const tempR = temperature > 0 ? temperature * 0.6 : temperature * 0.3;
    const tempB = temperature < 0 ? -temperature * 0.6 : -temperature * 0.3;
    const fadeAmt = fade / 100;
    const blackLift = fadeAmt * 38; // remonte les noirs
    const whiteDrop = fadeAmt * 12; // baisse légèrement les blancs

    for (let i = 0; i < out.length; i += 4) {
      let r = out[i], g = out[i + 1], b = out[i + 2];

      // 1. Température (décale rouge/bleu en sens inverse)
      r = clamp(r + tempR);
      b = clamp(b + tempB);

      // 2. Luminosité
      r = clamp(r + brightAdd);
      g = clamp(g + brightAdd);
      b = clamp(b + brightAdd);

      // 3. Contraste (pivot 128)
      r = clamp((r - 128) * contrastFactor + 128);
      g = clamp((g - 128) * contrastFactor + 128);
      b = clamp((b - 128) * contrastFactor + 128);

      // 4. Saturation (via luminance perçue)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(lum + (r - lum) * satFactor);
      g = clamp(lum + (g - lum) * satFactor);
      b = clamp(lum + (b - lum) * satFactor);

      // 5. Courbe filmique : remonte les noirs, tasse les blancs, et applique
      // un split-toning discret (ombres légèrement froides, hautes lumières
      // légèrement chaudes) pour un rendu pellicule plutôt qu'un simple fondu.
      if (fadeAmt > 0) {
        r = clamp(blackLift + r * (1 - (blackLift + whiteDrop) / 255));
        g = clamp(blackLift + g * (1 - (blackLift + whiteDrop) / 255));
        b = clamp(blackLift + b * (1 - (blackLift + whiteDrop) / 255));

        const lum2 = 0.299 * r + 0.587 * g + 0.114 * b;
        const shadowMix = clamp(1 - lum2 / 140, 0, 1) * fadeAmt;
        const highlightMix = clamp((lum2 - 140) / 115, 0, 1) * fadeAmt;
        b = clamp(b + shadowMix * 9);
        r = clamp(r + highlightMix * 8);
        g = clamp(g + highlightMix * 3);
      }

      out[i] = r; out[i + 1] = g; out[i + 2] = b;
    }

    let result = new ImageData(out, width, height);

    // 6. Netteté (convolution) (passe séparée car nécessite les pixels voisins)
    if (settings.sharpen > 0) {
      result = sharpen(result, settings.sharpen / 100);
    }

    // 7. Halation (bloom chaleureux) sur les hautes lumières, caractéristique
    // de la pellicule (l'émulsion diffuse la lumière autour des zones brûlées).
    if (settings.halation > 0) {
      halation(result, settings.halation / 100);
    }

    // 8. Vignette
    if (settings.vignette > 0) {
      vignette(result, settings.vignette / 100);
    }

    // 9. Grain, appliqué en dernier, après tous les autres traitements
    if (settings.grain > 0) {
      grain(result, settings.grain / 100);
    }

    return result;
  }

  /** Netteté par convolution (unsharp mask simplifié) */
  function sharpen(imageData, amount) {
    const { width, height, data } = imageData;
    const out = new Uint8ClampedArray(data);
    const center = 1 + 4 * amount;
    const side = -amount;
    // noyau : [[0,side,0],[side,center,side],[0,side,0]]
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const top = data[idx - width * 4 + c];
          const bottom = data[idx + width * 4 + c];
          const left = data[idx - 4 + c];
          const right = data[idx + 4 + c];
          const centerVal = data[idx + c];
          const val = centerVal * center + (top + bottom + left + right) * side;
          out[idx + c] = clamp(val);
        }
      }
    }
    return new ImageData(out, width, height);
  }

  // Transition douce (sans à-coup), utilisée pour éviter tout effet de
  // bande visible dans le halo (contrairement à un seuil dur).
  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // Flou boîte séparable (horizontal puis vertical), appliqué en plusieurs
  // passes pour approcher un flou gaussien. Calcul entièrement manuel
  // (pas de <canvas> filter ni de redimensionnement du navigateur) afin
  // d'obtenir un résultat 100% déterministe, sans artefact de mise à
  // l'échelle ni dépendance à une implémentation de flou spécifique.
  function boxBlur(src, w, h, radius, passes) {
    const tmp = new Float32Array(src.length);
    const windowSize = radius * 2 + 1;
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < h; y++) {
        const row = y * w;
        let sum = 0;
        for (let x = -radius; x <= radius; x++) sum += src[row + clamp(x, 0, w - 1)];
        for (let x = 0; x < w; x++) {
          tmp[row + x] = sum / windowSize;
          const outIdx = clamp(x - radius, 0, w - 1);
          const inIdx = clamp(x + radius + 1, 0, w - 1);
          sum += src[row + inIdx] - src[row + outIdx];
        }
      }
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let y = -radius; y <= radius; y++) sum += tmp[clamp(y, 0, h - 1) * w + x];
        for (let y = 0; y < h; y++) {
          src[y * w + x] = sum / windowSize;
          const outIdx = clamp(y - radius, 0, h - 1);
          const inIdx = clamp(y + radius + 1, 0, h - 1);
          sum += tmp[inIdx * w + x] - tmp[outIdx * w + x];
        }
      }
    }
  }

  /**
   * Halation : isole les zones vraiment brûlées (pas les simples tons
   * clairs comme la peau ou un mur éclairé), les teinte chaud, les diffuse
   * avec un flou boîte calculé à la main sur une grille minuscule puis
   * ré-échantillonnée par interpolation bilinéaire, et les réinjecte en
   * fusion "écran" sur l'image d'origine. Aucune étape ne passe par les
   * fonctions de flou ou de redimensionnement du <canvas> : leur
   * comportement varie selon les navigateurs et pouvait produire des
   * liserés ou motifs concentriques autour des sujets. Ce calcul, entouré
   * de types numériques simples, est garanti identique partout.
   */
  function halation(imageData, amount) {
    const { width, height, data } = imageData;
    if (width < 8 || height < 8) return;

    // 1) Réduction en grille minuscule par moyenne de bloc (immunisée
    // contre le moiré, contrairement à un simple sous-échantillonnage).
    const gridMax = 90;
    const cell = Math.max(1, Math.round(Math.max(width, height) / gridMax));
    const gw = Math.max(2, Math.ceil(width / cell));
    const gh = Math.max(2, Math.ceil(height / cell));
    const maskR = new Float32Array(gw * gh);
    const maskG = new Float32Array(gw * gh);
    const maskB = new Float32Array(gw * gh);
    const counts = new Float32Array(gw * gh);

    for (let y = 0; y < height; y++) {
      const gy = Math.min(gh - 1, (y / cell) | 0);
      const rowBase = y * width * 4;
      for (let x = 0; x < width; x++) {
        const idx = rowBase + x * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Seuil élevé : seules les zones réellement proches du blanc
        // (ciel, soleil, sources lumineuses) déclenchent le halo, jamais
        // la peau, un vêtement clair ou un mur éclairé.
        const t = smoothstep(214, 255, lum);
        const gx = Math.min(gw - 1, (x / cell) | 0);
        const gIdx = gy * gw + gx;
        maskR[gIdx] += t; maskG[gIdx] += t; maskB[gIdx] += t; counts[gIdx]++;
      }
    }
    for (let i = 0; i < maskR.length; i++) {
      const c = counts[i] || 1;
      maskR[i] = (maskR[i] / c) * 255;
      maskG[i] = (maskG[i] / c) * 175;
      maskB[i] = (maskB[i] / c) * 95;
    }

    // 2) Flou boîte manuel sur la grille minuscule (bon marché : quelques
    // milliers de valeurs), plusieurs passes pour un rendu bien diffus.
    const radius = Math.max(1, Math.round(Math.min(gw, gh) * 0.16));
    boxBlur(maskR, gw, gh, radius, 3);
    boxBlur(maskG, gw, gh, radius, 3);
    boxBlur(maskB, gw, gh, radius, 3);

    // 3) Ré-échantillonnage bilinéaire de la grille vers la pleine
    // résolution, fusionné en mode "écran" (jamais de palier abrupt).
    const strength = amount * 1.4;
    for (let y = 0; y < height; y++) {
      const fy = (y / cell) - 0.5;
      let gy0 = Math.floor(fy); const wy = fy - gy0;
      gy0 = clamp(gy0, 0, gh - 1);
      const gy1 = clamp(gy0 + 1, 0, gh - 1);
      const rowBase = y * width * 4;
      for (let x = 0; x < width; x++) {
        const fx = (x / cell) - 0.5;
        let gx0 = Math.floor(fx); const wx = fx - gx0;
        gx0 = clamp(gx0, 0, gw - 1);
        const gx1 = clamp(gx0 + 1, 0, gw - 1);

        const i00 = gy0 * gw + gx0, i10 = gy0 * gw + gx1, i01 = gy1 * gw + gx0, i11 = gy1 * gw + gx1;

        const gr = bilerp(maskR, i00, i10, i01, i11, wx, wy) * strength;
        const gg = bilerp(maskG, i00, i10, i01, i11, wx, wy) * strength;
        const gb = bilerp(maskB, i00, i10, i01, i11, wx, wy) * strength;

        const idx = rowBase + x * 4;
        data[idx] = 255 - (255 - data[idx]) * (255 - clamp(gr)) / 255;
        data[idx + 1] = 255 - (255 - data[idx + 1]) * (255 - clamp(gg)) / 255;
        data[idx + 2] = 255 - (255 - data[idx + 2]) * (255 - clamp(gb)) / 255;
      }
    }
  }

  function bilerp(arr, i00, i10, i01, i11, wx, wy) {
    const top = arr[i00] + (arr[i10] - arr[i00]) * wx;
    const bot = arr[i01] + (arr[i11] - arr[i01]) * wx;
    return top + (bot - top) * wy;
  }

  /** Vignette radiale sombre sur les bords */
  function vignette(imageData, amount) {
    const { width, height, data } = imageData;
    const cx = width / 2, cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < height; y++) {
      const dy = y - cy;
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist; // 0 centre .. 1 coin
        const falloff = Math.pow(dist, 2.2);
        const darken = 1 - falloff * amount * 0.85;
        const idx = (y * width + x) * 4;
        data[idx] = clamp(data[idx] * darken);
        data[idx + 1] = clamp(data[idx + 1] * darken);
        data[idx + 2] = clamp(data[idx + 2] * darken);
      }
    }
  }

  /** Grain / bruit : bruit aléatoire par pixel, luminance dominante pour un rendu naturel */
  function grain(imageData, amount) {
    const { data } = imageData;
    const rand = fastRandom(42);
    const intensity = amount * 95;
    const colorBleed = amount * 16; // bruit chromatique plus marqué, façon pellicule couleur
    for (let i = 0; i < data.length; i += 4) {
      const n = (rand() - 0.5) * intensity;
      const cr = (rand() - 0.5) * colorBleed;
      const cb = (rand() - 0.5) * colorBleed;
      data[i] = clamp(data[i] + n + cr);
      data[i + 1] = clamp(data[i + 1] + n);
      data[i + 2] = clamp(data[i + 2] + n + cb);
    }
  }

  return { applyAll, clamp };
})();
