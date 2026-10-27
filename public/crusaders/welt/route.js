/* Crusaders · a simple car route. Loaded after the world's own script and uses its globals
   (THREE, scene, P, unP, heightAt, pl, camDist, gps, toast, TOWNS, distKm).
   The main roads of the coast data become a graph: points that meet are joined, roads that end
   next to another road are tied to it. Dijkstra finds the fastest way (primary 60, secondary 50,
   tertiary 40 km/h). The route is drawn on the land, and a panel says how far, how long, and
   where to turn next. With GPS on it follows you and finds a new way if you leave it. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const SPEED = { primary: 60, secondary: 50, tertiary: 40, link: 25 };
  let G = null;                       // { x: [], z: [], adj: [[[to, km, cls]]] }
  let R = null, ribbon = null, flag = null, ribbonW = 0, lastIdx = 0, offSince = 0, lastCalc = 0;

  /* ---------------- The road graph ---------------- */
  function build(roads) {
    const x = [], z = [], adj = [], cell = new Map(), CS = 0.025;
    const key = (a, b) => Math.round(a / CS) + "," + Math.round(b / CS);
    function node(px, pz) {
      const i0 = Math.round(px / CS), j0 = Math.round(pz / CS);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const l = cell.get(i0 + di + "," + (j0 + dj)); if (!l) continue;
        for (const n of l) if (Math.hypot(x[n] - px, z[n] - pz) < 0.025) return n;
      }
      const n = x.length; x.push(px); z.push(pz); adj.push([]);
      const k = key(px, pz); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(n); return n;
    }
    const link = (a, b, cls) => { if (a === b) return; const d = Math.hypot(x[a] - x[b], z[a] - z[b]); adj[a].push([b, d, cls]); adj[b].push([a, d, cls]); };
    const segs = [], ends = [];
    for (const r of roads) for (const line of r.lines) {
      let prev = -1;
      line.forEach(([lon, lat], i) => {
        const [px, pz] = P(lon, lat), n = node(px, pz);
        if (prev >= 0 && prev !== n) { link(prev, n, r.class); segs.push([prev, n, r.class]); }
        if (i === 0 || i === line.length - 1) ends.push(n);
        prev = n;
      });
    }
    // roads that stop just short of another road (the data is simplified): tie them on
    const grid = new Map(), GS = 0.5;
    segs.forEach((s, i) => { const gx = Math.floor(((x[s[0]] + x[s[1]]) / 2) / GS), gz = Math.floor(((z[s[0]] + z[s[1]]) / 2) / GS); const k = gx + "," + gz; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    for (const e of ends) {
      if (adj[e].length > 1) continue;
      let best = null; const gx = Math.floor(x[e] / GS), gz = Math.floor(z[e] / GS);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const si of grid.get(gx + di + "," + (gz + dj)) || []) {
        const [a, b] = segs[si]; if (a === e || b === e || adj[e].some(([t]) => t === a || t === b)) continue;
        const pr = project(x[e], z[e], x[a], z[a], x[b], z[b]); if (pr.d < 0.08 && (!best || pr.d < best.d)) best = { ...pr, a, b, cls: segs[si][2] };
      }
      if (!best) continue;
      if (best.t < 0.05) link(e, best.a, "link"); else if (best.t > 0.95) link(e, best.b, "link");
      else { const n = node(best.px, best.pz); link(best.a, n, best.cls); link(n, best.b, best.cls); link(e, n, "link"); }
    }
    G = { x, z, adj, segs, grid, GS };
  }
  function project(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz || 1e-9, t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / L));
    const qx = ax + vx * t, qz = az + vz * t; return { t, px: qx, pz: qz, d: Math.hypot(px - qx, pz - qz) };
  }
  // the nearest piece of road to a point: search outwards until something is found
  function nearestSeg(px, pz) {
    const { x, z, segs, grid, GS } = G; let best = null;
    for (let r = 1; r <= 12 && !best; r *= 2) {
      const gx = Math.floor(px / GS), gz = Math.floor(pz / GS);
      for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) for (const si of grid.get(gx + di + "," + (gz + dj)) || []) {
        const [a, b] = segs[si], pr = project(px, pz, x[a], z[a], x[b], z[b]); if (!best || pr.d < best.d) best = { ...pr, a, b, si };
      }
    }
    return best;
  }

  /* ---------------- Dijkstra ---------------- */
  function route(fx, fz, tx, tz) {
    const { x, z, adj } = G, s = nearestSeg(fx, fz), t = nearestSeg(tx, tz); if (!s || !t) return null;
    const N = x.length, S = N, T = N + 1, extra = new Map();
    const addE = (a, b, d, cls) => { if (!extra.has(a)) extra.set(a, []); extra.get(a).push([b, d, cls]); };
    // start and goal hang on their nearest road piece, both ways
    const sc = G.segs[s.si][2], tc = G.segs[t.si][2];
    addE(S, s.a, s.d * 2 + Math.hypot(s.px - x[s.a], s.pz - z[s.a]), sc); addE(S, s.b, s.d * 2 + Math.hypot(s.px - x[s.b], s.pz - z[s.b]), sc);
    addE(t.a, T, t.d * 2 + Math.hypot(t.px - x[t.a], t.pz - z[t.a]), tc); addE(t.b, T, t.d * 2 + Math.hypot(t.px - x[t.b], t.pz - z[t.b]), tc);
    if (s.si === t.si) addE(S, T, Math.hypot(s.px - t.px, s.pz - t.pz) + s.d + t.d, sc);
    const dist = new Float64Array(N + 2).fill(Infinity), prev = new Int32Array(N + 2).fill(-1), heap = [];
    const push = (n, d) => { heap.push([d, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    dist[S] = 0; push(S, 0);
    while (heap.length) {
      const [d, n] = pop(); if (d > dist[n]) continue; if (n === T) break;
      for (const [m, km, cls] of (n < N ? adj[n] : []).concat(extra.get(n) || [])) {
        const nd = d + km / (SPEED[cls] || 40); if (nd < dist[m]) { dist[m] = nd; prev[m] = n; push(m, nd); }
      }
    }
    if (!isFinite(dist[T])) return null;
    const ids = []; for (let n = T; n >= 0; n = prev[n]) ids.push(n); ids.reverse();
    const pts = ids.map((n) => (n === S ? [fx, fz] : n === T ? [tx, tz] : [x[n], z[n]]));
    const deg = ids.map((n) => (n < N ? adj[n].length : 0));
    return { pts, deg, hours: dist[T] };
  }

  /* ---------------- Turns ---------------- */
  function maneuvers(pts, deg, cum) {
    const out = [], head = (a, b) => Math.atan2(b[0] - a[0], -(b[1] - a[1]));     // 0 = north, clockwise
    const at = (i, back) => { // a point about 60 m before or after vertex i
      let j = i; while (j > 0 && j < pts.length - 1 && Math.abs(cum[j] - cum[i]) < 0.06) j += back ? -1 : 1; return pts[j]; };
    for (let i = 1; i < pts.length - 1; i++) {
      if (deg[i] < 3) continue;
      let a = head(at(i, true), pts[i]), b = head(pts[i], at(i, false)), t = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const deg_ = (t * 180) / Math.PI; if (Math.abs(deg_) < 30) continue;
      if (out.length && cum[i] - out[out.length - 1].at < 0.05) continue;
      out.push({ at: cum[i], turn: deg_ > 0 ? (deg_ > 110 ? "scharf rechts" : "rechts") : (deg_ < -110 ? "scharf links" : "links"), arrow: deg_ > 0 ? "↱" : "↰" });
    }
    return out;
  }

  /* ---------------- On the land ---------------- */
  function drawRibbon() {
    if (ribbon) { scene.remove(ribbon); ribbon.geometry.dispose(); ribbon = null; }
    if (!R) return;
    const w = Math.min(0.35, Math.max(0.006, camDist * 0.022)); ribbonW = w;
    // subdivide so the ribbon follows the hills
    const pts = []; for (let i = 0; i < R.pts.length - 1; i++) { const [ax, az] = R.pts[i], [bx, bz] = R.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.05)); for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]); }
    pts.push(R.pts[R.pts.length - 1]);
    const pos = [], idx = [];
    pts.forEach(([px, pz], i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * w / 2, nz = dx / L * w / 2;
      const y = Math.max(0, heightAt(px, pz)) + 0.004 + w * 0.15;
      pos.push(px + nx, y, pz + nz, px - nx, y, pz - nz);
      if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    ribbon = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x2a8cff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    ribbon.renderOrder = 3; scene.add(ribbon);
  }

  /* ---------------- Panel and picker ---------------- */
  const css = `
  #nav { position: fixed; left: 10px; right: 70px; top: calc(max(10px, env(safe-area-inset-top)) + 96px); z-index: 5; display: flex; gap: 10px; align-items: center;
    background: linear-gradient(#1d5fa8, #154a85); border: 2px solid #d9b56e; border-radius: 14px; padding: 8px 10px; color: #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.35); font: 600 14px "Figtree", sans-serif; }
  #nav .ar { font-size: 30px; line-height: 1; width: 34px; text-align: center; }
  #nav .t { flex: 1; min-width: 0; } #nav .t b { display: block; font: 700 16px "Figtree", sans-serif; }
  #nav .t span { opacity: 0.85; font-weight: 400; }
  #nav button { border: 0; background: rgba(255,255,255,0.18); color: #fff; border-radius: 50%; width: 30px; height: 30px; font-size: 16px; }
  #navPick { position: fixed; inset: 0; z-index: 40; background: rgba(20,12,6,0.55); display: flex; flex-direction: column; }
  #navPick .sh { margin-top: auto; max-height: 85%; display: flex; flex-direction: column; background: linear-gradient(#f3e6c6, #e6d3a6); color: #2b1d12; border-radius: 16px 16px 0 0; padding: 12px 14px max(14px, env(safe-area-inset-bottom)); }
  #navPick h2 { margin: 0 0 8px; font: 800 19px "Cinzel", serif; display: flex; align-items: center; } #navPick h2 span { flex: 1; }
  #navPick h2 button { border: 1px solid #b9925a; background: #fff8e6; border-radius: 8px; padding: 4px 10px; font: 600 15px "Figtree", sans-serif; }
  #navPick input { font: 16px "Figtree", sans-serif; padding: 9px 12px; border-radius: 10px; border: 1px solid #b9925a; background: #fffaf0; margin-bottom: 8px; }
  #navPick .list { overflow: auto; }
  #navPick .list button { display: flex; width: 100%; justify-content: space-between; border: 0; border-bottom: 1px dashed #c9a873; background: none; padding: 10px 4px; font: 600 16px "Figtree", sans-serif; color: #2b1d12; text-align: left; }
  #navPick .list button small { color: #6a5030; font-weight: 400; }`;
  function style() { if ($("#navCss")) return; const s = document.createElement("style"); s.id = "navCss"; s.textContent = css; document.head.append(s); }
  // a few more places to drive to that have no label on the map (positions from OpenStreetMap)
  const ZIELE = [{ name: "Kallithea Mare Palace", sub: "Hotel bei den Thermen", lat: 36.38684, lon: 28.24068 }];
  // search forgives accents, case and doubled letters: "kalithea" finds "Kallithea"
  const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/(.)\1+/g, "$1");
  const fmt = (km) => (km < 1 ? Math.round(km * 100) * 10 + " m" : (km < 20 ? km.toFixed(1).replace(".", ",") : Math.round(km)) + " km");
  const fmtT = (h) => { const m = Math.max(1, Math.round(h * 60)); return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0"); };
  function places() {
    const [lat, lon] = unP(pl.x, pl.z), out = [];
    for (const [name, plat, plon] of TOWNS) out.push({ name, lat: plat, lon: plon, d: distKm([lat, lon], [plat, plon]) });
    for (const s of (window.SIGHTS || []).concat(ZIELE)) out.push({ name: s.name, sub: s.sub, lat: s.lat, lon: s.lon, d: distKm([lat, lon], [s.lat, s.lon]) });
    return out.sort((a, b) => a.d - b.d);
  }
  function pick() {
    style();
    const el = document.createElement("div"); el.id = "navPick";
    el.innerHTML = `<div class="sh"><h2><span>🚗 Wohin?</span><button type="button">✕</button></h2><input type="search" placeholder="Ort oder Sehenswürdigkeit …"><div class="list"></div></div>`;
    document.body.append(el);
    const list = el.querySelector(".list"), all = places();
    const show = (q) => { list.innerHTML = all.filter((p) => !q || norm(p.name + " " + (p.sub || "")).includes(norm(q))).slice(0, 60).map((p, i) => `<button type="button" data-i="${all.indexOf(p)}"><span>${p.name}${p.sub ? ` <small>· ${p.sub}</small>` : ""}</span><small>${fmt(p.d)} Luftlinie</small></button>`).join(""); };
    show(""); el.querySelector("input").oninput = (e) => show(e.target.value);
    el.querySelector("h2 button").onclick = () => el.remove(); el.addEventListener("click", (e) => { if (e.target === el) el.remove(); });
    list.onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; el.remove(); go(all[+b.dataset.i]); };
  }
  function go(dest) {
    if (!G) return toast("Das Straßennetz lädt noch.");
    const [tx, tz] = P(dest.lon, dest.lat), r = route(pl.x, pl.z, tx, tz);
    if (!r) return toast("Dorthin führt keine Straße.");
    const cum = [0]; for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    R = { dest, pts: r.pts, cum, total: cum[cum.length - 1], hours: r.hours, man: maneuvers(r.pts, r.deg, cum) };
    lastIdx = 0; lastCalc = performance.now(); drawRibbon();
    if (flag) { flag.e.remove(); }
    const f = document.createElement("div"); f.className = "lb pc"; f.innerHTML = `<b>🏁 ${dest.name}</b>`; $("#labels").append(f);
    flag = { e: f, v: new THREE.Vector3(tx, Math.max(0, heightAt(tx, tz)) + 0.06, tz) }; labels.push(flag);
    $("#routeBtn").classList.add("on"); panel();
  }
  function stop() {
    R = null; drawRibbon(); if (flag) { flag.e.remove(); labels.splice(labels.indexOf(flag), 1); flag = null; }
    const n = $("#nav"); if (n) n.remove(); $("#routeBtn").classList.remove("on");
  }
  function panel() {
    style(); let n = $("#nav");
    if (!n) { n = document.createElement("div"); n.id = "nav"; document.body.append(n); }
    if (!R) return;
    // where are we along the route?
    let best = lastIdx, bd = Infinity;
    for (let i = Math.max(0, lastIdx - 30); i < Math.min(R.pts.length - 1, lastIdx + 200); i++) {
      const [ax, az] = R.pts[i], [bx, bz] = R.pts[i + 1], p = project(pl.x, pl.z, ax, az, bx, bz); if (p.d < bd) { bd = p.d; best = i; }
    }
    lastIdx = best;
    const [ax, az] = R.pts[best], [bx, bz] = R.pts[best + 1] || R.pts[best], p = project(pl.x, pl.z, ax, az, bx, bz);
    const along = R.cum[best] + p.t * Math.hypot(bx - ax, bz - az), left = Math.max(0, R.total - along);
    if (left < 0.1) { toast(`🏁 Angekommen in ${R.dest.name}.`, 6000); stop(); return; }
    const next = R.man.find((m) => m.at > along + 0.01);
    const eta = R.hours * (left / R.total);
    n.innerHTML = `<div class="ar">${next && next.at - along < 2 ? next.arrow : "⬆"}</div><div class="t"><b>${next && next.at - along < 2 ? `In ${fmt(next.at - along)} ${next.turn}` : `Der Straße folgen${next ? " " + fmt(next.at - along) : ""}`}</b>
      <span>🚗 ${R.dest.name} · ${fmt(left)} · ${fmtT(eta)}${bd > 0.12 ? " · abseits der Route" : ""}</span></div><button type="button" aria-label="Route beenden">✕</button>`;
    n.querySelector("button").onclick = stop;
    // left the route? find a new one (with GPS, after a few seconds off it)
    const now = performance.now();
    if (bd > 0.15) { if (!offSince) offSince = now; if (now - offSince > 6000 && now - lastCalc > 10000) { offSince = 0; go(R.dest); toast("Neue Route.", 2000); } } else offSince = 0;
  }
  let tick = 0;
  function step(now) {
    if (!R) return;
    const w = Math.min(0.35, Math.max(0.006, camDist * 0.022)); if (Math.abs(w - ribbonW) / ribbonW > 0.3) drawRibbon();
    if (now - tick > 1000) { tick = now; panel(); }
  }

  window.Route = { build, go, stop, pick, step, style, route: () => R };
})();
