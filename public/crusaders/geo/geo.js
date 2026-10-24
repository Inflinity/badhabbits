/* The coasts of the Crusaders world, read from the region files listed in index.json.
   Land is stored as SVG paths: units of 1/100000 degree, x = longitude, y = minus latitude.
   CrusadersGeo.load(ids) → { regions, features: [{ name, quality, d, rings: [[[lon, lat], …]] }], landmarks } */
(function () {
  "use strict";
  const base = (document.currentScript && document.currentScript.src.replace(/[^/]*$/, "")) || "/crusaders/geo/";
  // our own paths only use M, l and z; anything else in a future file is read as relative lines too
  function rings(d) {
    const out = []; let ring = null, x = 0, y = 0, abs = false;
    const tok = d.match(/[MmLlZz]|-?\d+(?:\.\d+)?/g) || [];
    for (let i = 0; i < tok.length; i++) {
      const t = tok[i];
      if (t === "M" || t === "m") { abs = t === "M"; const nx = +tok[++i], ny = +tok[++i]; x = abs ? nx : x + nx; y = abs ? ny : y + ny; ring = [[x / 1e5, -y / 1e5]]; out.push(ring); abs = false; continue; }
      if (t === "L") { abs = true; continue; }
      if (t === "l") { abs = false; continue; }
      if (t === "Z" || t === "z") { ring = null; continue; }
      const nx = +t, ny = +tok[++i]; x = abs ? nx : x + nx; y = abs ? ny : y + ny; if (ring) ring.push([x / 1e5, -y / 1e5]);
    }
    return out;
  }
  async function load(ids) {
    const idx = await (await fetch(base + "index.json")).json();
    const list = idx.regions.filter((r) => !ids || ids.includes(r.id));
    const regions = await Promise.all(list.map(async (r) => ({ ...r, data: await (await fetch(base + r.file)).json() })));
    const features = [];
    for (const r of regions) for (const f of r.data.features) features.push({ ...f, region: r.id, quality: r.quality, rings: rings(f.d) });
    // the few special places get a list of building parts (a few kilobytes each)
    const landmarks = [];
    for (const r of regions) if (r.landmarks) { const lm = await (await fetch(base + r.landmarks)).json(); for (const l of lm.landmarks) landmarks.push({ ...l, colors: lm.colors }); }
    // main roads and sea lanes, where a region has them
    const roads = [], lanes = [], ports = [];
    for (const r of regions) {
      if (r.strassen) { const rd = await (await fetch(base + r.strassen)).json(); for (const f of rd.features) roads.push({ ...f, lines: rings(f.d) }); }
      if (r.seewege) { const sw = await (await fetch(base + r.seewege)).json(); lanes.push(...sw.routes); ports.push(...sw.ports); }
    }
    return { regions, features, landmarks, roads, lanes, ports, source: regions.map((r) => r.data.source) };
  }
  window.CrusadersGeo = { load, rings };
})();
