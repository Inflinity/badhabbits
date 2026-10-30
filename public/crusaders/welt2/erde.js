/* Erde: the world of Mundi II as a part other pages can use. It draws the land and the sea floor of Rhodes from real
   heights, the eastern Aegean, the middle levels and close spots, the whole earth as a Mercator map, the sea with its
   shallows, clouds and sky, all in the km frame of Rhodes, into a scene and camera it is given.
   Erde(renderer, scene, camera, base) → { ready (a promise, given the geo data), step(dt, now, focus), yAt, isLand, G, terrain, places }
   The page keeps its own camera and controls; step() wants the point looked at and how far away it is. */
window.Erde = function (renderer, scene, camera, base) {
"use strict";
let gen = null, dived = null;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const q = new URLSearchParams(location.search);
const LON0 = 27.55, LAT0 = 36.52, KM = 111.32, KX = Math.cos(36.17 * Math.PI / 180);
const P = (lon, lat) => [(lon - LON0) * KM * KX, (LAT0 - lat) * KM];
const W0 = -6, W1 = 76, D0 = -6, D1 = 84, WX = W1 - W0, DZ = D1 - D0;
const EX_LAND = 3, EX_SEA = 2.5;

/* ---------------- The coast: the contract ---------------- */
const MRES = 0.03, MW = Math.round(WX / MRES), MH = Math.round(DZ / MRES);
let MASK = null, maskTex = null;
function drawMask(features) {
  const cv = document.createElement("canvas"); cv.width = MW; cv.height = MH; const c = cv.getContext("2d");
  c.fillStyle = "#000"; c.fillRect(0, 0, MW, MH);
  const paths = features.map((f) => new Path2D(f.d));
  // B: how near the coast (a soft glow, for the shallow shelf and the surf)
  const sm = document.createElement("canvas"); sm.width = Math.ceil(MW / 4); sm.height = Math.ceil(MH / 4);
  const s4 = sm.getContext("2d"); s4.globalCompositeOperation = "lighter";
  for (const [blur, a] of [[1.2, 0.6], [5, 0.5]]) {
    s4.save(); s4.filter = `blur(${blur}px)`; s4.setTransform(KM * KX / MRES / 4e5, 0, 0, KM / MRES / 4e5, (-LON0 * KM * KX - W0) / MRES / 4, (LAT0 * KM - D0) / MRES / 4);
    s4.fillStyle = `rgba(0,0,255,${a})`; for (const p of paths) s4.fill(p); s4.restore();
  }
  c.globalCompositeOperation = "lighter"; c.imageSmoothingEnabled = true; c.drawImage(sm, 0, 0, MW, MH);
  // R: land, exactly
  c.save(); c.setTransform(KM * KX / MRES / 1e5, 0, 0, KM / MRES / 1e5, (-LON0 * KM * KX - W0) / MRES, (LAT0 * KM - D0) / MRES);
  c.fillStyle = "#f00"; for (const p of paths) c.fill(p); c.restore();
  const img = c.getImageData(0, 0, MW, MH).data; MASK = new Uint8Array(MW * MH);
  for (let i = 0, j = 0; i < img.length; i += 4, j++) MASK[j] = img[i];
  maskTex = new THREE.CanvasTexture(cv); maskTex.generateMipmaps = false; maskTex.minFilter = maskTex.magFilter = THREE.LinearFilter;
}
const isLand = (x, z) => { const i = Math.floor((x - W0) / MRES), j = Math.floor((z - D0) / MRES); return i >= 0 && j >= 0 && i < MW && j < MH && MASK[j * MW + i] > 127; };

/* ---------------- Heights: land and sea floor, in metres ---------------- */
let HW = 0, HH = 0, HM = null;
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function loadHeights() {
  const img = await loadImage(base + "data/hoehe.png"), cv = document.createElement("canvas"); HW = cv.width = img.width; HH = cv.height = img.height;
  const c = cv.getContext("2d"); c.drawImage(img, 0, 0); const d = c.getImageData(0, 0, HW, HH).data;
  HM = new Float32Array(HW * HH); for (let i = 0; i < HW * HH; i++) HM[i] = d[i * 4] * 256 + d[i * 4 + 1] - 10000;
  // the sea floor comes from coarse soundings and shows their seams as ripples: smooth it (two box passes, 5 px), keep the land sharp
  let A = HM.slice();
  for (let n = 0; n < 2; n++) {
    const B = new Float32Array(A.length);
    for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) { let t = 0, c = 0; for (let k = -2; k <= 2; k++) { const ii = i + k; if (ii >= 0 && ii < HW) { t += A[j * HW + ii]; c++; } } B[j * HW + i] = t / c; }
    for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) { let t = 0, c = 0; for (let k = -2; k <= 2; k++) { const jj = j + k; if (jj >= 0 && jj < HH) { t += B[jj * HW + i]; c++; } } A[j * HW + i] = t / c; }
  }
  for (let i = 0; i < HM.length; i++) if (HM[i] < 0) HM[i] = Math.min(HM[i] * 0.25 + A[i] * 0.75, -1);
}
function hAt(x, z) {
  const gx = clamp(((x - W0) / WX) * HW - 0.5, 0, HW - 1.001), gz = clamp(((z - D0) / DZ) * HH - 0.5, 0, HH - 1.001), i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
  const h = (a, b) => HM[b * HW + a];
  return h(i, j) * (1 - fx) * (1 - fz) + h(i + 1, j) * fx * (1 - fz) + h(i, j + 1) * (1 - fx) * fz + h(i + 1, j + 1) * fx * fz;
}
// distance to the coast, in km, on a 60 m grid (two-pass chamfer): the coarse heights must bow to the coast,
// and the water gets shallow toward the beach
const CR = 2, CW = Math.ceil(MW / CR), CH = Math.ceil(MH / CR); let CD = null, CV = null;
function coastDist() {
  const land = new Uint8Array(CW * CH);
  for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) land[j * CW + i] = MASK[Math.min(MH - 1, j * CR + 1) * MW + Math.min(MW - 1, i * CR + 1)] > 127 ? 1 : 0;
  CD = new Float32Array(CW * CH).fill(1e9); CV = new Float32Array(CW * CH);
  // what kind of shore: how steeply the land rises behind it (the highest ground 250 m inland). Cliffs drop
  // straight into deep water; flat land behind means a beach, a gentle sandy shelf and wide turquoise shallows
  for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
    const k = j * CW + i;
    if ((i > 0 && land[k - 1] !== land[k]) || (j > 0 && land[k - CW] !== land[k]) || (i < CW - 1 && land[k + 1] !== land[k]) || (j < CH - 1 && land[k + CW] !== land[k])) {
      CD[k] = 0.5; const x = W0 + (i + 0.5) * MRES * CR, z = D0 + (j + 0.5) * MRES * CR; let m = 0;
      for (let a = 0; a < 8; a++) m = Math.max(m, hAt(x + Math.cos(a * 0.785) * 0.25, z + Math.sin(a * 0.785) * 0.25));
      CV[k] = clamp((m / 250 - 0.06) / 0.22, 0, 1);
    }
  }
  const pass = (i0, i1, di, j0, j1, dj) => {
    for (let j = j0; j !== j1; j += dj) for (let i = i0; i !== i1; i += di) {
      const k = j * CW + i; let v = CD[k], src = k;
      const t = (n, w) => { if (CD[n] + w < v) { v = CD[n] + w; src = n; } };
      if (i - di >= 0 && i - di < CW) t(k - di, 1);
      if (j - dj >= 0 && j - dj < CH) { t(k - dj * CW, 1);
        if (i - di >= 0 && i - di < CW) t(k - dj * CW - di, 1.4142);
        if (i + di >= 0 && i + di < CW) t(k - dj * CW + di, 1.4142); }
      CD[k] = v; CV[k] = CV[src];
    }
  };
  pass(0, CW, 1, 0, CH, 1); pass(CW - 1, -1, -1, CH - 1, -1, -1);
  for (let k = 0; k < CD.length; k++) CD[k] = Math.max(0, CD[k] - 0.5) * MRES * CR;
  // the kind of shore changes over a few hundred metres, not in sharp wedges: soften it (two box passes, 9 cells)
  for (let n = 0; n < 2; n++) for (const [st, len, cnt, stp] of [[1, CW, CH, CW], [CW, CH, CW, 1]]) {
    const out = new Float32Array(CV.length);
    for (let a = 0; a < cnt; a++) { const base = a * stp; let sum = 0, c = 0;
      for (let b = -4; b < len + 4; b++) { if (b + 4 < len) { sum += CV[base + (b + 4) * st]; c++; } if (b - 5 >= 0) { sum -= CV[base + (b - 5) * st]; c--; } if (b >= 0 && b < len) out[base + b * st] = sum / c; } }
    CV.set(out);
  }
  // for the shader: metres from the beach out to sea (R) and inland (G), square-root scale (fine near the shore), up to 2 km;
  // B: the kind of shore, 0 a flat beach, 1 a cliff
  const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH; const c = cv.getContext("2d"), im = c.createImageData(CW, CH);
  for (let k = 0; k < CD.length; k++) { const v = Math.sqrt(Math.min(1, CD[k] / 2)) * 255; im.data[k * 4] = land[k] ? 0 : v; im.data[k * 4 + 1] = land[k] ? v : 0; im.data[k * 4 + 2] = CV[k] * 255; im.data[k * 4 + 3] = 255; }
  c.putImageData(im, 0, 0); distTex = new THREE.CanvasTexture(cv); distTex.generateMipmaps = false; distTex.minFilter = distTex.magFilter = THREE.LinearFilter;
}
let distTex = null;
const cdAt = (x, z) => CD[clamp(Math.floor((z - D0) / (MRES * CR)), 0, CH - 1) * CW + clamp(Math.floor((x - W0) / (MRES * CR)), 0, CW - 1)];
// the surface as drawn: exaggerated, on the right side of the water line wherever the coast says so,
// and sloping to it: no higher than a steep cliff allows at that distance from the shore
function yAt(x, z) {
  for (const sp of spotsOn) { const u = (x - sp.box[0]) / sp.box[2], v = (z - sp.box[1]) / sp.box[3]; if (u > 0 && v > 0 && u < 1 && v < 1) return spotHAt(sp, u, v) * 0.001 * EX_LAND * wEx; }
  if (!inRhodes(x, z) && RHM && inRegion(x, z)) { const land = regLand(x, z), w = land ? Math.max(hRegion(x, z), 4) : Math.min(hRegion(x, z), -6); return w * 0.001 * (land ? EX_LAND : EX_SEA) * wEx; }
  if (!inRhodes(x, z)) { const w = hWorld(x, z); return w * 0.001 * (w > 0 ? EX_LAND : EX_SEA) * wEx; }
  const h = hAt(x, z), d = cdAt(x, z);
  return isLand(x, z) ? Math.min(Math.max(h, 4) * 0.001 * EX_LAND, 0.004 + d * 0.7) : Math.max(Math.min(h, -6) * 0.001 * EX_SEA, -(0.002 + d * 0.15));
}
/* ---------------- The world, top level: a flat map in the same km frame, so Rhodes sits in it seamlessly ---------------- */
// heights in one grey channel: 128 is sea level, above it the square root of the height up to 7000 m, below it the depth to 11000 m
const WW = 2048, WHT = 1024; let WH = null, worldNTex = null, worldHTex = null, worldSatTex = null;
// the world map is a Mercator map in the km frame of Rhodes: true to angle, so every place keeps its shape (scaled by
// cos 36.17° / cos of its latitude); around Rhodes it matches the island's own frame within a few hundred metres
const MS = (KM * KX * 180) / Math.PI, mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)), M0 = mercY(LAT0);
const G = (lon, lat) => [(lon - LON0) * KM * KX, (M0 - mercY(lat)) * MS];
const lonOf = (x) => LON0 + x / (KM * KX), latOf = (z) => ((2 * Math.atan(Math.exp(M0 - z / MS)) - Math.PI / 2) * 180) / Math.PI;
async function loadWorld() {
  const img = await loadImage(base + "data/welt-hoehe.png"), cv = document.createElement("canvas"); cv.width = WW; cv.height = WHT;
  const c = cv.getContext("2d"); c.drawImage(img, 0, 0); const d = c.getImageData(0, 0, WW, WHT).data; WH = new Float32Array(WW * WHT);
  for (let i = 0; i < WW * WHT; i++) { const v = d[i * 4]; WH[i] = v > 128 ? ((v - 128) / 127) ** 2 * 7000 : -(((128 - v) / 128) ** 2) * 11000; }
  // the grey steps of the coding would show as terraces in the shade: smooth the heights a little (two 3x3 passes)
  for (let n = 0; n < 2; n++) { const A = WH.slice();
    for (let j = 1; j < WHT - 1; j++) for (let i = 0; i < WW; i++) { let t = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) t += A[(j + b) * WW + ((i + a + WW) % WW)];
      const k = j * WW + i, m = t / 9; if ((m > 0) === (A[k] > 0)) WH[k] = m; } }
  worldHTex = new THREE.Texture(img); worldHTex.needsUpdate = true; worldHTex.minFilter = worldHTex.magFilter = THREE.LinearFilter; worldHTex.generateMipmaps = false;
  // normals for the hill shade, with the relief raised more than at Rhodes so that whole ranges read on the map
  const [nc, nx, ni] = cv2d(WW, WHT), dx = (360 / WW) * KM * KX * 1000, dz = (180 / WHT) * KM * 1000;
  for (let j = 0; j < WHT; j++) for (let i = 0; i < WW; i++) {
    const k = j * WW + i, ex = WH[k] > 0 ? 12 : 6;
    const hx = (WH[j * WW + ((i + 1) % WW)] - WH[j * WW + ((i + WW - 1) % WW)]) / (2 * dx) * ex, hz = (WH[Math.min(WHT - 1, j + 1) * WW + i] - WH[Math.max(0, j - 1) * WW + i]) / (2 * dz) * ex;
    const L = Math.hypot(hx, 1, hz); ni.data[k * 4] = (-hx / L * 0.5 + 0.5) * 255; ni.data[k * 4 + 1] = (-hz / L * 0.5 + 0.5) * 255; ni.data[k * 4 + 3] = 255;
  }
  nx.putImageData(ni, 0, 0); worldNTex = ctex(nc);
}
function hWorld(x, z) {
  const gx = clamp(((lonOf(x) + 180) / 360) * WW - 0.5, 0, WW - 1.001), gz = clamp(((90 - latOf(z)) / 180) * WHT - 0.5, 0, WHT - 1.001), i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
  const h = (a, b) => WH[b * WW + a];
  return h(i, j) * (1 - fx) * (1 - fz) + h(i + 1, j) * fx * (1 - fz) + h(i, j + 1) * (1 - fx) * fz + h(i + 1, j + 1) * fx * fz;
}
const inRhodes = (x, z) => x > W0 && x < W1 && z > D0 && z < D1;
/* ---------------- The middle level: the eastern Aegean, 25.0–30.5° E, 34.8–38.6° N ---------------- */
const RX0 = (25.0 - LON0) * KM * KX, RX1 = (30.5 - LON0) * KM * KX, RZ0 = (LAT0 - 38.6) * KM, RZ1 = (LAT0 - 34.8) * KM;
let RHM = null, RHW = 0, RHH = 0, RMK = null, RMW = 0, RMH = 0, region = null;
const inRegion = (x, z) => x > RX0 && x < RX1 && z > RZ0 && z < RZ1;
const greyH = (v) => (v > 128 ? ((v - 128) / 127) ** 2 * 7000 : -(((128 - v) / 128) ** 2) * 11000);
function hRegion(x, z) {
  const gx = clamp(((x - RX0) / (RX1 - RX0)) * RHW - 0.5, 0, RHW - 1.001), gz = clamp(((z - RZ0) / (RZ1 - RZ0)) * RHH - 0.5, 0, RHH - 1.001), i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
  const h = (a, b) => RHM[b * RHW + a];
  return h(i, j) * (1 - fx) * (1 - fz) + h(i + 1, j) * fx * (1 - fz) + h(i, j + 1) * (1 - fx) * fz + h(i + 1, j + 1) * fx * fz;
}
const regLand = (x, z) => { const i = clamp(Math.floor(((x - RX0) / (RX1 - RX0)) * RMW), 0, RMW - 1), j = clamp(Math.floor(((z - RZ0) / (RZ1 - RZ0)) * RMH), 0, RMH - 1); return RMK[j * RMW + i] > 127; };
async function loadRegion() {
  // ost-land: the coast at 120 m from OSM's full land polygons, the contract here; ost-kueste: at 250 m with the distance to land
  const [hi, mi, li] = await Promise.all([loadImage(base + "data/ost-hoehe.png"), loadImage(base + "data/ost-kueste.png"), loadImage(base + "data/ost-land.png")]);
  const read = (img) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data; };
  const hd = read(hi); RHW = hi.width; RHH = hi.height; RHM = new Float32Array(RHW * RHH); for (let i = 0; i < RHM.length; i++) RHM[i] = greyH(hd[i * 4]);
  const md = read(li); RMW = li.width; RMH = li.height; RMK = new Uint8Array(RMW * RMH); for (let i = 0; i < RMK.length; i++) RMK[i] = md[i * 4];
  // normals for the shade, raised a little more than at Rhodes
  const [nc, nx, ni] = cv2d(RHW, RHH), dx = ((RX1 - RX0) / RHW) * 1000, dz = ((RZ1 - RZ0) / RHH) * 1000;
  for (let j = 0; j < RHH; j++) for (let i = 0; i < RHW; i++) {
    const k = j * RHW + i, ex = RHM[k] > 0 ? 4 : 2.5;
    const hx = (RHM[j * RHW + Math.min(RHW - 1, i + 1)] - RHM[j * RHW + Math.max(0, i - 1)]) / (2 * dx) * ex, hz = (RHM[Math.min(RHH - 1, j + 1) * RHW + i] - RHM[Math.max(0, j - 1) * RHW + i]) / (2 * dz) * ex;
    const L = Math.hypot(hx, 1, hz); ni.data[k * 4] = (-hx / L * 0.5 + 0.5) * 255; ni.data[k * 4 + 1] = (-hz / L * 0.5 + 0.5) * 255; ni.data[k * 4 + 3] = 255;
  }
  nx.putImageData(ni, 0, 0);
  const tex = (img) => { const t = new THREE.Texture(img); t.needsUpdate = true; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; return t; };
  U.uRegH.value = tex(hi); U.uRegM.value = tex(mi); U.uRegL.value = tex(li); U.uRegN.value = ctex(nc); U.uRBox.value.set(RX0, RZ0, RX1 - RX0, RZ1 - RZ0);
  const sat = await new THREE.TextureLoader().loadAsync(base + "data/ost.jpg"); sat.anisotropy = 4; U.uRegSat.value = sat;
  regionMesh(); U.uRegOn.value = 1;
}
let wEx = 1;      // far out the world's relief is raised further, or the Alps would be a scratch
// relief texture for the shaders: R land height, G depth (square-root scale); normals (RG) with ambient occlusion (B)
let reliefTex = null, normalTex = null, geoTex = null, shadowTex = null, EH = null;
const cv2d = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); return [c, x, x.createImageData(w, h)]; };
const ctex = (c) => { const t = new THREE.CanvasTexture(c); t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; return t; };
function buildRelief() {
  const [a, ca, ia] = cv2d(HW, HH), [b, cb, ib] = cv2d(HW, HH), [g, cg, ig] = cv2d(HW, HH);
  const dx = (WX / HW) * 1000, dz = (DZ / HH) * 1000, cell = WX / HW;
  EH = new Float32Array(HW * HH); for (let k = 0; k < EH.length; k++) EH[k] = HM[k] * 0.001 * (HM[k] > 0 ? EX_LAND : EX_SEA);      // as drawn, km
  // a smooth regional noise, for where one rock gives way to another
  const rn = (x, z, f, sd) => { const v = (i, j) => { const t = Math.sin(i * 127.1 + j * 311.7 + sd * 74.7) * 43758.5453; return t - Math.floor(t); };
    const X = x * f, Z = z * f, i = Math.floor(X), j = Math.floor(Z), u = X - i, w = Z - j, sm = (t) => t * t * (3 - 2 * t);
    return v(i, j) * (1 - sm(u)) * (1 - sm(w)) + v(i + 1, j) * sm(u) * (1 - sm(w)) + v(i, j + 1) * (1 - sm(u)) * sm(w) + v(i + 1, j + 1) * sm(u) * sm(w); };
  // rivers: every land cell drains to its lowest neighbour; what gathers much water cuts a gravel bed
  const acc = new Float32Array(HW * HH).fill(1), order = [...Array(HW * HH).keys()].filter((k) => HM[k] > 0).sort((p, q) => HM[q] - HM[p]);
  for (const k of order) { const i = k % HW, j = (k / HW) | 0; let best = -1, bh = HM[k];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if ((di || dj) && ii >= 0 && jj >= 0 && ii < HW && jj < HH && HM[jj * HW + ii] < bh) { bh = HM[jj * HW + ii]; best = jj * HW + ii; } }
    if (best >= 0) acc[best] += acc[k]; }
  for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) {
    const k = j * HW + i, h = HM[k], ex = h > 0 ? EX_LAND : EX_SEA;
    const hx = (HM[j * HW + Math.min(HW - 1, i + 1)] - HM[j * HW + Math.max(0, i - 1)]) / (2 * dx) * ex, hz = (HM[Math.min(HH - 1, j + 1) * HW + i] - HM[Math.max(0, j - 1) * HW + i]) / (2 * dz) * ex;
    const tanS = Math.hypot(hx, hz) / ex, sx_ = hx * 0.6, sz_ = hz * 0.6, L = Math.hypot(sx_, 1, sz_), nx = -sx_ / L, nz = -sz_ / L;      // light the relief a little gentler than it is drawn
    // ambient occlusion: how much of the sky the valley walls hide (8 directions, 4 distances)
    let occ = 0;
    for (let d = 0; d < 8; d++) { const ax = Math.cos(d * Math.PI / 4), az = Math.sin(d * Math.PI / 4); let m = 0;
      for (const r of [1, 3, 8, 20]) { const ii = clamp(Math.round(i + ax * r), 0, HW - 1), jj = clamp(Math.round(j + az * r), 0, HH - 1); m = Math.max(m, (EH[jj * HW + ii] - EH[k]) / (r * cell)); }
      occ += Math.atan(m) / (Math.PI / 2); }
    const ao = clamp(1 - occ / 8 * 1.6, 0, 1);
    ia.data[k * 4] = clamp(h / 1300, 0, 1) * 255; ia.data[k * 4 + 1] = Math.sqrt(clamp(-h / 4500, 0, 1)) * 255; ia.data[k * 4 + 3] = 255;
    ib.data[k * 4] = (nx * 0.5 + 0.5) * 255; ib.data[k * 4 + 1] = (nz * 0.5 + 0.5) * 255; ib.data[k * 4 + 2] = ao * 255; ib.data[k * 4 + 3] = 255;
    // the rocks of Rhodes, beer-mat geology: grey Mesozoic limestone and marble on the high massifs and sea cliffs,
    // brown flysch (sandstone and shale) in the hills, pale Neogene marls on the low plains, mostly in the north
    const x = W0 + (i + 0.5) * cell, z = D0 + (j + 0.5) * (DZ / HH), lat = LAT0 - z / KM, lon = LON0 + x / (KM * KX);
    const reg = rn(x, z, 0.28, 1) - 0.5, reg2 = rn(x, z, 0.9, 2) - 0.5;
    let lime = clamp((h - 380) / 400, 0, 1) + clamp((tanS - 0.3) / 0.35, 0, 1) * 0.7 + reg * 0.7 + reg2 * 0.3;
    if (lat > 36.47 || (lon < 27.74 && lat > 36.18) || lon > 28.3) lime += 0.45;      // Turkey, Symi, Chalki: limestone lands
    let marl = clamp((230 - h) / 180, 0, 1) * clamp(1 - tanS * 4, 0, 1) * (lat > 36.24 ? 1 : 0.65) + reg * 0.5 - reg2 * 0.3;
    lime = clamp(lime, 0, 1); marl = clamp(marl, 0, 1 - lime);
    const fl = h > 0 ? clamp((Math.log(acc[k]) - Math.log(40)) / (Math.log(4000) - Math.log(40)), 0, 1) : 0;
    ig.data[k * 4] = lime * 255; ig.data[k * 4 + 1] = marl * 255; ig.data[k * 4 + 2] = fl * 255; ig.data[k * 4 + 3] = 255;
  }
  ca.putImageData(ia, 0, 0); cb.putImageData(ib, 0, 0); cg.putImageData(ig, 0, 0);
  reliefTex = ctex(a); normalTex = ctex(b); geoTex = ctex(g);
  const [sc] = cv2d(HW, HH); shadowTex = ctex(sc);
}
// cast shadows of the mountains for where the sun stands: march toward the sun over the drawn heights
let shadowFor = null;
function castShadows(sun) {
  if (sun.y < 0.01) return;
  if (shadowFor && shadowFor.angleTo(sun) < 0.004) return; shadowFor = sun.clone();
  const cv = shadowTex.image, c = cv.getContext("2d"), im = c.createImageData(HW, HH), cell = WX / HW, hl = Math.hypot(sun.x, sun.z) || 1e-6;
  const sx = sun.x / hl, sz = sun.z / hl, tn = sun.y / hl, STEPS = [1, 2, 3, 4, 6, 8, 11, 15, 20, 27, 36, 48, 64, 85, 113, 150];
  for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) {
    const k = j * HW + i, h0 = EH[k]; let v = 9;
    for (const r of STEPS) { const ii = Math.round(i + sx * r), jj = Math.round(j + sz * r); if (ii < 0 || jj < 0 || ii >= HW || jj >= HH) break;
      const t = r * cell, ray = h0 + t * tn; if (ray > 3.8) break; v = Math.min(v, (ray - EH[jj * HW + ii]) / (t * 0.035 + 0.02)); }
    im.data[k * 4] = clamp(0.5 + v * 0.5, 0, 1) * 255; im.data[k * 4 + 3] = 255;
  }
  c.putImageData(im, 0, 0); shadowTex.needsUpdate = true;
}

/* ---------------- Clouds: a tileable noise, two octaves of it make cumulus ---------------- */
function cloudNoise() {
  const N = 256, cv = document.createElement("canvas"); cv.width = cv.height = N; const c = cv.getContext("2d"), im = c.createImageData(N, N);
  const g = (s) => { const a = new Float32Array(s * s); for (let i = 0; i < a.length; i++) a[i] = Math.random(); return a; };
  const oct = [[4, 0.5, g(4)], [8, 0.25, g(8)], [16, 0.14, g(16)], [32, 0.07, g(32)], [64, 0.04, g(64)]];
  const sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0;
    for (const [s, w, a] of oct) { const fx = (x / N) * s, fy = (y / N) * s, i = Math.floor(fx), j = Math.floor(fy), u = sm(fx - i), t = sm(fy - j), I = (i + 1) % s, J = (j + 1) % s;
      v += w * (a[j * s + i] * (1 - u) * (1 - t) + a[j * s + I] * u * (1 - t) + a[J * s + i] * (1 - u) * t + a[J * s + I] * u * t); }
    const k = (y * N + x) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = clamp(v, 0, 1) * 255; im.data[k + 3] = 255;
  }
  c.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/* ---------------- The sun, where it really stands over Rhodes ---------------- */
function sunNow(date) {
  const d = date.getTime() / 864e5 + 2440587.5 - 2451545, r = Math.PI / 180;
  const g = (357.529 + 0.98560028 * d) * r, qq = 280.459 + 0.98564736 * d;
  const L = (qq + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r, e = (23.439 - 0.00000036 * d) * r;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) * 15 * r, H = gmst + 28.0 * r - ra, lat = 36.2 * r;
  const east = -Math.cos(dec) * Math.sin(H), north = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(H) * Math.sin(lat);
  const up = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(H) * Math.cos(lat);
  return new THREE.Vector3(east, up, -north).normalize();
}
// no day and night: always the same light, from the west-south-west at 38°, so that with north up the relief
// stands out instead of looking sunk in
function sunDir() { const az = (250 * Math.PI) / 180, el = (38 * Math.PI) / 180; return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize(); }

/* ---------------- Shaders ---------------- */
const COMMON = `
  uniform vec3 uSun, uSunCol, uZen, uHor, uCam; uniform float uTime, uHaze, uCloudCov, uCloudH, uClouds;
  uniform sampler2D uMask, uRelief, uNormal, uCloud, uDist, uGeo, uShadow; uniform vec4 uBox; uniform vec2 uCloudOff;
  uniform float uLife, uVeg, uHeat, uGrow, uLevel, uShadowK, uNear, uWEx; uniform sampler2D uWorld, uWorldN, uWorldSat;
  vec2 worldUv(vec2 p) { float lon = ${LON0.toFixed(4)} + p.x / ${(KM * KX).toFixed(4)}, lat = degrees(2.0 * atan(exp(${M0.toFixed(6)} - p.y / ${MS.toFixed(4)})) - 1.5707963); return vec2((lon + 180.0) / 360.0, (lat + 90.0) / 180.0); }
  // three levels of detail: Rhodes (0), the eastern Aegean (1), the world (2). At their seams they are mixed pixel by
  // pixel: over the last 10 km inside the Rhodes box, over the last 25 km inside the Aegean one
  uniform float uWorldOn, uRegOn; uniform vec4 uRBox; uniform sampler2D uRegH, uRegM, uRegL, uRegN, uRegSat;
  // which model draws a pixel is decided where the pixel's ray meets sea level, the same point for every model,
  // not where each model's own surface happens to be: otherwise at a seam sometimes none of them draws
  vec2 refP(vec2 p) { if (uCam.y < 0.002 || uCam.y <= vP.y + 0.001) return p; return uCam.xz + (vP.xz - uCam.xz) * (uCam.y / (uCam.y - vP.y)); }
  float edgeIn(vec2 p, vec4 b) { return min(min(p.x - b.x, b.x + b.z - p.x), min(p.y - b.y, b.y + b.w - p.y)); }
  float lod(vec2 p) {
    p = refP(p);
    float inR = edgeIn(p, uBox);
    if (uWorldOn < 0.5) return inR > 0.0 ? 0.0 : 3.0;
    float r = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (r < smoothstep(0.0, 10.0, inR)) return 0.0;
    if (uRegOn > 0.5 && r < smoothstep(0.0, 25.0, edgeIn(p, uRBox))) return 1.0;
    return 2.0;
  }
  float useRhodes(vec2 p) { return lod(p) < 0.5 ? 1.0 : 0.0; }
  // close spots (Stuttgart, Salach, Trégastel): inside their box they draw everything, land and water; the last
  // 1.5 km of the box is mixed with the world pixel by pixel
  uniform vec4 uSB[4], uMB[2];
  float spotHere(vec2 p) {
    if (uWorldOn < 0.5) return 0.0;
    p = refP(p);
    float r = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    for (int i = 0; i < 4; i++) if (uSB[i].z > 0.0 && r < smoothstep(0.0, 1.5, edgeIn(p, uSB[i]))) return 1.0;
    return 0.0;
  }
  // the middle level of these spots (South-West Germany, Brittany): mixed with the world over its last 15 km
  float midHere(vec2 p) {
    if (uWorldOn < 0.5) return 0.0;
    p = refP(p);
    float r = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    for (int i = 0; i < 2; i++) if (uMB[i].z > 0.0 && r < smoothstep(0.0, 15.0, edgeIn(p, uMB[i]))) return 1.0;
    return 0.0;
  }
  float anySpot(vec2 p) { return max(spotHere(p), midHere(p)); }
  vec2 regUv(vec2 p) { return vec2((p.x - uRBox.x) / uRBox.z, 1.0 - (p.y - uRBox.y) / uRBox.w); }
  float regH(vec2 p) { float v = texture2D(uRegH, regUv(p)).r * 255.0; return v > 128.0 ? pow((v - 128.0) / 127.0, 2.0) * 7000.0 : -pow((128.0 - v) / 128.0, 2.0) * 11000.0; }
  float worldH(vec2 p) { float v = texture2D(uWorld, worldUv(p)).r * 255.0; return v > 128.0 ? pow((v - 128.0) / 127.0, 2.0) * 7000.0 : -pow((128.0 - v) / 128.0, 2.0) * 11000.0; }
  float nz0(vec2 p) { return texture2D(uCloud, p).r; }
  // the game's map of the land (Mundi I): G holds its main roads (about 0.6) and its beaches (high)
  uniform sampler2D uGame; uniform vec4 uGBox; uniform float uGameOn;
  float ghash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
  // the noise tile repeats every so often, and the eye finds the grid: so always two copies, turned and scaled apart
  float nz(vec2 p) {
    p += (vec2(nz0(p * 0.047 + 0.1), nz0(p * 0.047 + 0.6)) - 0.5) * 9.0;      // a slow warp: no straight rows left to follow
    vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * p * 1.37 + vec2(0.37, 0.71);
    return clamp(0.5 + (nz0(p) + nz0(q) - 1.0) * 0.68, 0.0, 1.0);      // two grids at odd angles and scales never line up again
  }
  float gRough = 0.0, gReef = 0.0, gEdge = 0.0, gIn = 0.0, gFNOn = 0.0; vec2 gUv = vec2(0.0); vec3 gFN = vec3(0.0, 1.0, 0.0);
  vec3 unpackN(vec2 t) { vec2 n = t * 2.0 - 1.0; return normalize(vec3(n.x, sqrt(max(0.0, 1.0 - dot(n, n))), n.y)); }
  // the satellite picture thrown over everything like a projector, 17 %: the built world underneath carries the look
  const float PROJ = 0.17;      // how much of the swell is too small to draw here: it widens and dims the glitter instead
  // the swell, as height (km): the same waves whose slopes make the glitter
  float surfH(vec2 p) {
    return 0.3 * 0.05 / 55.0 * sin(dot(vec2(0.94, 0.34), p) * 55.0 + uTime * 1.9) + 0.04 / 97.0 * sin(dot(vec2(0.6, 0.8), p) * 97.0 + uTime * 2.5)
         * 0.3 + 0.3 * 0.03 / 171.0 * sin(dot(vec2(-0.3, 0.95), p) * 171.0 + uTime * 3.3);
  }
  // is this pixel seen from under water? decided where its ray leaves the lens, so a lens at the surface splits the picture
  // the lens is a dome of 1.5 m: held in the surface it shows above and below at once, split by the wavy waterline
  float underPix(vec3 p) { vec3 np = uCam + normalize(p - uCam) * 0.0015; return np.y - surfH(np.xz); }
  vec3 uwFog() { return vec3(0.0, 0.085, 0.12) * (uSunCol * max(uSun.y, 0.0) * 1.3 + uZen * 0.5) * exp(min(uCam.y, 0.0) * 18.0); }
  // the sea floor seen through clear water: sand, rock on the slopes, dark meadows of Posidonia
  vec3 floorAlb(vec2 xz, float depth, float steep) {
    // meadows of Posidonia from 8 to 35 m, in big soft-edged patches; far away only their average darkening
    float far = clamp(length(uCam.xz - xz) / 25.0, 0.0, 1.0);
    float n1 = mix(nz(xz * 0.3) * 0.7 + nz(xz * 1.3) * 0.3, 0.5, far), n2 = mix(nz(xz * 4.1 + 0.5), 0.5, far);
    float grass = smoothstep(0.46, 0.56, n1) * smoothstep(6.0, 12.0, depth) * (1.0 - smoothstep(30.0, 40.0, depth));
    grass = mix(grass, 0.45 * smoothstep(6.0, 12.0, depth) * (1.0 - smoothstep(30.0, 40.0, depth)), far);
    vec3 c = mix(vec3(0.86, 0.8, 0.64), vec3(0.72, 0.66, 0.52), n2);
    c = mix(c, vec3(0.42, 0.4, 0.36) * (0.8 + 0.4 * n2), clamp(smoothstep(0.1, 0.35, steep) + smoothstep(0.72, 0.8, n2) * 0.6, 0.0, 1.0));
    c = mix(c, vec3(0.07, 0.11, 0.06), grass * (1.0 - gReef));
    // the shoal: rock with algae turf, ochre and olive and dark heads, sand between
    float m1 = mix(nz(xz * 2.3 + 0.1), 0.5, far), m2 = mix(nz(xz * 7.9 + 0.6), 0.5, far);
    vec3 reef = mix(vec3(0.64, 0.57, 0.41), vec3(0.3, 0.32, 0.2), smoothstep(0.35, 0.65, m1));
    reef = mix(reef, vec3(0.12, 0.14, 0.1), smoothstep(0.5, 0.7, m2) * 0.85);
    reef = mix(reef, vec3(0.86, 0.8, 0.64), mix(smoothstep(0.62, 0.7, nz(xz * 1.7 + 0.5)), 0.15, far));
    return mix(c, reef, gReef);
  }
  // sunlight focused by the waves, dancing on a shallow floor
  float caustic(vec2 xz, float depth) {
    float a = nz(xz * 38.0 + vec2(uTime * 0.013, 0.0)), b = nz(xz * 41.0 - vec2(0.0, uTime * 0.011) + 0.3);
    return pow(1.0 - abs(a - b), 10.0) * 1.5 * exp(-depth * 0.12);
  }
  vec2 boxUv(vec2 p) { return vec2((p.x - uBox.x) / uBox.z, 1.0 - (p.y - uBox.y) / uBox.w); }
  float inBox(vec2 uv) { return step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0); }
  float cloudD(vec2 p) {
    if (uClouds < 0.5) return 0.0;
    vec2 uv = p / 22.0 + uCloudOff;
    float n = nz(uv) * 0.62 + nz(uv * 2.9 + 0.37) * 0.38;
    // weather comes in fields: here a clear stretch, there a crowd of clouds, a few hundred km across
    float cov = clamp(uCloudCov + (nz0(p / 330.0 + uCloudOff * 0.05 + 0.3) - 0.5) * 0.9, 0.0, 0.62);
    return smoothstep(1.0 - cov, 1.0 - cov + 0.22, n);
  }
  float cloudShadow(vec3 p) { vec2 q = p.xz + uSun.xz / max(uSun.y, 0.15) * (uCloudH - p.y); return 1.0 - 0.62 * cloudD(q); }
  vec3 skyCol(vec3 d) { float h = clamp(d.y, 0.0, 1.0); return mix(uHor, uZen, pow(h, 0.5)); }
  // aerial haze lives low in the air (scale height 1.6 km): from high up you look through little of it
  vec3 haze(vec3 col, vec3 p) {
    float dist = length(uCam - p), H = 1.6, a = max(p.y, 0.0), b = max(uCam.y, 0.0);
    float dens = abs(b - a) > 0.01 ? H * (exp(-a / H) - exp(-b / H)) / (b - a) : exp(-a / H);
    float f = 1.0 - exp(-dist * uHaze * dens);
    return mix(col, uHor * 0.92, f);
  }
  vec3 finish(vec3 col, vec3 p) {
    float e = underPix(p);
    if (e < 0.0) {
      float L = length(p - uCam) * 1000.0; vec3 T = exp(-vec3(0.25, 0.035, 0.015) * L); col = col * T + uwFog() * (1.0 - exp(-L * 0.03));
      // shafts of sunlight slanting down through the water, toward where the sun shines in
      vec3 rd = normalize(p - uCam), sw = refract(-uSun, vec3(0.0, 1.0, 0.0), 0.75);
      float toward = pow(max(dot(rd, -sw), 0.0), 5.0), sh = nz(vec2(rd.x / (abs(rd.y) + 0.3) * 3.0 + uTime * 0.01, rd.z / (abs(rd.y) + 0.3) * 3.0));
      col += uSunCol * vec3(0.25, 0.6, 0.65) * toward * pow(sh, 3.0) * (1.0 - exp(-L * 0.02)) * 0.6 * max(uSun.y, 0.0);
    } else col = haze(col, p);
    // the line where the lens cuts the surface
    return mix(col, vec3(0.02, 0.07, 0.09), (1.0 - smoothstep(0.0, 0.00004, abs(e))) * 0.85);
  }
  // light under water: red is swallowed first, then green; sand banks shine turquoise, the deep goes ultramarine
  vec3 waterCol(vec3 p, float depth, float shore, vec3 N, vec3 V, float sh, float steep, float cliff) {
    // clear Aegean water: down to the floor and back up, red is gone after a few metres, green after twenty, blue lasts
    vec3 T = exp(-vec3(0.36, 0.05, 0.022) * depth * 2.0);
    float far = clamp(length(uCam - p) / 6.0, 0.0, 1.0);
    // the floor seen through moving water wobbles: look it up where the waves bend the ray
    vec2 q = p.xz + N.xz * depth * 0.002;
    vec3 floorA = floorAlb(q, depth, steep) * (1.0 + caustic(q, depth) * (1.0 - far) * sh);
    vec3 light = uSunCol * max(uSun.y, 0.0) * sh * 1.25 + uZen * 0.35;
    vec3 scatter = vec3(0.003, 0.042, 0.12);
    // the open sea takes its blue from the real depth: lighter over the shelf, ink over the basin;
    // and a little of the floor's relief always shows through, most when looking straight down
    float abyss = smoothstep(60.0, 2500.0, depth);
    vec3 sc = scatter * mix(vec3(1.25, 1.25, 1.12), vec3(0.7, 0.72, 0.85), abyss);
    vec3 col = floorA * T * light + sc * (1.0 - T.b * 0.6) * light * 1.6;
    if (gFNOn > 0.5) {
      // the relief of the floor shows through by about 7-8 %, most when looking straight down
      float hs = dot(gFN, normalize(uSun + vec3(0.0, 0.6, 0.0)));
      col *= 1.0 + clamp((hs - 0.9) * 1.6, -0.6, 0.3) * pow(max(V.y, 0.0), 1.2) * smoothstep(20.0, 120.0, depth) * 0.75;
    }
    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    vec3 R = reflect(-V, N); R.y = abs(R.y);
    col = mix(col, skyCol(R), fres);
    float rs = max(dot(R, uSun), 0.0);
    float rough = clamp(gRough, 0.0, 1.0);
    col += uSunCol * (pow(rs, mix(900.0, 90.0, rough)) * mix(9.0, 0.6, rough) + pow(rs, mix(60.0, 10.0, rough)) * mix(0.25, 0.07, rough)) * sh;
    // surf where the sea meets the land
    // surf: on a beach the swash runs wide and in bands; at a cliff the foam clings to the rock in a thin seam
    float sw = mix(30.0, 7.0, cliff);
    float surf = smoothstep(sw, 1.0, shore) * smoothstep(0.3, 0.9, 0.5 + 0.5 * sin(shore * mix(0.25, 0.9, cliff) + uTime * 1.3 + sin(p.x * 40.0 + p.z * 31.0) * 1.5));
    col = mix(col, vec3(0.9, 0.93, 0.94) * (0.45 + 0.55 * sh), clamp(surf * mix(0.45, 0.6, cliff) + smoothstep(mix(5.0, 3.0, cliff), 0.0, shore) * 0.3 + gEdge * 0.7, 0.0, 1.0));
    return col;
  }
  vec3 waves(vec2 p, float dist) {
    vec2 s = vec2(0.0); float tm = uTime, kept = 0.0;
    vec2 D0 = vec2(0.94, 0.34), D1 = vec2(0.6, 0.8), D2 = vec2(-0.3, 0.95), D3 = vec2(0.98, -0.2);
    // a wave smaller than a few pixels only flickers: fade it out, its slope goes into roughness instead
    float fp = dist * 0.0012;
    #define WV(D, k, sp, a) { float f_ = clamp((6.283 / k / fp - 10.0) / 10.0, 0.0, 1.0); s += D * cos(dot(D, p) * k + tm * sp) * a * f_; kept += f_ * a; }
    WV(D0, 55.0, 1.9, 0.05) WV(D1, 97.0, 2.5, 0.04) WV(D2, 171.0, 3.3, 0.03) WV(D3, 310.0, 4.4, 0.02)
    WV(vec2(0.2, -0.98), 1300.0, 9.0, 0.05) WV(vec2(-0.8, 0.6), 2900.0, 13.0, 0.04)
    gRough = 1.0 - kept / 0.23;
    return normalize(vec3(-s.x, 1.0, -s.y));
  }
  // close to the eye the land becomes the model landscape of Mundi I: a patchwork of fields on the flat lowland
  // (wheat, olive groves, green, ploughed) with hedges between, and the main roads as pale bands. Far away it fades
  // back into the real picture, so from a plane it is the true island, and on foot a little model railway
  vec3 gameGround(vec3 col, vec3 p, float h, float steep, vec3 lit) {
    if (uGameOn < 0.5) return col;
    float dist = length(uCam - p), nearK = 1.0 - smoothstep(1.5, 6.0, dist);
    vec2 gu = vec2((p.x - uGBox.x) / uGBox.z, 1.0 - (p.z - uGBox.y) / uGBox.w);
    vec4 gm = (gu.x > 0.0 && gu.y > 0.0 && gu.x < 1.0 && gu.y < 1.0) ? texture2D(uGame, gu) : vec4(0.0);
    if (nearK > 0.001) {
      vec2 fp = mat2(0.88, -0.47, 0.47, 0.88) * p.xz * 6.5; fp.y += floor(fp.x) * 0.37;
      vec2 cell = floor(fp), fr = fract(fp); float hc = ghash(cell);
      float flat_ = smoothstep(0.1, 0.03, steep) * (1.0 - smoothstep(160.0, 380.0, h)) * smoothstep(0.42, 0.56, nz(p.xz * 0.09 + 7.0)) * (1.0 - smoothstep(0.55, 0.8, gm.g)) * step(0.5, gm.r);
      vec3 field = hc < 0.28 ? vec3(0.86, 0.73, 0.42) : hc < 0.52 ? vec3(0.42, 0.53, 0.26) : hc < 0.74 ? vec3(0.56, 0.70, 0.30) : hc < 0.9 ? vec3(0.62, 0.46, 0.30) : vec3(0.78, 0.66, 0.38);
      field *= 0.9 + 0.2 * nz(p.xz * 23.0);
      float hedge = 1.0 - smoothstep(0.0, 0.05, min(min(fr.x, 1.0 - fr.x), min(fr.y, 1.0 - fr.y)));
      field = mix(field, vec3(0.30, 0.40, 0.20), hedge * 0.7);
      col = mix(col, field * field * lit, flat_ * 0.72 * nearK);
    }
    // the main roads: pale dust, from near to quite far
    float road = smoothstep(0.2, 0.45, gm.g) * (1.0 - smoothstep(0.62, 0.8, gm.g)) * step(0.5, gm.r);
    col = mix(col, vec3(0.74, 0.66, 0.53) * lit, road * (1.0 - smoothstep(10.0, 40.0, dist)) * 0.85);
    return col;
  }
  float shoreAt(vec2 uv) { float s = texture2D(uDist, uv).r; return s * s * 2000.0; }
  // rocky shoals and reef flats: platforms that hug the shore (wide off flat land, narrow under cliffs) and now and
  // then lie offshore; their rim is sharp, the floor drops from a metre or two into the blue
  float shoal(vec2 p, float shore, float cliff, float dem) {
    float n = nz(p * 0.22) * 0.65 + nz(p * 0.9 + 0.4) * 0.35, reach = mix(700.0, 100.0, cliff);
    float th = 0.5 + 0.2 * smoothstep(0.0, reach, shore);
    // beyond their reach only where the sea floor really is shallow (the height model knows a shelf)
    th += 0.4 * smoothstep(reach, reach * 1.6, shore) * smoothstep(25.0, 60.0, dem);
    return smoothstep(th, th + 0.05, n);
  }
  // the shelf in front of a shore, as a gradient and not as a strip: how far the shallows reach changes along the
  // coast (wide fans in the bays, narrow at the headlands), the floor sinks in a long curve, and patches of sand
  // and weed make it lighter and darker here and there
  float shelfDepth(vec2 p, float sd, float cliff) {
    float wide = nz(p * 0.16 + 0.13) * 0.6 + nz(p * 0.05 + 0.71) * 0.4;
    float reach = mix(1700.0, 140.0, cliff) * (0.25 + 1.5 * wide * wide);
    float u = sd / reach;
    float d = mix(0.4, 3.0, cliff) + 22.0 * pow(u, 1.5) + pow(max(u - 1.0, 0.0), 2.0) * 300.0 + pow(sd / 1500.0, 6.0) * 3000.0;
    return d * (0.7 + 0.6 * nz(p * 0.55 + 0.4));
  }
  float depthAt(vec2 uv, float shore, vec2 p) {
    // where the height model has no depth (its coarse land spills into the sea) the coast alone decides
    float g = texture2D(uRelief, uv).g; float d = g < 0.025 ? 4500.0 : g * g * 4500.0;
    // on a real shelf (the model knows it is shallow) sand banks rise in long tongues
    if (d < 90.0) { float b = smoothstep(0.55, 0.6, nz(p * 0.13 + 0.21) * 0.7 + nz(p * 0.5) * 0.3); d = mix(d, min(d, 1.5 + 6.0 * nz(p * 2.0)), b); }
    // the height model is coarse at the shore: in front of a beach the floor drops 1–2 m per 100 m (wide turquoise
    // shallows), under a cliff up to 30 m: deep blue right at the rock
    float cliff = texture2D(uDist, uv).b;
    float shelf = shelfDepth(p, shore, cliff);
    float dd = min(d, shelf);
    // the shoals; little sand holes in them; and the white line where the swell breaks on their seaward rim
    gReef = shoal(p, shore, cliff, d);
    // fine detail would only flicker far away: it fades to its average there
    float fa = clamp(length(uCam.xz - p) / 8.0, 0.0, 1.0);
    float rd = 0.4 + 3.0 * nz(p * 0.8 + 0.3) + 2.0 * mix(nz(p * 3.1), 0.5, fa) + 7.0 * mix(smoothstep(0.62, 0.7, nz(p * 1.7 + 0.5)), 0.15, fa);
    dd = mix(dd, min(dd, rd), gReef);
    vec2 sw = vec2(-0.6, -0.8);
    gEdge = clamp(gReef - shoal(p + sw * 0.035, shore, cliff, d), 0.0, 1.0) * mix(0.55 + 0.45 * sin(uTime * 1.4 + dot(p, sw) * 260.0 + nz(p * 3.0) * 6.0), 0.6, fa);
    return clamp(dd, 0.3, 4500.0);
  }
`;
const TAIL = `#include <tonemapping_fragment>\n#include <encodings_fragment>`;
function shader(frag, extra = {}, grow = "") {
  return new THREE.ShaderMaterial({ uniforms: U, vertexShader: `varying vec3 vP; varying vec2 vUv; uniform float uGrow, uWEx; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); ${grow} vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vP; varying vec2 vUv;\n${COMMON}\n${frag}`, ...extra });
}
const U = {
  uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
  uTime: { value: 0 }, uHaze: { value: 0.006 }, uCloudCov: { value: 0.38 }, uCloudH: { value: 4.8 }, uClouds: { value: 1 }, uSea: { value: 1 },
  uMask: { value: null }, uRelief: { value: null }, uNormal: { value: null }, uCloud: { value: null }, uDist: { value: null }, uSat: { value: null }, uGeo: { value: null }, uShadow: { value: null },
  uLife: { value: 1 }, uWEx: { value: 1 }, uGame: { value: null }, uGBox: { value: new THREE.Vector4() }, uGameOn: { value: 0 }, uWorldOn: { value: 1 }, uSB: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }, uMB: { value: [new THREE.Vector4(), new THREE.Vector4()] }, uRegOn: { value: 0 }, uRBox: { value: new THREE.Vector4() }, uRegH: { value: null }, uRegM: { value: null }, uRegL: { value: null }, uRegN: { value: null }, uRegSat: { value: null }, uWorld: { value: null }, uWorldN: { value: null }, uWorldSat: { value: null }, uVeg: { value: 0 }, uHeat: { value: 0 }, uGrow: { value: 1 }, uLevel: { value: 0 }, uShadowK: { value: 1 }, uNear: { value: 0.1 },
  uBox: { value: new THREE.Vector4(W0, D0, WX, DZ) }, uCloudOff: { value: new THREE.Vector2() },
};

let cloudBase = 0.38;

function terrain() {
  const NX = 512, NZ = 562, pos = new Float32Array(NX * NZ * 3), uvs = new Float32Array(NX * NZ * 2), idx = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = W0 + (i / (NX - 1)) * WX, z = D0 + (j / (NZ - 1)) * DZ, k = j * NX + i;
    pos[k * 3] = x; pos[k * 3 + 1] = yAt(x, z); pos[k * 3 + 2] = z; uvs[k * 2] = (x - W0) / WX; uvs[k * 2 + 1] = 1 - (z - D0) / DZ;
    if (i < NX - 1 && j < NZ - 1) idx.push(k, k + NX, k + 1, k + 1, k + NX, k + NX + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  const m = new THREE.Mesh(g, shader(`
    uniform sampler2D uSat; uniform float uSea;
    vec3 lin(vec3 c) { return c * c; }
    // bare earth, as a geologist would colour it: no plants, no people
    vec3 rock(vec2 uv, vec3 p, float h, float steep, float far) {
      vec4 gg = texture2D(uGeo, uv); float lime = gg.r, marl = gg.g, flow = gg.b, flysch = max(0.0, 1.0 - lime - marl);
      float n1 = nz(p.xz * 0.9), n2 = nz(p.xz * 3.7 + 0.3), n3 = nz(p.xz * 13.0 + 0.7) * (1.0 - far);
      float strata = 0.5 + 0.5 * sin(h * 0.075 + n1 * 5.0);            // bedding, seen where the slope cuts it
      vec3 lc = mix(vec3(0.55, 0.52, 0.47), vec3(0.8, 0.77, 0.7), n2);           // limestone, marble grey-white
      lc = mix(lc, vec3(0.6, 0.38, 0.26), smoothstep(0.55, 0.75, n1) * (1.0 - steep) * 0.7);   // terra rossa in the hollows
      lc = mix(lc, vec3(0.86, 0.84, 0.8), smoothstep(0.35, 0.7, steep) * 0.5);   // fresh cliff faces
      vec3 fc = mix(vec3(0.45, 0.36, 0.27), vec3(0.66, 0.5, 0.34), strata * smoothstep(0.1, 0.45, steep) * 0.8 + n2 * 0.4);   // flysch: shale and sandstone
      vec3 mc = mix(vec3(0.72, 0.63, 0.47), vec3(0.85, 0.78, 0.63), n2);           // marl, chalky
      vec3 c = lc * lime + fc * flysch + mc * marl;
      c *= 0.86 + 0.28 * n3;
      // dry river beds of grey gravel, and where they reach the sea, a fan of mud and sand
      float river = smoothstep(0.25, 0.75, flow);
      c = mix(c, vec3(0.7, 0.67, 0.6), river * 0.75);
      float inland = texture2D(uDist, uv).g; inland = inland * inland * 2000.0;
      c = mix(c, vec3(0.38, 0.34, 0.29), smoothstep(0.15, 0.5, flow) * smoothstep(500.0, 100.0, inland) * smoothstep(60.0, 5.0, h) * 0.8);
      // beaches: low and flat right at the water
      float cliff = texture2D(uDist, uv).b;
      c = mix(c, vec3(0.86, 0.79, 0.64), smoothstep(mix(80.0, 10.0, cliff), 8.0, inland) * smoothstep(0.4, 0.1, steep) * smoothstep(40.0, 4.0, h) * (1.0 - cliff * 0.8));
      c = mix(c, vec3(0.52, 0.5, 0.47), smoothstep(60.0, 10.0, inland) * cliff * 0.6);      // bare rock at the foot of a cliff, washed by spray
      return lin(c);
    }
    // the sea floor laid bare: sand on the shelf, grey-brown mud below, dark rock on the steep walls
    vec3 seabed(float dn, float steep, vec3 p) {
      float d = dn * dn * 4500.0, n = nz(p.xz * 1.3);
      vec3 c = mix(vec3(0.7, 0.64, 0.5), vec3(0.42, 0.38, 0.33), smoothstep(30.0, 250.0, d));
      c = mix(c, vec3(0.32, 0.29, 0.26), smoothstep(800.0, 3000.0, d));
      c = mix(c, vec3(0.27, 0.26, 0.25), smoothstep(0.08, 0.35, steep));
      return lin(c * (0.9 + 0.2 * n));
    }
    void main() {
      if (useRhodes(vP.xz) < 0.5) discard;
      vec4 mk = texture2D(uMask, vUv); float land = step(0.5, mk.r);
      vec4 nt = texture2D(uNormal, vUv); vec2 nn = nt.rg * 2.0 - 1.0; vec3 N = normalize(vec3(nn.x, sqrt(max(0.0, 1.0 - dot(nn, nn))), nn.y));
      float dist = length(uCam - vP), far = clamp(dist / 40.0, 0.0, 1.0);
      // fine erosion, too small for the height model: a bumpy normal from noise, strongest on steep ground, gone far away
      float e = 0.015, b0 = nz(vP.xz * 2.2), bx = nz(vP.xz * 2.2 + vec2(e, 0.0)), bz = nz(vP.xz * 2.2 + vec2(0.0, e));
      float steep0 = 1.0 - N.y;
      N = normalize(N + vec3(b0 - bx, 0.0, b0 - bz) * (6.0 + 30.0 * steep0) * (1.0 - far) * uGrow);
      float steep = 1.0 - N.y, ao = mix(1.0, nt.b, uShadowK);
      float shd = mix(1.0, texture2D(uShadow, vUv).r, uShadowK);
      float sh = cloudShadow(vP) * shd, diff = max(dot(N, uSun), 0.0);
      vec3 sky = (uZen * 0.5 * (0.6 + 0.4 * N.y) + uHor * 0.22 + uSunCol * max(uSun.y, 0.0) * 0.16) * ao;
      vec3 col, alb;
      float h = texture2D(uRelief, vUv).r * 1300.0, dn = texture2D(uRelief, vUv).g;
      if (land > 0.5 || uSea < 0.5) {
        if (land > 0.5) {
          vec3 bare = rock(vUv, vP, h, steep, far);
          // Flora: what would grow here, reasoned like a botanist, not copied from a map. Water decides: valleys
          // gather it, north- and west-facing slopes keep it, rain grows with height, salt wind takes it near the sea,
          // limestone lets it seep away, flysch and marl hold it, steep ground has no soil.
          if (uVeg > 0.001) {
            vec4 gq = texture2D(uGeo, vUv); float lime = gq.r, marl = gq.g, flow = gq.b, fly = max(0.0, 1.0 - lime - marl);
            float inland = texture2D(uDist, vUv).g; inland = inland * inland * 2000.0;
            float moist = 0.4 + 0.4 * smoothstep(0.1, 0.6, flow) + 0.22 * clamp(dot(N.xz, vec2(-0.6, -0.8)) * 3.0, -1.0, 1.0)
              + 0.28 * smoothstep(80.0, 700.0, h) - 0.3 * smoothstep(500.0, 60.0, inland) - 0.22 * lime + 0.12 * fly
              - 0.35 * smoothstep(0.35, 0.7, steep) + 0.3 * (nz(vP.xz * 0.11 + 0.7) - 0.5);
            moist = clamp(moist, 0.0, 1.0);
            float alpine = smoothstep(1150.0, 950.0, h);
            float forest = smoothstep(0.52, 0.66, moist) * smoothstep(1000.0, 850.0, h) * smoothstep(15.0, 70.0, h);
            float maquis = smoothstep(0.34, 0.46, moist) * (1.0 - forest);
            float phry = smoothstep(0.12, 0.26, moist) * (1.0 - forest - maquis);
            float ripa = smoothstep(0.45, 0.8, flow) * smoothstep(400.0, 0.0, h);
            float cover = (forest * 0.93 + maquis * 0.72 + phry * 0.38) * alpine; cover = max(cover, ripa * 0.85);
            // the plants: crowns of pine and cypress, shrubs of maquis, low grey cushions of phrygana
            vec3 plant = vec3(0.47, 0.47, 0.33) * phry + vec3(0.29, 0.33, 0.17) * maquis
              + mix(vec3(0.12, 0.19, 0.09), vec3(0.1, 0.15, 0.11), smoothstep(550.0, 800.0, h)) * forest;
            plant = mix(plant / max(phry + maquis + forest, 0.001), vec3(0.22, 0.36, 0.13), ripa);
            float k = mix(9.0, 4.5, forest), e = 0.0012;
            float c0 = mix(nz(vP.xz * k), 0.5, far), cx = mix(nz((vP.xz + vec2(e, 0.0)) * k), 0.5, far), cz = mix(nz((vP.xz + vec2(0.0, e)) * k), 0.5, far);
            float clump = smoothstep(1.0 - cover - 0.1, 1.0 - cover + 0.1, c0 * 0.7 + nz(vP.xz * 1.9) * 0.3);
            // each crown is a little dome: lit on the sun side, dark in its own shade and in the gaps below
            vec3 cn = normalize(vec3(cx - c0, 0.06, cz - c0) * vec3(-1.0, 1.0, -1.0));
            float crown = mix(1.0, 0.65 + 0.6 * max(dot(cn, uSun), 0.0), 1.0 - far);
            vec3 ground = mix(bare, lin(mix(vec3(0.62, 0.55, 0.37), vec3(0.42, 0.44, 0.27), smoothstep(0.4, 0.7, moist))), cover * 0.5);
            ground *= 1.0 - 0.35 * cover * forest;      // the dim forest floor
            // and every tree throws its shadow away from the sun: a pine some twelve metres, a shrub two
            vec2 so = vP.xz + uSun.xz / max(uSun.y, 0.15) * mix(0.002, 0.012, forest);
            float cs = smoothstep(1.0 - cover - 0.1, 1.0 - cover + 0.1, mix(nz(so * k), 0.5, far) * 0.7 + nz(so * 1.9) * 0.3);
            float shade = mix(1.0 - 0.6 * cs * (1.0 - clump * 0.5), 1.0 - 0.32 * cover * (1.0 - 0.4 * uSun.y), far) * mix(1.0, sh / max(cloudShadow(vP), 0.01), 0.0);
            bare = mix(bare, mix(ground, lin(plant) * crown, clump) * shade, uVeg);
          }
          vec3 sat = pow(texture2D(uSat, vUv).rgb, vec3(2.2)) * 1.25;
          // the satellite picture carries the sun of its own day; our light only adds the relief on top
          vec3 sr0 = texture2D(uSat, vUv).rgb; float green = smoothstep(-0.09, 0.03, sr0.g - sr0.r) * smoothstep(0.42, 0.2, dot(sr0, vec3(0.3, 0.55, 0.15)));
          vec2 so2 = vP.xz + uSun.xz / max(uSun.y, 0.15) * 0.01;
          float crw = smoothstep(0.35, 0.65, nz(vP.xz * 7.0)), crs = smoothstep(0.35, 0.65, nz(so2 * 7.0));
          sat *= mix(1.0, (0.7 + 0.6 * crw) * (1.0 - 0.45 * crs * (1.0 - crw)), green * (1.0 - far) * 0.8);      // crowns, gaps and their shadows, too fine for the picture
          vec3 life = sat * (uSunCol * (0.3 + 0.9 * diff * shd) * cloudShadow(vP) + uZen * 0.25 * ao);
          col = mix(bare * (uSunCol * diff * sh * 1.05 + sky), life, uLife);
          col = mix(col, life, PROJ);
          col = gameGround(col, vP, h, steep, uSunCol * diff * sh * 1.05 + sky);
        } else {
          vec3 fl = mix(vec3(0.46, 0.62, 0.68), vec3(0.13, 0.28, 0.48), smoothstep(0.02, 0.35, dn));
          fl = mix(fl, vec3(0.03, 0.08, 0.2), smoothstep(0.35, 0.9, dn));
          vec3 globe = fl * (uSunCol * (0.12 + 1.15 * diff) * sh + uZen * 0.22) * (1.0 - steep * 0.5);
          col = mix(seabed(dn, steep, vP) * (uSunCol * diff * sh * 1.05 + sky), globe, uLife);
        }
      } else if (underPix(vP) >= 0.0) discard;      // from above, the sea plane draws the water, flat, at sea level
      else {
        // from below: the floor in the blue, lit by what the water lets through, with dancing caustics
        float dm = max(-vP.y / (0.001 * ${EX_SEA.toFixed(2)}), 0.5);
        vec3 sT = exp(-vec3(0.36, 0.05, 0.022) * dm);
        col = floorAlb(vP.xz, dm, steep) * (uSunCol * diff * sh * sT * (1.0 + caustic(vP.xz, dm)) * 1.25 + uZen * 0.3 * sT.g);
      }
      // Genesis: molten rock, a crust that cools and cracks
      if (uHeat > 0.001) {
        // big plates of crust drifting on the melt; between them, cracks that glow
        vec2 q = vP.xz + vec2(uTime * 0.05, 0.0);
        float nA = nz(q * 0.045) * 0.6 + nz(q * 0.16 + 0.3) * 0.3 + nz(q * 0.6 + 0.7) * 0.1;
        float crack = pow(1.0 - abs(2.0 * nA - 1.0), 9.0);
        float crust = smoothstep(0.92, 0.45, uHeat);
        vec3 basalt = lin(vec3(0.1, 0.09, 0.085)) * (uSunCol * diff * sh + sky) * (0.7 + 0.6 * nz(vP.xz * 2.0));
        col = mix(col, basalt, smoothstep(0.0, 0.4, uHeat));
        float T = mix(0.15 + 0.85 * smoothstep(0.35, 0.75, nA), crack, crust) * smoothstep(0.02, 0.45, uHeat) * min(uHeat, 0.8);
        col += (mix(vec3(0.45, 0.03, 0.0), vec3(1.0, 0.3, 0.03), clamp(T * 1.6, 0.0, 1.0)) * 1.4 + vec3(1.0, 0.75, 0.4) * pow(T, 4.0) * 1.2) * T;
      }
      gl_FragColor = vec4(finish(col, vP), 1.0);
      ${TAIL}
    }`, {}, "w.y *= uGrow;"));
  m.material.uniforms.uSat = U.uSat;
  scene.add(m); return m;
}
// the eastern Aegean: a grid of one kilometre, its land and sea kept on the side the OSM coast says
function regionMesh() {
  const NX = Math.round(RX1 - RX0) + 1, NZ = Math.round(RZ1 - RZ0) + 1, pos = new Float32Array(NX * NZ * 3), idx = new Uint32Array((NX - 1) * (NZ - 1) * 6); let n = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = RX0 + (i / (NX - 1)) * (RX1 - RX0), z = RZ0 + (j / (NZ - 1)) * (RZ1 - RZ0), k = j * NX + i, land = regLand(x, z), h = hRegion(x, z);
    pos[k * 3] = x; pos[k * 3 + 1] = (land ? Math.max(h, 4) : Math.min(h, -6)) * 0.001; pos[k * 3 + 2] = z;
    if (i < NX - 1 && j < NZ - 1) { idx[n++] = k; idx[n++] = k + NX; idx[n++] = k + 1; idx[n++] = k + 1; idx[n++] = k + NX; idx[n++] = k + NX + 1; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(NX * NZ * 2), 2));
  region = new THREE.Mesh(g, shader(`
    uniform float uSea;
    void main() {
      if (abs(lod(vP.xz) - 1.0) > 0.5 || anySpot(vP.xz) > 0.5) discard;
      vec2 ru = regUv(vP.xz); vec4 rm = texture2D(uRegM, ru); float h = regH(vP.xz);
      vec2 nn = texture2D(uRegN, ru).rg * 2.0 - 1.0; vec3 N = normalize(vec3(nn.x, sqrt(max(0.0, 1.0 - dot(nn, nn))), nn.y));
      float diff = max(dot(N, uSun), 0.0), sh = cloudShadow(vP); vec3 col;
      if (texture2D(uRegL, ru).r > 0.5) {
        vec3 s0 = texture2D(uRegSat, ru).rgb, sat = pow(s0, vec3(2.2)) * 1.25;
        vec3 life = sat * (uSunCol * (0.3 + 0.9 * diff) * sh + uZen * 0.25);
        float lum = dot(s0, vec3(0.3, 0.55, 0.15));
        vec3 bare = pow(vec3(0.66, 0.6, 0.5) * (0.7 + 0.6 * lum), vec3(2.2));
        col = mix(bare * (uSunCol * (0.15 + 1.0 * diff) * sh + uZen * 0.3), life, max(uLife, uVeg));
        col = mix(col, life, PROJ);
      } else {
        if (uSea > 0.5) discard;
        float dn = sqrt(clamp(-h / 4500.0, 0.0, 1.0));
        vec3 fl = mix(vec3(0.46, 0.62, 0.68), vec3(0.13, 0.28, 0.48), smoothstep(0.02, 0.35, dn));
        fl = mix(fl, vec3(0.03, 0.08, 0.2), smoothstep(0.35, 0.9, dn));
        col = fl * (uSunCol * (0.12 + 1.15 * diff) * sh + uZen * 0.22);
      }
      gl_FragColor = vec4(finish(col, vP), 1.0);
      ${TAIL}
    }`, {}, "w.y *= (w.y > 0.0 ? " + EX_LAND.toFixed(1) + " : " + EX_SEA.toFixed(1) + ") * uWEx;"));
  region.frustumCulled = false; region.visible = !gen; scene.add(region);
}
/* ---------------- Close spots: small boxes anywhere, each in its own km frame, set into the Mercator world ---------------- */
// k: how much bigger a kilometre there is drawn than at Rhodes (Mercator); heights are raised like the world's (×3 there)
const SPOTS = [
  { id: "stuttgart", name: "Stuttgarter Kessel", sub: "mit den Bärenseen", look: [9.14, 48.768, 16, 0.75] },
  { id: "salach", name: "Salach im Filstal", sub: "Fils, Lauter und der Hohenstaufen", look: [9.74, 48.69, 13, 0.75] },
  { id: "tregastel", name: "Trégastel", sub: "Grève Blanche bis Île Renote", look: [-3.505, 48.826, 6, 0.8] },
  { id: "symi", name: "Symi", sub: "Gialos, Panormitis und die Buchten", look: [27.84, 36.59, 14, 0.8] },
];
const MIDS = [{ id: "suedwest", dir: "mitte", lake: 3000, look: [9.05, 48.4] }, { id: "bretagne", dir: "mitte", lake: 3000, look: [-3.1, 48.07] }];
const spotsOn = [];
async function loadSpot(sp, slot) {
  const dir = sp.dir || "orte", mid = dir === "mitte";
  const meta = await (await fetch(`${base}data/${dir}/${sp.id}.json`)).json(), [lonc, latc] = meta.center, k = KX / Math.cos((latc * Math.PI) / 180);
  const [cx, cz] = G(lonc, latc), w = meta.km[0] * k, h = meta.km[1] * k;
  Object.assign(sp, { box: [cx - w / 2, cz - h / 2, w, h], k });
  const [hi, wi] = await Promise.all([loadImage(`${base}data/${dir}/${sp.id}-hoehe.png`), loadImage(`${base}data/${dir}/${sp.id}-wasser.png`)]);
  const c = document.createElement("canvas"); c.width = hi.width; c.height = hi.height; const x = c.getContext("2d"); x.drawImage(hi, 0, 0);
  const d = x.getImageData(0, 0, hi.width, hi.height).data, HW_ = hi.width, HH_ = hi.height, HM_ = new Float32Array(HW_ * HH_);
  for (let i = 0; i < HM_.length; i++) HM_[i] = d[i * 4] * 256 + d[i * 4 + 1] - 10000;
  Object.assign(sp, { HM: HM_, HW: HW_, HH: HH_ });
  // normals, for a light that shows every slope of the land
  const [nc, nx, ni] = cv2d(HW_, HH_), dx = (meta.km[0] / HW_) * 1000, dz = (meta.km[1] / HH_) * 1000;
  for (let j = 0; j < HH_; j++) for (let i = 0; i < HW_; i++) {
    const kk = j * HW_ + i, ex = 2.0;
    const hx = (HM_[j * HW_ + Math.min(HW_ - 1, i + 1)] - HM_[j * HW_ + Math.max(0, i - 1)]) / (2 * dx) * ex, hz = (HM_[Math.min(HH_ - 1, j + 1) * HW_ + i] - HM_[Math.max(0, j - 1) * HW_ + i]) / (2 * dz) * ex;
    const L = Math.hypot(hx, 1, hz); ni.data[kk * 4] = (-hx / L * 0.5 + 0.5) * 255; ni.data[kk * 4 + 1] = (-hz / L * 0.5 + 0.5) * 255; ni.data[kk * 4 + 3] = 255;
  }
  nx.putImageData(ni, 0, 0);
  const tex = (img) => { const t = new THREE.Texture(img); t.needsUpdate = true; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; return t; };
  const sat = await new THREE.TextureLoader().loadAsync(`${base}data/${dir}/${sp.id}.jpg`); sat.anisotropy = 4;
  // the mesh: 2 heights per vertex step, water lying flat as the heights say
  const NX = Math.min(HW_, 300), NZ = Math.round(NX * HH_ / HW_), pos = new Float32Array(NX * NZ * 3), idx = new Uint32Array((NX - 1) * (NZ - 1) * 6); let n = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const u = i / (NX - 1), v = j / (NZ - 1), kk = j * NX + i;
    pos[kk * 3] = sp.box[0] + u * w; pos[kk * 3 + 1] = spotHAt(sp, u, v) * 0.001 * EX_LAND; pos[kk * 3 + 2] = sp.box[1] + v * h;
    if (i < NX - 1 && j < NZ - 1) { idx[n++] = kk; idx[n++] = kk + NX; idx[n++] = kk + 1; idx[n++] = kk + 1; idx[n++] = kk + NX; idx[n++] = kk + NX + 1; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(NX * NZ * 2), 2));
  const m = shader(`
    uniform vec4 uBoxS; uniform sampler2D uSSat, uSN, uSW; uniform float uMid, uLakeR;
    void main() {
      if (uWorldOn > 0.5 && (uMid > 0.5 ? (midHere(vP.xz) < 0.5 || spotHere(vP.xz) > 0.5) : spotHere(vP.xz) < 0.5)) discard;
      vec2 su = vec2((vP.x - uBoxS.x) / uBoxS.z, 1.0 - (vP.z - uBoxS.y) / uBoxS.w);
      if (su.x < 0.0 || su.y < 0.0 || su.x > 1.0 || su.y > 1.0) discard;
      vec3 N = unpackN(texture2D(uSN, su).rg), V = normalize(uCam - vP);
      float diff = max(dot(N, uSun), 0.0), sh = cloudShadow(vP), dist = length(uCam - vP), far = clamp(dist / 12.0, 0.0, 1.0);
      vec4 wt = texture2D(uSW, su); vec3 s0 = texture2D(uSSat, su).rgb, sat = pow(s0, vec3(2.2)) * 1.25, col;
      if (wt.r > 0.5) {
        // water: the sea by its shelf, a lake or a river by how far its shore is; lakes and rivers are green-brown
        bool isSea = wt.b > 0.5; float sd = isSea ? wt.g * wt.g * 2000.0 : pow(wt.g / 0.5, 2.0) * uLakeR;
        // a lake here is not clear: humus and algae make it dark, olive to brown-green, its floor gone after a metre or two
        float depth = isSea ? shelfDepth(vP.xz, sd, 0.8) * 1.6 : 30.0 + sd * 0.1;
        col = waterCol(vP, depth, sd, waves(vP.xz, dist / max(V.y, 0.1)), V, sh, 0.0, isSea ? 0.5 : 1.0);
        if (!isSea) col = mix(col * vec3(0.42, 0.72, 0.38), col * vec3(0.7, 0.72, 0.5), smoothstep(30.0, 0.0, sd));
        col = mix(col, sat * (uSunCol * 0.95 + uZen * 0.3) * sh * 1.05, PROJ);
      } else {
        // land: the picture, lit by the relief; crowns and gaps in the woods when close
        float green = smoothstep(-0.09, 0.03, s0.g - s0.r) * smoothstep(0.42, 0.2, dot(s0, vec3(0.3, 0.55, 0.15)));
        vec2 so = vP.xz + uSun.xz / max(uSun.y, 0.15) * 0.006;
        float crw = smoothstep(0.35, 0.65, nz(vP.xz * 28.0)), crs = smoothstep(0.35, 0.65, nz(so * 28.0));
        sat *= mix(1.0, (0.72 + 0.56 * crw) * (1.0 - 0.4 * crs * (1.0 - crw)), green * (1.0 - far) * 0.8);
        vec3 life = sat * (uSunCol * (0.3 + 0.9 * diff) * sh + uZen * 0.25);
        float lum = dot(s0, vec3(0.3, 0.55, 0.15));
        vec3 bare = pow(vec3(0.6, 0.53, 0.43) * (0.7 + 0.6 * lum), vec3(2.2));
        col = mix(bare * (uSunCol * (0.15 + 1.0 * diff) * sh + uZen * 0.3), life, max(uLife, uVeg));
        col = mix(col, life, PROJ);
        col = gameGround(col, vP, vP.y / ${(0.001 * EX_LAND).toFixed(4)}, 1.0 - N.y, uSunCol * diff * sh * 1.05 + uZen * 0.3);
      }
      gl_FragColor = vec4(finish(col, vP), 1.0);
      ${TAIL}
    }`, {}, "w.y *= uWEx;");
  m.uniforms = { ...U, uBoxS: { value: new THREE.Vector4(...sp.box) }, uSSat: { value: sat }, uSN: { value: ctex(nc) }, uSW: { value: tex(wi) }, uMid: { value: mid ? 1 : 0 }, uLakeR: { value: sp.lake || 400 } };
  sp.mesh = new THREE.Mesh(g, m); sp.mesh.frustumCulled = false; sp.mesh.visible = !gen; scene.add(sp.mesh);
  (mid ? U.uMB : U.uSB).value[slot].set(...sp.box); spotsOn.push(sp); if (mid) spotsOn.sort((a, b) => (a.dir === "mitte") - (b.dir === "mitte"));
}
function spotHAt(sp, u, v) {
  const gx = clamp(u * sp.HW - 0.5, 0, sp.HW - 1.001), gz = clamp(v * sp.HH - 0.5, 0, sp.HH - 1.001), i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, H_ = (a, b) => sp.HM[b * sp.HW + a];
  return H_(i, j) * (1 - fx) * (1 - fz) + H_(i + 1, j) * fx * (1 - fz) + H_(i, j + 1) * (1 - fx) * fz + H_(i + 1, j + 1) * fx * fz;
}
// the world map: a coarse grid of the whole earth around the Rhodes box, which it leaves out
let world = null;
function worldMesh() {
  const NX = 640, NZ = 320, pos = new Float32Array(NX * NZ * 3), idx = new Uint32Array((NX - 1) * (NZ - 1) * 6); let n = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const lon = -180 + (i / (NX - 1)) * 360, lat = 84 - (j / (NZ - 1)) * 168, [x, z] = G(lon, lat), k = j * NX + i;
    pos[k * 3] = x; pos[k * 3 + 1] = hWorld(x, z) * 0.001; pos[k * 3 + 2] = z;
    if (i < NX - 1 && j < NZ - 1) { idx[n++] = k; idx[n++] = k + NX; idx[n++] = k + 1; idx[n++] = k + 1; idx[n++] = k + NX; idx[n++] = k + NX + 1; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(NX * NZ * 2), 2));
  world = new THREE.Mesh(g, shader(`
    uniform float uSea; uniform sampler2D uSat;
    void main() {
      if (lod(vP.xz) < 1.5 || anySpot(vP.xz) > 0.5) discard;      // Rhodes, the Aegean and the spots are drawn by their own, finer models
      vec2 wu = worldUv(vP.xz); float h = worldH(vP.xz);
      vec2 nn = texture2D(uWorldN, wu).rg * 2.0 - 1.0; vec3 N = normalize(vec3(nn.x, sqrt(max(0.0, 1.0 - dot(nn, nn))), nn.y));
      // the raised shade is for the map from afar; close by, the coarse cells would show as bumps
      N = normalize(mix(vec3(0.0, 1.0, 0.0), N, mix(0.3, 1.0, smoothstep(300.0, 3000.0, length(uCam - vP)))));
      float diff = max(dot(N, uSun), 0.0), sh = cloudShadow(vP); vec3 col;
      if (h > 0.0) {
        vec3 s0 = texture2D(uWorldSat, wu).rgb, sat = pow(s0, vec3(2.2)) * 1.25;
        vec3 life = sat * (uSunCol * (0.3 + 0.9 * diff) * sh + uZen * 0.25);
        // bare: the earth's own tan and grey, keeping snow and ice
        float lum = dot(s0, vec3(0.3, 0.55, 0.15)), snow = smoothstep(0.55, 0.75, lum);
        vec3 bare = mix(pow(vec3(0.66, 0.57, 0.45) * (0.65 + 0.7 * lum), vec3(2.2)), sat, snow);
        col = mix(bare * (uSunCol * (0.15 + 1.0 * diff) * sh + uZen * 0.3), life, max(uLife, uVeg));
        col = mix(col, life, PROJ);
      } else {
        if (uSea > 0.5) discard;
        float dn = sqrt(clamp(-h / 4500.0, 0.0, 1.0));
        vec3 fl = mix(vec3(0.46, 0.62, 0.68), vec3(0.13, 0.28, 0.48), smoothstep(0.02, 0.35, dn));
        fl = mix(fl, vec3(0.03, 0.08, 0.2), smoothstep(0.35, 0.9, dn));
        col = fl * (uSunCol * (0.12 + 1.15 * diff) * sh + uZen * 0.22);
      }
      gl_FragColor = vec4(finish(col, vP), 1.0);
      ${TAIL}
    }`, {}, "w.y *= (w.y > 0.0 ? " + EX_LAND.toFixed(1) + " : " + EX_SEA.toFixed(1) + ") * uWEx;"));
  world.frustumCulled = false; scene.add(world);
}
// without the water the map is a cut block, like a relief model: its sides show the section through the earth
let skirt = null;
function cutSides() {
  const pos = [], col = [], N = 160, BOT = -12, edge = (t, k) => [[W0 + t * WX, D0], [W1, D0 + t * DZ], [W1 - t * WX, D1], [W0, D1 - t * DZ]][k];
  for (let k = 0; k < 4; k++) for (let i = 0; i < N; i++) {
    const [ax, az] = edge(i / N, k), [bx, bz] = edge((i + 1) / N, k), ay = yAt(ax, az), by = yAt(bx, bz);
    pos.push(ax, ay, az, ax, BOT, az, bx, by, bz, bx, by, bz, ax, BOT, az, bx, BOT, bz);
    const top = (y) => (y > 0 ? [0.2, 0.15, 0.1] : [0.12, 0.11, 0.1]), lo = [0.015, 0.012, 0.012];
    col.push(...top(ay), ...lo, ...top(by), ...top(by), ...lo, ...lo);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  skirt = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); skirt.visible = false; scene.add(skirt);
}
// the sea's mesh: rings around the camera, a hand's breadth apart at the lens and kilometres apart at the horizon,
// so that no triangle is huge next to a lens that may sit right in the surface
function seaRings(R1 = 1500) {
  const NR = 64, NS = 48, R0 = 0.0004, pos = [0, 0, 0], idx = [];
  for (let i = 0; i < NR; i++) { const r = R0 * Math.pow(R1 / R0, i / (NR - 1)); for (let k = 0; k < NS; k++) { const a = (k / NS) * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
  for (let k = 0; k < NS; k++) idx.push(0, 1 + ((k + 1) % NS), 1 + k);
  for (let i = 0; i < NR - 1; i++) for (let k = 0; k < NS; k++) { const a = 1 + i * NS + k, b = 1 + i * NS + ((k + 1) % NS), c = a + NS, d = b + NS; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2)); return g;
}
// the sea surface over everything that is not land; beyond the map it goes on to the horizon
let sea = null;
function seaSurface() {
  sea = new THREE.Mesh(seaRings(40000), shader(`
    uniform sampler2D uSat;
    void main() {
      if (anySpot(vP.xz) > 0.5) discard;
      vec2 uv = boxUv(vP.xz); float lv = lod(vP.xz), inside = lv < 0.5 ? 1.0 : 0.0;
      vec4 mk = inside > 0.5 ? texture2D(uMask, uv) : vec4(0.0);
      float sd, d, rcliff = 0.45; gUv = uv; gIn = inside;
      if (uLevel < -0.002) {
        // Genesis: the sea still rising; how deep it is here, from the drawn floor
        float g = inside > 0.5 ? texture2D(uRelief, uv).g : 0.6;
        d = g * g * 4500.0 + uLevel / (0.001 * ${EX_SEA.toFixed(2)} * uGrow); sd = 5000.0;
        if (d < 0.3) discard;
      } else {
        if (mk.r > 0.5) discard;
        if (inside > 0.5) { sd = shoreAt(uv); d = depthAt(uv, sd, vP.xz); }
        else if (lv < 1.5) {
          // the eastern Aegean: its OSM coast decides, a shelf grows from it, shoals as at Rhodes
          vec4 rm = texture2D(uRegM, regUv(vP.xz)); if (texture2D(uRegL, regUv(vP.xz)).r > 0.5) discard;
          float hr = regH(vP.xz), dem = hr < -3.0 ? -hr : 4500.0; sd = rm.g * rm.g * 4000.0;
          // how steeply the land rises behind this shore: the highest ground within a kilometre and a half
          float e = 1.5, hl = max(max(regH(vP.xz + vec2(e, 0.0)), regH(vP.xz - vec2(e, 0.0))), max(regH(vP.xz + vec2(0.0, e)), regH(vP.xz - vec2(0.0, e))));
          rcliff = smoothstep(40.0, 320.0, hl);
          float shelf = shelfDepth(vP.xz, sd, rcliff);
          d = min(dem, shelf);
          gReef = shoal(vP.xz, sd, rcliff, dem); d = mix(d, min(d, 0.4 + 3.0 * nz(vP.xz * 0.8 + 0.3) + 2.0 * nz(vP.xz * 3.1)), gReef); d = max(d, 0.3);
        }
        else { float hw = worldH(vP.xz); if (hw > 0.0) discard; sd = 5000.0; d = max(-hw, 30.0); }      // the world's seas, by their real depth (its coarse coast knows no shallows)
      }
      vec3 V = normalize(uCam - vP), col;
      // the lens sees the other side of the surface here: the plane steps aside for what lies beyond
      float pu = underPix(vP); if ((pu < 0.0) != (uCam.y < 0.0)) discard;
      if (pu < 0.0) {
        // from below: the sky only through a round window overhead (Snell), outside it the surface mirrors the deep
        vec3 N = waves(vP.xz, length(uCam - vP) * 0.3), t = refract(-V, -N, 1.33);
        if (dot(t, t) < 0.01) col = uwFog() * 0.45;
        else { float fr = 1.0 - smoothstep(0.66, 0.78, dot(-V, N)); col = (skyCol(t) * 2.6 + uSunCol * (pow(max(dot(t, uSun), 0.0), 120.0) * 14.0 + pow(max(dot(t, uSun), 0.0), 8.0) * 0.8)) * (1.0 - fr) + uwFog() * 0.45 * fr; }
      } else {
        vec2 nn = inside > 0.5 ? texture2D(uNormal, uv).rg * 2.0 - 1.0 : vec2(0.0);
        gFNOn = 1.0; gFN = unpackN(lv < 0.5 ? texture2D(uNormal, uv).rg : lv < 1.5 ? texture2D(uRegN, regUv(vP.xz)).rg : texture2D(uWorldN, worldUv(vP.xz)).rg);
        vec3 ss = lv < 0.5 ? texture2D(uSat, uv).rgb : lv < 1.5 ? texture2D(uRegSat, regUv(vP.xz)).rgb : texture2D(uWorldSat, worldUv(vP.xz)).rgb;
        col = waterCol(vP, d, sd, waves(vP.xz, length(uCam - vP) / max(V.y, 0.1)), V, cloudShadow(vP), length(nn) * 2.0, inside > 0.5 ? texture2D(uDist, uv).b : lv < 1.5 ? rcliff : 1.0);
        col = mix(col, pow(ss, vec3(2.2)) * 1.3 * (uSunCol * 0.95 + uZen * 0.3) * cloudShadow(vP), PROJ * (1.0 - gEdge));
      }
      gl_FragColor = vec4(finish(col, vP), 1.0);
      ${TAIL}
    }`));
  sea.material.side = THREE.DoubleSide; sea.frustumCulled = false; scene.add(sea);
}
let clouds = null;
function cloudLayer() {
  clouds = new THREE.Group();
  for (const k of [0, 1]) {
    const m = shader(`
      uniform float uK;
      // cumulus: the coarse density, its rim frayed by fine noise, the upper layer only the heaped cores
      float puff(vec2 p) { float c = cloudD(p); c -= (1.0 - c) * 0.55 * nz(p * 1.7 + uK * 0.4); return smoothstep(0.0 + uK * 0.3, 0.45 + uK * 0.3, c); }
      void main() {
        if (underPix(vP) < 0.0) discard;
        float d = puff(vP.xz); if (d < 0.01) discard;
        // the density as a height: a bumpy top, bright where it faces the sun, blue-grey in its folds and underneath
        float e = 0.35, gx = puff(vP.xz + vec2(e, 0.0)) - d, gz = puff(vP.xz + vec2(0.0, e)) - d;
        vec3 n = normalize(vec3(-gx, 0.35, -gz));
        float lit = clamp(0.35 + 0.65 * max(dot(n, uSun), 0.0) + d * 0.25, 0.0, 1.0);
        vec3 col = mix(vec3(0.46, 0.52, 0.62), vec3(1.0), lit * (0.78 + 0.22 * uK)) * (uSunCol * 1.25 + uZen * 0.45);
        col *= mix(0.78, 1.0, step(vP.y, uCam.y));
        // a clear round window around the camera: no cloud in your face, a hole to look down through
        float L = length(vP - uCam), R = max(uCam.y - vP.y, 0.0) * 0.7;
        float a = smoothstep(0.0, 0.45, d) * 0.98 * smoothstep(0.6, 3.0, L) * smoothstep(R * 0.55, R * 1.05 + 0.01, length(vP.xz - uCam.xz));
        gl_FragColor = vec4(finish(col, vP), a);
        ${TAIL}
      }`, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
    m.uniforms = { ...U, uK: { value: k } };
    const c = new THREE.Mesh(seaRings(), m); c.scale.setScalar(0.3); c.frustumCulled = false; c.position.y = k * 0.5; c.renderOrder = 2 + k; clouds.add(c);
  }
  scene.add(clouds);
}
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, depthTest: false, uniforms: U,      // drawn first, behind all: with a lens a few cm near, depth has no room for it
  // pinned just inside the far plane: with the lens near a wave, the depth range is too long to place it honestly
  vertexShader: `varying vec3 vD; void main() { vD = normalize(position); vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(c.xy, c.w * 0.999, c.w); }`,
  fragmentShader: `varying vec3 vD; uniform vec3 uSun, uSunCol, uZen, uHor, uCam; uniform float uNear, uTime;
    void main() { vec3 d = normalize(vD);
      vec2 nx = uCam.xz + d.xz * 0.0015;
      float sH = 0.3 * (0.05 / 55.0 * sin(dot(vec2(0.94, 0.34), nx) * 55.0 + uTime * 1.9) + 0.04 / 97.0 * sin(dot(vec2(0.6, 0.8), nx) * 97.0 + uTime * 2.5) + 0.03 / 171.0 * sin(dot(vec2(-0.3, 0.95), nx) * 171.0 + uTime * 3.3));
      if (uCam.y + d.y * 0.0015 < sH) { gl_FragColor = vec4(vec3(0.0, 0.085, 0.12) * (uSunCol * max(uSun.y, 0.0) * 1.3 + uZen * 0.5) * exp(min(uCam.y, 0.0) * 18.0), 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        return; } float h = clamp(d.y, 0.0, 1.0); vec3 col = mix(uHor, uZen, pow(h, 0.45)); if (d.y < 0.0) col = uHor;
      float s = max(dot(d, uSun), 0.0); col += uSunCol * (pow(s, 8.0) * 0.2 + pow(s, 200.0) * 0.6 + smoothstep(0.9996, 0.9999, s) * 6.0);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`,
}));
sky.renderOrder = -1; scene.add(sky);

/* ---------------- Light and colour of the hour ---------------- */
function light() {
  const s = sunDir(), e = Math.asin(s.y) * 180 / Math.PI, low = clamp((e - 2) / 25, 0, 1);
  U.uSun.value.copy(s);
  U.uSunCol.value.setRGB(1.0, 0.72 + 0.26 * low, 0.48 + 0.46 * low).multiplyScalar(0.9 + 0.5 * low);
  U.uZen.value.setRGB(0.10, 0.25, 0.55).lerp(new THREE.Color(0.18, 0.2, 0.36), 1 - low);
  U.uHor.value.setRGB(0.62, 0.74, 0.86).lerp(new THREE.Color(0.95, 0.66, 0.46), 1 - low);
  // Genesis: a young earth under smoke, lit from below by its own glow
  const H = U.uHeat.value;
  if (H > 0) { U.uZen.value.lerp(new THREE.Color(0.012, 0.008, 0.01), H); U.uHor.value.lerp(new THREE.Color(0.16, 0.05, 0.025), H); U.uSunCol.value.multiplyScalar(1 - 0.6 * H); }
  castShadows(s);
}

/* ---------------- Weather: the real cloud cover over Rhodes ---------------- */
async function weather() {
  if (q.get("wolken")) { cloudBase = clamp(parseFloat(q.get("wolken")), 0, 1); return; }
  try { const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=36.2&longitude=28.0&current=cloud_cover,wind_speed_10m,wind_direction_10m");
    const c = (await r.json()).current; cloudBase = clamp(0.12 + (c.cloud_cover / 100) * 0.6, 0.12, 0.75); wind = [c.wind_speed_10m, c.wind_direction_10m]; } catch (e) {}
}
let wind = [15, 300];

/* ---------------- The part's own life ---------------- */
const life = 0.55, veg = 1;
const PLACES = [["Rhodos", "die Insel", [28.0, 36.25, 95, 0.75]], ["Symi", "Ausflug von Rhodos", [27.84, 36.59, 14, 0.8]], ["Ostägäis", "Dodekanes und Karien", [27.6, 36.7, 520, 0.95]],
  ["Südwestdeutschland", "Schwarzwald, Alb, Bodensee", [9.0, 48.4, 260, 0.95]], ...SPOTS.filter((sp) => sp.id !== "symi").map((sp) => [sp.name, sp.sub, sp.look]),
  ["Bretagne", "die Côte de Granit Rose und mehr", [-3.1, 48.1, 340, 0.95]], ["Welt", "die ganze Karte", [15, 30, 26000, 1.3]]];
let focus = { x: 40, z: 36, dist: 95 };
const near = [...SPOTS.map((sp, i) => [sp, i, sp.look]), ...MIDS.map((sp, i) => [sp, i, sp.look])];
function step(dt, now, f) {
  focus = f;
  U.uTime.value = now / 1000;
  const wr = (wind[1] * Math.PI) / 180, ws = (wind[0] / 3600) * 6 / 22;
  U.uCloudOff.value.x += -Math.sin(wr) * ws * dt; U.uCloudOff.value.y -= Math.cos(wr) * ws * dt;
  wEx = 1 + 7 * clamp((f.dist - 400) / 9600, 0, 1) ** 0.7; U.uWEx.value = wEx;
  U.uCam.value.copy(camera.position); U.uNear.value = camera.near;
  U.uCloudCov.value = cloudBase * (1 - clamp((camera.position.y - 500) / 1500, 0, 1));
  if (sea) sea.position.set(camera.position.x, 0, camera.position.z);
  if (clouds) clouds.position.set(camera.position.x, U.uCloudH.value, camera.position.z);
  sky.position.copy(camera.position);
  U.uHaze.value = 0.02;
  // spots and middle levels load only when you come near
  if (now - (step.n || 0) > 700) { step.n = now;
    for (const [sp, i, [lon, lat]] of near) { if (sp.loading) continue; const [x, z] = G(lon, lat);
      if (Math.hypot(f.x - x, f.z - z) < Math.max(f.dist * 1.5, 50) + (sp.dir ? 600 : 80)) { sp.loading = true; loadSpot(sp, i).catch((e) => console.warn("Ort", sp.id, e)); } } }
}
const api = { step, yAt, isLand, G, places: PLACES, terrain: null, U, scene };
// the game hands over its map of the land: fields and roads near the eye come from it
api.gameMask = (tex, box) => { U.uGame.value = tex; U.uGBox.value.set(...box); U.uGameOn.value = 1; };
api.ready = async function (geo) {
  const [sat] = await Promise.all([new THREE.TextureLoader().loadAsync(base + "data/natur.jpg"), loadHeights(), loadWorld()]);
  U.uWorld.value = worldHTex; U.uWorldN.value = worldNTex;
  new THREE.TextureLoader().loadAsync(base + "data/welt.jpg").then((t) => { t.anisotropy = 4; U.uWorldSat.value = t; });
  const exact = geo.regions.filter((r) => r.quality === "genau").map((r) => r.bbox);
  const feats = geo.features.filter((f) => f.quality === "genau" || !f.rings.every((ring) => ring.every(([lon, lat]) => exact.some(([a, b, c, d]) => lon >= a && lon <= c && lat >= b && lat <= d))));
  drawMask(feats); coastDist(); buildRelief();
  sat.encoding = THREE.sRGBEncoding; sat.anisotropy = renderer.capabilities.getMaxAnisotropy();
  U.uMask.value = maskTex; U.uRelief.value = reliefTex; U.uNormal.value = normalTex; U.uDist.value = distTex; U.uCloud.value = cloudNoise(); U.uSat.value = sat;
  U.uGeo.value = geoTex; U.uShadow.value = shadowTex; U.uLife.value = life; U.uVeg.value = veg;
  api.terrain = terrain(); worldMesh(); seaSurface(); cloudLayer(); light(); weather();
  loadRegion();
  // Symi at once: the game puts houses and people on it at the start, they must stand on its own ground
  const sy = SPOTS.findIndex((sp) => sp.id === "symi"); SPOTS[sy].loading = true; await loadSpot(SPOTS[sy], sy).catch((e) => console.warn("Symi", e));
  return api;
};
return api;
};
