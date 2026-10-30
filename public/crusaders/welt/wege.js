/* Crusaders · the small ways: lanes, farm tracks and footpaths where you walk, fetched from OpenStreetMap as you go
   (a little square of about 3 × 2.7 km at a time, kept for the session) and laid on the ground as thin bands.
   The main roads come from the map data already; these are what you find on foot.
   Wege.init({ scene, heightAt }) · Wege.step(lat, lon, camDist) once a second or so. */
(function () {
  "use strict";
  const KM = 111.32, LON0 = 27.55, LAT0 = 36.52, KX = Math.cos((36.17 * Math.PI) / 180);
  const P = (lon, lat) => [(lon - LON0) * KM * KX, (LAT0 - lat) * KM];
  const TW = 0.036, TH = 0.024;      // one square, in degrees
  // width in metres (drawn 1.6 times, like everything on the map) and colour
  const KIND = {
    primary: [11, "#cbbfa8"], secondary: [9, "#cbbfa8"], tertiary: [7, "#cbbfa8"], unclassified: [6, "#c8bca4"], residential: [5, "#c8bca4"],
    living_street: [5, "#c8bca4"], service: [3.5, "#c2b59b"], track: [4, "#b39a73"], path: [2, "#d6c6a2"], footway: [2, "#d6c6a2"],
    bridleway: [2.5, "#c9b28a"], steps: [2, "#d6c6a2"], pedestrian: [4, "#d6c6a2"], cycleway: [2, "#d6c6a2"],
  };
  let ctx = null; const tiles = new Map(); let busy = false, group = null;
  function init(c) { ctx = c; group = new ctx.THREE.Group(); ctx.scene.add(group); }
  async function fetchTile(ix, iy) {
    const key = ix + "," + iy; if (tiles.has(key)) return; tiles.set(key, null); busy = true;
    const a = ix * TW, b = iy * TH, url = `https://api.openstreetmap.org/api/0.6/map?bbox=${a.toFixed(4)},${b.toFixed(4)},${(a + TW).toFixed(4)},${(b + TH).toFixed(4)}`;
    try {
      const r = await fetch(url); if (!r.ok) throw new Error(r.status);
      const xml = new DOMParser().parseFromString(await r.text(), "text/xml"), nodes = new Map(), lines = [];
      for (const n of xml.getElementsByTagName("node")) nodes.set(n.getAttribute("id"), [+n.getAttribute("lon"), +n.getAttribute("lat")]);
      for (const w of xml.getElementsByTagName("way")) {
        let hw = null; for (const t of w.getElementsByTagName("tag")) if (t.getAttribute("k") === "highway") hw = t.getAttribute("v");
        if (!hw || !KIND[hw]) continue;
        const pts = []; for (const nd of w.getElementsByTagName("nd")) { const p = nodes.get(nd.getAttribute("ref")); if (p) pts.push(p); }
        if (pts.length > 1) lines.push([hw, pts]);
      }
      tiles.set(key, build(lines));
    } catch (e) { console.warn("Wege", key, e); setTimeout(() => tiles.delete(key), 30000); }
    busy = false;
  }
  // a band along each way, sampled every 12 m, lying 2 m above the ground (drawn heights)
  function build(lines) {
    const THREE = ctx.THREE, by = {};
    for (const [hw, pts] of lines) {
      const [w, col] = KIND[hw], half = (w * 1.6) / 2000, arr = (by[col] = by[col] || []);
      const xs = pts.map(([lon, lat]) => P(lon, lat)), s = [];
      for (let i = 0; i + 1 < xs.length; i++) { const [ax, az] = xs[i], [bx, bz] = xs[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.012)); for (let k = 0; k < n; k++) s.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]); }
      s.push(xs[xs.length - 1]);
      for (let i = 0; i + 1 < s.length; i++) {
        const [ax, az] = s[i], [bx, bz] = s[i + 1], L = Math.hypot(bx - ax, bz - az) || 1e-6, nx = (-(bz - az) / L) * half, nz = ((bx - ax) / L) * half;
        const ya = ctx.heightAt(ax, az), yb = ctx.heightAt(bx, bz); if (ya < 0 && yb < 0) continue;
        const A = [ax + nx, ya + 0.002, az + nz], B = [ax - nx, ya + 0.002, az - nz], C = [bx + nx, yb + 0.002, bz + nz], D = [bx - nx, yb + 0.002, bz - nz];
        arr.push(...A, ...B, ...C, ...C, ...B, ...D);
      }
    }
    const g = new THREE.Group();
    for (const [col, arr] of Object.entries(by)) {
      if (!arr.length) continue;
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.renderOrder = 1; g.add(m);
    }
    group.add(g); return g;
  }
  // fetch the square you are in first, then the ones around it, one at a time; only shown when you are close
  function step(lat, lon, camDist) {
    if (!group) return;
    group.visible = camDist < 9;
    if (busy || camDist > 30) return;
    const ix = Math.floor(lon / TW), iy = Math.floor(lat / TH);
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const k = ix + dx + "," + (iy + dy); if (!tiles.has(k)) { fetchTile(ix + dx, iy + dy); return; }
    }
  }
  window.Wege = { init, step };
})();
