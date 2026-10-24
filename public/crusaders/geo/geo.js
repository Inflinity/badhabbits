/* The coasts of the Crusaders world, read from the region files listed in index.json.
   Land is stored as SVG paths: units of 1/100000 degree, x = longitude, y = minus latitude.
   CrusadersGeo.load(ids) → { regions, features: [{ name, quality, d, rings: [[[lon, lat], …]] }] } */
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
    return { regions, features, source: regions.map((r) => r.data.source) };
  }
  window.CrusadersGeo = { load, rings };
})();
