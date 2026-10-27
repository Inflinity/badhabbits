/* Crusaders · what you own in the world: your ship in the harbour (from level 10) and your
   fortress (from level 50), a fantasy town you found wherever you stand. With the dev aura both
   are open already. Loaded after the world's own script and uses its globals
   (THREE, scene, P, unP, heightAt, isLand, pl, pan, camDist, toast, label, labels, lmat, landNear, here, shipModel, ME). */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const LS = 0.0016;
  const SHIP_NAMES = ["Fischerboot", "Kaiki", "Kogge", "Galeere", "Karacke", "Galeone"];
  const SHIP_MODEL = ["kaiki", "kaiki", "kogge", "triere", "galeone", "galeone"], SHIP_SCALE = [1.4, 2, 2.2, 2.2, 2.5, 2.9], KNOTS = [4, 6, 6, 8, 7, 9];
  let PORTS = [], ship = null, fort = null;

  /* ---------------- The ship ---------------- */
  const portDist = (p) => { const [x, z] = P(p.lon, p.lat); return Math.hypot(x - pl.x, z - pl.z); };
  function placeShip(port) {
    const s = window.Spiel.get();
    if (ship) { scene.remove(ship.g); ship.lb.e.remove(); labels.splice(labels.indexOf(ship.lb), 1); ship = null; }
    if (!s.ship || !PORTS.length) return;
    port = port || [...PORTS].sort((a, b) => portDist(a) - portDist(b))[0];
    const [x, z] = P(port.lon, port.lat), g = shipModel(SHIP_MODEL[s.ship.stage] || "kaiki");
    g.scale.multiplyScalar(SHIP_SCALE[s.ship.stage] || 1.5); g.position.set(x, 0, z); g.rotation.y = 0.6; scene.add(g);
    label(`⛵ ${s.ship.name}`, `${SHIP_NAMES[s.ship.stage]} · ${port.name}`, x, z, "pc");
    ship = { g, port, lb: labels[labels.length - 1] };
  }
  function sail() {
    const s = window.Spiel.get(); if (!s.ship) return;
    const near = [...PORTS].sort((a, b) => portDist(a) - portDist(b)), from = near[0], ok = portDist(from) < 3 || s.aura;
    window.Route.style(); const el = document.createElement("div"); el.id = "navPick";
    el.innerHTML = `<div class="sh"><h2><span>⛵ ${s.ship.name}</span><button type="button">✕</button></h2>
      <p style="margin:0 0 8px;font:15px 'IM Fell English',serif">${ok ? `Dein Schiff liegt in ${from.name}. Wohin segeln wir?` : `Dein Schiff liegt in ${from.name}, ${Math.round(portDist(from))} km von dir. Geh zum Hafen, dann legt ihr ab.`}</p>
      <div class="list">${near.slice(1).map((p) => { const [ax, az] = P(from.lon, from.lat), [bx, bz] = P(p.lon, p.lat), km = Math.hypot(bx - ax, bz - az) * 1.25, h = km / (KNOTS[s.ship.stage] * 1.852);
        return `<button type="button" data-p="${p.name}" ${ok ? "" : "disabled"}><span>${p.name}</span><small>${Math.round(km)} km · ${h < 1 ? Math.round(h * 60) + " min" : h.toFixed(1).replace(".", ",") + " h"} auf See</small></button>`; }).join("")}</div></div>`;
    document.body.append(el);
    el.querySelector("h2 button").onclick = () => el.remove(); el.addEventListener("click", (e) => { if (e.target === el) el.remove(); });
    el.querySelectorAll("[data-p]").forEach((b) => b.onclick = () => {
      const p = PORTS.find((x) => x.name === b.dataset.p); el.remove();
      let spot = null; for (const d of [0.4, 0.8, 1.5, 3]) if ((spot = landNear({ lat: p.lat, lon: p.lon }, d))) break;      // the port lies off the shore: walk ashore
      if (!spot) return toast("Dort lässt sich nicht anlegen.");
      [pl.x, pl.z] = P(spot.lon, spot.lat); pl.tx = null; pan.x = pan.z = 0; placeShip(p);
      toast(`⛵ Die ${s.ship.name} legt in ${p.name} an. Land in Sicht!`, 6000);
    });
  }

  /* ---------------- The fortress: a fantasy town of your own ---------------- */
  function buildFort() {
    const s = window.Spiel.get(), f = s.feste;
    if (fort) { scene.remove(fort.g); fort.lb.e.remove(); labels.splice(labels.indexOf(fort.lb), 1); fort = null; }
    if (!f) return;
    const [cx, cz] = P(f.lon, f.lat), g = new THREE.Group(), y0 = Math.max(0, heightAt(cx, cz)), b = f.b || {};
    g.position.set(cx, y0, cz); scene.add(g);
    const M = {}, mat = (c) => M[c] || (M[c] = lmat(c));
    const put = (geo, c, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, mat(c)); o.position.set(x * LS, y * LS, z * LS); o.rotation.y = ry; g.add(o); return o; };
    const box = (w, h, d) => { const q = new THREE.BoxGeometry(w * LS, h * LS, d * LS); q.translate(0, (h * LS) / 2, 0); return q; };
    const cyl = (r, h, n = 10) => { const q = new THREE.CylinderGeometry(r * LS, r * LS, h * LS, n); q.translate(0, (h * LS) / 2, 0); return q; };
    const cone = (r, h, n = 10) => { const q = new THREE.ConeGeometry(r * LS, h * LS, n); q.translate(0, (h * LS) / 2, 0); return q; };
    // the ground, paved
    put(cyl(118, 3, 28), "#b8a888", 0, -1, 0);
    // ring wall with towers, higher with every level of the walls
    const R = 110, wh = 10 + 2 * (b.mauer || 0), N = 28;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2; if (i === 7) continue;                       // the gate
      const len = (2 * Math.PI * R) / N + 1; put(box(len, wh, 5), "#a8a094", Math.cos(a) * R, 0, Math.sin(a) * R, -a + Math.PI / 2);
      for (const k of [-0.3, 0.3]) put(box(3, 2.5, 5.5), "#a8a094", Math.cos(a + k / R * 10) * R, wh, Math.sin(a + k / R * 10) * R, -a + Math.PI / 2);
    }
    const ga = (7 / N) * Math.PI * 2; put(box(22, wh + 8, 14), "#9a9286", Math.cos(ga) * R, 0, Math.sin(ga) * R, -ga + Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2, x = Math.cos(a) * R, z = Math.sin(a) * R, th = wh + 12;
      put(cyl(8, th), "#b4ac9e", x, 0, z); put(cone(10, 14), i % 2 ? "#2a4a8a" : "#a8322a", x, th, z);
    }
    // houses inside, white and ochre with red and blue roofs
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 42; i++) {
      const a = rnd() * Math.PI * 2, d = 34 + rnd() * 58, x = Math.cos(a) * d, z = Math.sin(a) * d, w = 9 + rnd() * 6, h = 7 + rnd() * 6, ry = rnd() * Math.PI;
      put(box(w, h, w * 0.8), rnd() < 0.5 ? "#f2ede2" : "#e2c99a", x, 0, z, ry);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72 * LS, 6 * LS, 4), mat(rnd() < 0.6 ? "#b8502e" : "#3a5a9a")); roof.position.set(x * LS, (h + 3) * LS, z * LS); roof.rotation.y = ry + Math.PI / 4; g.add(roof);
    }
    // the keep with a slender spire and banners
    const kh = 42 + 6 * (b.bergfried || 0);
    put(cyl(16, kh, 12), "#c8c0b2", 0, 0, 0); put(cone(19, 24, 12), "#2a4a8a", 0, kh, 0);
    put(cyl(5, kh + 30, 8), "#d8d0c2", 14, 0, -6); put(cone(7, 22, 8), "#a8322a", 14, kh + 30, -6);
    for (const [x, z, c] of [[0, 0, "#e2b04a"], [14, -6, "#b8322a"]]) { put(box(0.8, 14, 0.8), "#5a3a20", x, (x ? kh + 52 : kh + 24), z); const fl = new THREE.Mesh(new THREE.PlaneGeometry(9 * LS, 5 * LS), new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); fl.position.set((x + 4.5) * LS, ((x ? kh + 52 : kh + 24) + 11) * LS, z * LS); g.add(fl); }
    label(`🏯 ${f.name}`, `deine Feste · beste Welle ${f.best || 0}`, cx, cz, "pc");
    fort = { g, lb: labels[labels.length - 1] };
  }
  function fortBtn() {
    const s = window.Spiel.get();
    if (s.feste) { location.href = "../feste/"; return; }
    if (!isLand(pl.x, pl.z)) return toast("Eine Feste braucht festen Boden.");
    const name = prompt("Hier deine Feste gründen? Wie soll sie heißen?", `Feste ${ME ? ME.name : "Generica"}`);
    if (!name) return;
    const [lat, lon] = unP(pl.x, pl.z), t = window.Spiel.get();
    t.feste = { lat, lon, name: name.trim().slice(0, 32), since: Date.now(), b: { mauer: 0, schatz: 0, schmiede: 0, bergfried: 0 }, best: 0 };
    window.Spiel.save(t); buildFort(); pad();
    toast(`🏯 ${t.feste.name} erhebt sich aus dem Boden! Tippe noch einmal auf Feste, um sie auszubauen und zu verteidigen.`, 8000);
  }
  function pad() {
    const s = window.Spiel.get();
    $("#sailBtn").hidden = !s.ship;
    $("#festeBtn").hidden = !(s.level >= 50 || s.aura);
  }
  function init(geo) {
    PORTS = geo.ports || [];
    placeShip(); buildFort(); pad();
    $("#sailBtn").onclick = sail; $("#festeBtn").onclick = fortBtn;
  }
  window.Besitz = { init, placeShip, buildFort, pad };
})();
