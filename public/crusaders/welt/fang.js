/* Crusaders · Feralis: the wild things you find on the way. For now sea urchins on the rocks of the shallows and
   flying fish out at sea. One shows up near you now and then; tap it, it comes to the water beside you, and you see
   it from the hull of a boat. You catch it with a cast net: a round net weighted with lead along its rim.
   Throwing, one-handed with the thumb: flick up and the net flies where you flick, as far as you flick hard.
   Charging: circle your thumb a little first, a turn or two, then flick: the spin opens the net wide and carries it
   further, as a real cast net is thrown with a twist. Three nets per catch.
   Feralis.init({ THREE, scene, camera, isLand, heightAt, toast, onOpen, onClose }) · Feralis.step(dt, pl) · Feralis.tap(px, py) */
(function () {
  "use strict";
  let C = null; const wild = []; let nextAt = 0, lastPos = null, moved = 0, open = false;
  const KINDS = {
    seeigel: { name: "Seeigel", plural: "Seeigel", icon: "🦔", exp: 15, gold: 4 },
    flugfisch: { name: "Fliegender Fisch", plural: "Fliegende Fische", icon: "🐟", exp: 25, gold: 8 },
  };

  /* ---------------- Low-poly models, shared by the world and the catch ---------------- */
  function urchinModel(THREE) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshPhongMaterial({ color: 0x2a1530, flatShading: true, shininess: 12 }));
    body.scale.set(1, 0.72, 1); g.add(body);
    const sp = new THREE.ConeGeometry(0.06, 0.75, 4); sp.translate(0, 0.37, 0);
    const sm = new THREE.MeshPhongMaterial({ color: 0x3b1d45, flatShading: true, shininess: 12 }), v = new THREE.Vector3();
    const ico = new THREE.IcosahedronGeometry(1, 1), pos = ico.attributes.position, seen = new Set();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); const key = v.toArray().map((a) => a.toFixed(2)).join(); if (seen.has(key) || v.y < -0.5) continue; seen.add(key);
      const s = new THREE.Mesh(sp, sm); s.position.copy(v).multiplyScalar(0.36).setY(v.y * 0.26); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); s.scale.setScalar(0.8 + Math.random() * 0.4); g.add(s);
    }
    return g;
  }
  function fishModel(THREE) {
    const g = new THREE.Group();
    // body: a slim spindle, deep blue above, silver beneath
    const prof = [[0, -0.55], [0.07, -0.42], [0.11, -0.15], [0.1, 0.15], [0.07, 0.35], [0.03, 0.5], [0, 0.56]].map(([r, y]) => new THREE.Vector2(r, y));
    const bg = new THREE.LatheGeometry(prof, 7); bg.rotateX(Math.PI / 2);
    const col = [], p = bg.attributes.position;
    for (let i = 0; i < p.count; i++) { const up = p.getY(i) > 0.01 ? 1 : p.getY(i) > -0.03 ? 0.5 : 0; const c = new THREE.Color(0x9fb4c4).lerp(new THREE.Color(0x163f7a), up); col.push(c.r, c.g, c.b); }
    bg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.add(new THREE.Mesh(bg, new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 12 })));
    // the great pectoral fins, its wings: thin, a little see-through
    const fm = new THREE.MeshPhongMaterial({ color: 0xbfd9ee, transparent: true, opacity: 0.75, side: THREE.DoubleSide, flatShading: true, shininess: 12 });
    const wing = new THREE.BufferGeometry(); wing.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.18, 0, 0, -0.05, 0.62, 0.02, -0.28, 0, 0, 0.18, 0.62, 0.02, -0.28, 0.55, 0.02, 0.05], 3)); wing.computeVertexNormals();
    const L = new THREE.Mesh(wing, fm), R = new THREE.Mesh(wing, fm); R.scale.x = -1; L.position.set(0.05, 0.03, 0.12); R.position.set(-0.05, 0.03, 0.12); g.add(L, R); g.userData.wings = [L, R];
    // a forked tail, the lower lobe longer
    const tail = new THREE.BufferGeometry(); tail.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.5, 0, 0.16, -0.78, 0, 0.02, -0.62, 0, 0, -0.5, 0, 0.02, -0.62, 0, -0.2, -0.86], 3)); tail.computeVertexNormals();
    g.add(new THREE.Mesh(tail, new THREE.MeshPhongMaterial({ color: 0x1d4c86, side: THREE.DoubleSide, flatShading: true, shininess: 12 })));
    return g;
  }

  /* ---------------- In the world: now and then one shows up near you ---------------- */
  function init(c) { C = c; nextAt = performance.now() + 25000; }
  function spawnNear(pl) {
    const { isLand } = C, kind = Math.random() < 0.45 ? "seeigel" : "flugfisch";
    // a sea urchin sits in the shallows near the shore; flying fish are out on open water
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, d = 0.06 + Math.random() * (0.25 + i * 0.02), x = pl.x + Math.cos(a) * d, z = pl.z + Math.sin(a) * d;
      if (isLand(x, z)) continue;
      let shore = 9; for (let r = 0.02; r <= 0.2; r += 0.02) { let hit = false; for (let k = 0; k < 8; k++) if (isLand(x + Math.cos(k * 0.785) * r, z + Math.sin(k * 0.785) * r)) { hit = true; break; } if (hit) { shore = r; break; } }
      if (kind === "seeigel" ? shore > 0.08 : shore < 0.12) continue;
      const THREE = C.THREE, m = kind === "seeigel" ? urchinModel(THREE) : fishModel(THREE), g = new THREE.Group(); g.add(m);
      g.scale.setScalar(kind === "seeigel" ? 0.03 : 0.035); g.position.set(x, 0, z); C.scene.add(g);
      const e = document.createElement("div"); e.className = "lb feral"; e.innerHTML = `<b>✨ ${KINDS[kind].name}</b><i>Feralis · antippen</i>`; document.querySelector("#labels").append(e);
      wild.push({ kind, x, z, g, m, e, born: performance.now(), ph: Math.random() * 6 });
      C.toast(`✨ Ein Feralis: ${KINDS[kind].name}, nicht weit von dir. Tipp ihn an.`, 5000);
      return;
    }
  }
  const pv = { x: 0, y: 0 };
  function step(dt, pl, camDist) {
    if (!C) return; const now = performance.now();
    if (lastPos) moved += Math.hypot(pl.x - lastPos[0], pl.z - lastPos[1]); lastPos = [pl.x, pl.z];
    // one at a time; after you have gone some way (or some time at the water), another
    if (!open && now > nextAt && !wild.length && (moved > 0.12 || now - nextAt > 60000)) { spawnNear(pl); moved = 0; nextAt = now + 45000 + Math.random() * 45000; }
    const v = new C.THREE.Vector3();
    for (let i = wild.length - 1; i >= 0; i--) {
      const w = wild[i], t = now / 1000 + w.ph;
      if (Math.hypot(pl.x - w.x, pl.z - w.z) > 2.5 || now - w.born > 240000) { gone(i); continue; }
      if (w.kind === "seeigel") { w.g.position.y = 0.002 + Math.sin(t * 1.3) * 0.0015; w.m.rotation.y += dt * 0.3; }
      else { const ph = (t % 5) / 5, hop = ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI) : 0; w.g.position.y = hop * 0.03 - (1 - hop) * 0.004; w.m.rotation.y = t * 0.4; w.m.rotation.x = -Math.cos((ph / 0.4) * Math.PI) * 0.5 * (ph < 0.4); }
      v.set(w.x, w.g.position.y + 0.03, w.z).project(C.camera);
      const show = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && camDist < 25;
      w.e.style.display = show ? "" : "none"; w.sx = ((v.x + 1) / 2) * innerWidth; w.sy = ((1 - v.y) / 2) * innerHeight;
      if (show) { w.e.style.left = w.sx + "px"; w.e.style.top = w.sy + "px"; }
    }
  }
  function gone(i) { const w = wild[i]; C.scene.remove(w.g); w.e.remove(); wild.splice(i, 1); }
  // a tap on one (or its label) brings it beside you and opens the catch
  function tap(px, py) {
    if (open) return true;
    for (let i = 0; i < wild.length; i++) { const w = wild[i]; if (w.e.style.display !== "none" && Math.hypot(px - w.sx, py - (w.sy - 14)) < 48) { const k = w.kind; gone(i); catchScene(k); return true; } }
    return false;
  }

  /* ---------------- The catch: seen from the hull of a boat ---------------- */
  function catchScene(kind) {
    open = true; C.onOpen && C.onOpen();
    const THREE = C.THREE, K = KINDS[kind];
    const root = document.createElement("div"); root.id = "fang";
    root.innerHTML = `<style>
      #fang { position: fixed; inset: 0; z-index: 30; background: #0b2a44; touch-action: none; user-select: none; -webkit-user-select: none; }
      #fang canvas { width: 100%; height: 100%; display: block; }
      #fang .hd { position: absolute; left: 12px; right: 12px; top: max(12px, env(safe-area-inset-top)); display: flex; justify-content: space-between; align-items: center; color: #fff; font: 600 15px "Figtree", sans-serif; text-shadow: 0 1px 4px #000; pointer-events: none; }
      #fang .hd b { font: 700 18px "Cinzel", serif; letter-spacing: 0.06em; }
      #fang .x { pointer-events: auto; border: 1px solid rgba(255,255,255,0.4); background: rgba(0,0,0,0.35); color: #fff; border-radius: 20px; padding: 7px 12px; font: 600 14px "Figtree", sans-serif; }
      #fang .tip { position: absolute; left: 16px; right: 16px; bottom: max(18px, env(safe-area-inset-bottom)); text-align: center; color: #fff; font: 500 14px "Figtree", sans-serif; text-shadow: 0 1px 4px #000; pointer-events: none; }
      #fang .msg { position: absolute; left: 0; right: 0; top: 38%; text-align: center; color: #fff; font: 700 26px "Cinzel", serif; text-shadow: 0 2px 10px #000; opacity: 0; transition: opacity 0.4s; pointer-events: none; }
      #fang .msg.on { opacity: 1; }
      #fang .ring { position: absolute; width: 74px; height: 74px; margin: -37px 0 0 -37px; border-radius: 50%; pointer-events: none; display: none; }
    </style><canvas></canvas><div class="hd"><span><b>${K.icon} ${K.name}</b><br><span class="nets"></span></span><button type="button" class="x">Zurück</button></div>
      <div class="ring"></div><div class="msg"></div><div class="tip">Mit dem Daumen nach oben wischen: das Netz fliegt, wohin und wie fest du wischst. Vorher den Daumen ein, zwei Mal kreisen lassen: Drall, das Netz öffnet sich weiter.</div>`;
    document.body.append(root);
    const cv = root.querySelector("canvas"), rr = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    rr.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); rr.toneMapping = THREE.ACESFilmicToneMapping; rr.outputEncoding = THREE.sRGBEncoding;
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, 0.05, 900);
    cam.position.set(0, 2.6, 0); cam.lookAt(0, 0, -12);
    const resize = () => { rr.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }; resize(); addEventListener("resize", resize);
    sc.add(new THREE.HemisphereLight(0xdfefff, 0x2a4a5a, 0.95)); const sun = new THREE.DirectionalLight(0xfff2dc, 1.1); sun.position.set(-6, 9, -4); sc.add(sun);
    const shallow = kind === "seeigel";
    // the sky
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
      vertexShader: "varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec3 d; void main(){ float h = clamp(d.y, 0.0, 1.0); vec3 c = mix(vec3(0.62, 0.78, 0.92), vec3(0.10, 0.34, 0.74), pow(h, 0.5)); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}" }));
    sc.add(sky);
    // the floor of the shallows: sand, and rocks with the urchin on one
    const floorY = shallow ? -2.0 : -40;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(200, 200, 60, 60), new THREE.MeshPhongMaterial({ color: shallow ? 0xd8c49a : 0x0a2a4a, flatShading: true, shininess: 12 }));
    fl.rotation.x = -Math.PI / 2; fl.position.y = floorY; { const p = fl.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, (Math.sin(p.getX(i) * 0.7) + Math.cos(p.getY(i) * 0.9)) * 0.12); fl.geometry.computeVertexNormals(); } sc.add(fl);
    const target = { kind, x: 0, y: 0, z: -9, caught: false, gone: false };
    Feralis.peek = () => ({ target, net });      // for trying it out
    if (shallow) {
      const rm = new THREE.MeshPhongMaterial({ color: 0x6f6a62, flatShading: true, shininess: 12 });
      for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.9, 0), rm); r.position.set((Math.random() - 0.5) * 14, floorY + 0.2, -5 - Math.random() * 14); r.scale.y = 0.6; r.rotation.set(Math.random(), Math.random(), Math.random()); sc.add(r); }
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), rm); target.x = (Math.random() - 0.5) * 5; target.z = -7 - Math.random() * 5; rock.position.set(target.x, floorY + 0.35, target.z); rock.scale.y = 0.7; sc.add(rock);
      target.y = floorY + 1.05; target.m = urchinModel(THREE); target.m.scale.setScalar(0.42); target.m.position.set(target.x, target.y, target.z); sc.add(target.m);
    } else {
      target.m = fishModel(THREE); target.m.scale.setScalar(0.55); sc.add(target.m);
      target.leap = null; target.wait = 1 + Math.random() * 1.5; target.x = (Math.random() - 0.5) * 8; target.z = -12 - Math.random() * 6; target.y = -0.6;
    }
    // the sea: waves, the sky in it, light from the floor in the shallows; see-through enough to find the urchin
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      uniforms: { uT: { value: 0 }, uShallow: { value: shallow ? 1 : 0 } },
      vertexShader: "varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `varying vec3 vP; uniform float uT, uShallow;
        void main(){
          vec2 p = vP.xz; float dist = length(cameraPosition - vP);
          vec2 s = vec2(0.0);
          s += vec2(0.8, 0.6) * cos(dot(vec2(0.8, 0.6), p) * 1.3 + uT * 1.4) * 0.09;
          s += vec2(-0.5, 0.86) * cos(dot(vec2(-0.5, 0.86), p) * 2.7 + uT * 2.1) * 0.06 / (1.0 + dist * 0.05);
          s += vec2(0.97, -0.24) * cos(dot(vec2(0.97, -0.24), p) * 5.3 + uT * 3.0) * 0.04 / (1.0 + dist * 0.1);
          vec3 N = normalize(vec3(-s.x, 1.0, -s.y)), V = normalize(cameraPosition - vP);
          float fr = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 R = reflect(-V, N); vec3 sky = mix(vec3(0.62, 0.78, 0.92), vec3(0.10, 0.34, 0.74), pow(clamp(R.y, 0.0, 1.0), 0.5));
          vec3 deep = mix(vec3(0.02, 0.12, 0.3), vec3(0.08, 0.55, 0.6), uShallow);
          vec3 col = mix(deep, sky, fr);
          float sp = pow(max(dot(R, normalize(vec3(-0.5, 0.75, -0.35))), 0.0), 200.0); col += vec3(1.0, 0.95, 0.85) * sp * 3.0;
          float a = mix(0.92, mix(0.45, 0.85, smoothstep(5.0, 30.0, dist)), uShallow);
          gl_FragColor = vec4(col, mix(a, 1.0, fr));
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }` }));
    sea.rotation.x = -Math.PI / 2; sea.renderOrder = 2; sc.add(sea);
    // the hull: the bow before you, planks and a gunwale
    const wood = new THREE.MeshPhongMaterial({ color: 0x6b4428, flatShading: true, shininess: 12 }), dark = new THREE.MeshPhongMaterial({ color: 0x3e2716, flatShading: true, shininess: 12 });
    // two gunwales that meet at the stem, planking down from them to the water, and a low deck between
    const beam = (a, b, w, h, m) => { const d = new THREE.Vector3().subVectors(b, a), o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d.length()), m); o.position.copy(a).add(b).multiplyScalar(0.5); o.lookAt(b); sc.add(o); return o; };
    const tip = new THREE.Vector3(0, 1.35, -2.7);
    for (const side of [-1, 1]) {
      const back = new THREE.Vector3(side * 1.05, 1.35, 0.6);
      beam(back, tip, 0.16, 0.1, dark);
      for (let k = 1; k <= 4; k++) { const dy = k * 0.22, sh = 1 - k * 0.07; beam(new THREE.Vector3(back.x * sh, back.y - dy, back.z), new THREE.Vector3(0, tip.y - dy, tip.z + k * 0.12), 0.08, 0.2, k % 2 ? wood : dark); }
    }
    beam(new THREE.Vector3(0, 0.4, -2.2), new THREE.Vector3(0, 1.42, -2.78), 0.13, 0.13, dark);      // the stem, raked forward
    const deckShape = new THREE.Shape([new THREE.Vector2(-1.0, -0.6), new THREE.Vector2(1.0, -0.6), new THREE.Vector2(0, 2.6)]);
    const deck = new THREE.Mesh(new THREE.ShapeGeometry(deckShape), wood); deck.rotation.x = -Math.PI / 2; deck.position.y = 1.2; sc.add(deck);
    // splashes: little white sprites that fly and fall
    const drops = []; const dropMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }), dropGeo = new THREE.SphereGeometry(0.05, 5, 4);
    const splash = (x, z, n = 18, k = 1) => { for (let i = 0; i < n; i++) { const d = new THREE.Mesh(dropGeo, dropMat); d.position.set(x, 0.02, z); d.userData.v = new THREE.Vector3((Math.random() - 0.5) * 2 * k, 1.5 + Math.random() * 2.2 * k, (Math.random() - 0.5) * 2 * k); d.userData.life = 1; sc.add(d); drops.push(d); } };
    // the net: lead weights on a ring, and the mesh between them
    let nets = 3, net = null;
    const navNets = () => (root.querySelector(".nets").textContent = `Netze: ${"◯ ".repeat(nets)}`.trim()); navNets();
    // the mesh: a knotted diamond pattern, drawn once, laid over the round net between the weights
    const meshTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
      x.strokeStyle = "rgba(236,226,200,0.95)"; x.lineWidth = 7; x.beginPath(); x.moveTo(0, 0); x.lineTo(64, 64); x.moveTo(64, 0); x.lineTo(0, 64); x.stroke();
      x.fillStyle = "rgba(200,186,150,1)"; for (const [a, b] of [[0, 0], [64, 0], [0, 64], [64, 64], [32, 32]]) { x.beginPath(); x.arc(a, b, 5.5, 0, 7); x.fill(); }      // the knots
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
    })();
    const RN = 7;      // rings of the mesh, from the centre out to the rim
    function makeNet() {
      const g = new THREE.Group(), N = 16, lead = new THREE.MeshLambertMaterial({ color: 0x55585e }), w = [];
      for (let i = 0; i < N; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), lead); g.add(s); w.push(s); }
      // the lines: the rim between the weights, and the cords from the hand line in the middle to each weight
      const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 4 * 3), 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0.9 })); g.add(lines);
      // the mesh between them: a disc of (N + 1) × (RN + 1) points, the pattern repeating round and out
      const mg = new THREE.BufferGeometry(), pos = new Float32Array((N + 1) * (RN + 1) * 3), uv = [], idx = [];
      for (let j = 0; j <= RN; j++) for (let i = 0; i <= N; i++) uv.push((i / N) * 14, (j / RN) * 6);
      for (let j = 0; j < RN; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      mg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); mg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); mg.setIndex(idx);
      const mesh = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ map: meshTex, transparent: true, alphaTest: 0.12, side: THREE.DoubleSide, depthWrite: false, color: 0xf4ead2 }));
      mesh.frustumCulled = false; g.add(mesh);
      sc.add(g); return { g, w, lines, mesh, N };
    }
    function drawNet(n) {
      const { w, lines, mesh, N } = n, p = lines.geometry.attributes.position, r = n.r, droop = n.landed ? 0.05 : 0.35 * r;
      // in flight the middle rides high and the weights pull the rim down: a bell; on the water it lies flat
      const pt = (i, f) => { const a = (i / N) * Math.PI * 2 + n.rot, sag = n.landed ? 0 : droop * (1 - f * f) * 0.4 + Math.sin(i * 2.1 + n.t * 9) * 0.02 * f; return [n.c.x + Math.cos(a) * r * f, n.c.y - sag + (n.landed ? 0 : (1 - f) * 0.25 * r), n.c.z + Math.sin(a) * r * f]; };
      let k = 0; const put = (a) => { p.setXYZ(k++, a[0], a[1], a[2]); };
      for (let i = 0; i < N; i++) { const [x, y, z] = pt(i, 1); w[i].position.set(x, y - (n.landed ? 0 : 0.05), z); put(pt(i, 1)); put(pt((i + 1) % N, 1)); put(pt(i, 0)); put(pt(i, 1)); }
      p.needsUpdate = true;
      // the mesh follows the same bell, a touch lower in the middle of each ring
      const mp = mesh.geometry.attributes.position;
      for (let j = 0; j <= RN; j++) { const f = j / RN; for (let i = 0; i <= N; i++) { const q = pt(i, f); mp.setXYZ(j * (N + 1) + i, q[0], q[1] - (n.landed ? 0 : 0.03 * Math.sin(Math.PI * f)), q[2]); } }
      mp.needsUpdate = true;
    }
    // the thumb: it circles (spin), then flicks
    const ring = root.querySelector(".ring"); let tr = null;
    cv.addEventListener("pointerdown", (e) => { if (net || nets <= 0 || target.caught || target.gone) return; tr = { pts: [[e.clientX, e.clientY, performance.now()]], turn: 0, lastA: null }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => {
      if (!tr) return; const now = performance.now(), last = tr.pts[tr.pts.length - 1], dx = e.clientX - last[0], dy = e.clientY - last[1];
      if (Math.hypot(dx, dy) < 3) return;
      const a = Math.atan2(dy, dx); if (tr.lastA != null) { let d = a - tr.lastA; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) < 1.2) tr.turn += d; } tr.lastA = a;
      tr.pts.push([e.clientX, e.clientY, now]); while (tr.pts.length > 60) tr.pts.shift();
      const spin = Math.min(1, Math.abs(tr.turn) / (Math.PI * 4));
      ring.style.display = spin > 0.05 ? "block" : "none"; ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px";
      ring.style.background = `conic-gradient(rgba(255,215,106,0.9) ${spin * 360}deg, rgba(255,255,255,0.15) 0)`; ring.style.webkitMask = ring.style.mask = "radial-gradient(circle, transparent 28px, #000 29px)";
    });
    const release = (e) => {
      if (!tr) return; ring.style.display = "none"; const now = performance.now(), lastT = tr.pts[tr.pts.length - 1][2];
      // the flick is the last tenth of a second of movement; a thumb that stopped before letting go threw nothing
      let recent = tr.pts.filter((p) => lastT - p[2] < 110); if (recent.length < 2) recent = tr.pts.slice(-2);
      const t0 = tr; tr = null; if (recent.length < 2 || now - lastT > 300) return;
      const a = recent[0], b = recent[recent.length - 1], dt = Math.max(0.016, (b[2] - a[2]) / 1000), vx = (b[0] - a[0]) / dt, vy = (b[1] - a[1]) / dt;
      if (vy > -350) return;      // a flick goes up the screen
      const spin = Math.min(1, Math.abs(t0.turn) / (Math.PI * 4)), speed = Math.min(3200, Math.hypot(vx, vy));
      // the flick's strength gives the range, its slant the direction; spin carries further and opens wider
      const range = (3 + ((speed - 350) / 2850) * 15) * (1 + 0.3 * spin), dir = Math.atan2(vx, -vy) * 0.9, fwd = new THREE.Vector3(Math.sin(dir), 0, -Math.cos(dir));
      const T = 0.55 + range * 0.045, vh = (range / T), vup = (0.5 * 9.81 * T * T - 1.6) / T;
      nets--; navNets(); root.querySelector(".tip").style.opacity = "0";
      net = makeNet(); Object.assign(net, { c: new THREE.Vector3(0.2, 1.6, -0.6), v: fwd.multiplyScalar(vh).setY(vup), t: 0, r: 0.15, rMax: 0.75 + spin * 1.35 + (Math.random() - 0.5) * 0.2 * (1 - spin), rot: 0, rs: (t0.turn > 0 ? 1 : -1) * (2 + spin * 10), landed: false, sink: 0 });
    };
    cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", () => { tr = null; ring.style.display = "none"; });
    const msg = (t, ms = 1600) => { const m = root.querySelector(".msg"); m.textContent = t; m.classList.add("on"); clearTimeout(msg.tm); msg.tm = setTimeout(() => m.classList.remove("on"), ms); };
    // the fish: under water as a dark shape, then out in a long glide, wings spread, and down again
    function fishStep(dt) {
      if (target.caught) return;
      if (!target.leap) {
        target.wait -= dt; target.z += dt * 0.8 * Math.sin(target.wait); target.y = -0.5;
        if (target.wait <= 0) { const a = (Math.random() - 0.5) * 1.6, L = 10 + Math.random() * 12; target.leap = { t: 0, T: 1.8 + Math.random() * 1.2, x0: target.x, z0: target.z, dx: Math.sin(a) * L, dz: Math.cos(a) * L * (target.z < -18 ? 1 : -1) * 0.6, H: 0.6 + Math.random() * 1.0 }; splash(target.x, target.z, 10, 0.6); }
      } else {
        const L = target.leap; L.t += dt; const u = L.t / L.T;
        target.x = L.x0 + L.dx * u; target.z = clamp(L.z0 + L.dz * u, -32, -4);
        target.y = L.H * Math.sin(Math.PI * Math.min(u, 1)) * (u < 1 ? 1 : 0) - (u >= 1 ? 0.5 : 0);
        const wings = target.m.children[0] && target.m.userData; target.m.rotation.y = Math.atan2(L.dx, L.dz * -1) + Math.PI; target.m.rotation.x = -Math.cos(Math.PI * Math.min(u, 1)) * 0.35;
        if (u >= 1) { splash(target.x, target.z, 14, 0.8); target.leap = null; target.wait = 1.2 + Math.random() * 2.5; }
      }
      target.m.position.set(target.x, target.y, target.z);
      const w = target.m.children.filter((c) => c.geometry && c.geometry.attributes.position.count === 6 && c.material.transparent);
      w.forEach((m, i) => (m.rotation.z = (i ? -1 : 1) * (target.leap ? 0.05 * Math.sin(performance.now() / 60) : 0.9)));
    }
    function caught() {
      target.caught = true; const s = window.Spiel.get(); s.inv[kind] = (s.inv[kind] || 0) + 1; s.log.feralis = (s.log.feralis || 0) + 1; window.Spiel.save(s);
      const up = window.Spiel.reward(K.exp, K.gold); msg(`Gefangen! ${K.icon}`, 2400);
      root.querySelector(".tip").style.opacity = "1"; root.querySelector(".tip").textContent = `+${K.exp} Erfahrung · +${K.gold} Gold${up ? " · eine Stufe höher!" : ""}. Du hast jetzt ${s.inv[kind]} ${s.inv[kind] === 1 ? K.name : K.plural}.`;
      photoAt = performance.now() + 450; setTimeout(close, 3200);
    }
    // the moment of the catch as a photo for the postcard: drawn once more, wide (3 : 2) and turned towards the catch
    let photoAt = 0, photo = null;
    function takePhoto() {
      const w = 900, h = 600, at = (net ? net.c : target.m.position).clone();
      rr.setPixelRatio(1); rr.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      // from close by, a little above and behind the catch, so it fills the picture and the bow stays out
      const y0 = cam.position.y; cam.position.set(at.x * 0.6, 2.4, at.z + 4.2); cam.lookAt(at.x, Math.max(at.y, shallow ? floorY + 0.6 : -0.3), at.z);
      const hull = sc.children.filter((o) => o.material === wood || o.material === dark); hull.forEach((o) => (o.visible = false));
      rr.render(sc, cam); try { photo = cv.toDataURL("image/jpeg", 0.82); } catch (e) {}
      hull.forEach((o) => (o.visible = true));
      rr.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); cam.position.set(0, y0, 0); cam.lookAt(0, 0, -12); resize();
    }
    function netStep(dt) {
      const n = net; if (!n) return; n.t += dt; n.rot += n.rs * dt;
      if (!n.landed) {
        n.v.y -= 9.81 * dt; n.c.addScaledVector(n.v, dt); n.r += (n.rMax - n.r) * (1 - Math.exp(-dt * 4));
        // a fish in the air may be swept out of it by the flying net
        if (!shallow && target.y > 0.05 && Math.hypot(target.x - n.c.x, target.z - n.c.z) < n.r && Math.abs(target.y - n.c.y) < 0.7) { n.landed = true; n.c.y = 0; splash(n.c.x, n.c.z, 22); caught(); }
        else if (n.c.y <= 0) { n.c.y = 0; n.landed = true; splash(n.c.x, n.c.z, 22, 1.2);
          const d = Math.hypot(target.x - n.c.x, target.z - n.c.z);
          if (d < n.r * 0.95 && (shallow || target.y > -0.8)) { n.sinking = true; if (!shallow) caught(); }
          else { msg(nets > 0 ? (d < n.r * 1.6 ? "Knapp daneben!" : "Daneben.") : "Er ist entwischt …"); if (!nets) { target.gone = true; setTimeout(close, 2200); } }
        }
      } else {
        // the lead pulls the net down; over an urchin it closes around it
        if (n.c.y > floorY + 0.4 && (shallow || !target.caught)) n.c.y -= dt * (shallow ? 0.9 : 1.5);
        if (n.sinking && shallow && n.c.y <= target.y + 0.3 && !target.caught) caught();
        if (n.t > 2.6 && !target.caught) { sc.remove(n.g); net = null; }
      }
      drawNet(n);
    }
    let last = performance.now(), raf = 0;
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      sea.material.uniforms.uT.value = now / 1000;
      if (shallow) { target.m.rotation.y += dt * 0.15; if (target.caught && net) target.m.position.copy(net.c).setY(Math.max(net.c.y, floorY + 0.6)); }
      else if (target.caught && net) { target.m.position.set(net.c.x, 0.12, net.c.z); target.m.rotation.z = Math.sin(now / 90) * 0.4; }      // in the net, thrashing
      else fishStep(dt);
      netStep(dt);
      for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.userData.v.y -= 9.81 * dt; d.position.addScaledVector(d.userData.v, dt); if (d.position.y < 0) { sc.remove(d); drops.splice(i, 1); } }
      cam.position.y = 2.6 + Math.sin(now / 900) * 0.06; cam.rotation.z = Math.sin(now / 1300) * 0.015;      // the boat rocks a little
      if (photoAt && now > photoAt) { photoAt = 0; takePhoto(); }
      rr.render(sc, cam); raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    let closed = false;
    function close() { if (closed) return; closed = true; cancelAnimationFrame(raf); removeEventListener("resize", resize); rr.dispose(); root.remove(); open = false; C.onClose && C.onClose(); if (target.caught && C.onCatch) C.onCatch(kind, photo); }
    root.querySelector(".x").onclick = close;
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  window.Feralis = { init, step, tap, open: () => open, KINDS, test: (k) => catchScene(k) };
})();
