/* Crusaders avatar: a low-poly figure, woman or man, in every skin tone, build and hairstyle.
   Everyone starts in rags: a torn linen tunic, ragged trousers, a rope for a belt, bare feet.
   build(THREE, cfg) returns { root, update(dt, walk) }: walk 0..1 swings legs and arms. */
(function () {
  "use strict";
  const SKIN = ["#f6dcc6", "#eec3a2", "#e0a982", "#c98e66", "#a8704a", "#8a5636", "#6b3f26", "#4a2a19"];
  const HAIRC = ["#1d1611", "#3b2416", "#6b4226", "#a8743f", "#d9b56e", "#e8dcc0", "#9a9389", "#8e2f1a"];
  const HAIR = {
    f: [["lang", "lang"], ["zopf", "Zopf"], ["dutt", "Dutt"], ["kurz", "kurz"], ["locken", "Locken"], ["wild", "zerzaust"], ["glatze", "kahl"]],
    m: [["kurz", "kurz"], ["wild", "zerzaust"], ["lang", "lang"], ["zopf", "Zopf"], ["locken", "Locken"], ["dutt", "Knoten"], ["glatze", "kahl"]],
  };
  const BEARD = [["keiner", "keiner"], ["stoppeln", "Stoppeln"], ["voll", "Vollbart"], ["wild", "wild"]];
  const RAGS = { tunic: "#b9a582", tunic2: "#a8936e", pants: "#7d6a50", rope: "#8f7a52" };
  const defaults = (sex) => ({ sex, skin: 2, build: sex === "f" ? 0.3 : 0.4, muscle: sex === "f" ? 0.25 : 0.4, height: sex === "f" ? 168 : 180,
    hair: sex === "f" ? "lang" : "wild", hairC: 1, beard: sex === "f" ? "keiner" : "stoppeln" });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function build(THREE, cfg) {
    const mats = {};
    const mat = (c) => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
    const OUT = new THREE.MeshBasicMaterial({ color: 0x14100c, side: THREE.BackSide });
    function part(geo, color, parent, opts = {}) {
      const m = new THREE.Mesh(geo, mat(color));
      if (opts.outline !== false) {
        geo.computeBoundingBox(); const sz = new THREE.Vector3(); geo.boundingBox.getSize(sz);
        const o = new THREE.Mesh(geo, OUT);
        o.scale.set(1 + clamp(0.014 / sz.x, 0.02, 0.4), 1 + clamp(0.014 / sz.y, 0.02, 0.4), 1 + clamp(0.014 / sz.z, 0.02, 0.4));
        m.add(o);
      }
      if (parent) parent.add(m);
      return m;
    }
    function limb(r1, r2, len, color, parent, seg = 6) {
      const g = new THREE.CylinderGeometry(r1, r2, len, seg, 1); g.translate(0, -len / 2, 0);
      return part(g, color, parent);
    }
    // cloth with a torn hem: the lower ring of vertices pulled down unevenly
    function rag(rTop, rBot, len, color, parent, seg = 9, tear = 0.05, seed = 1) {
      const g = new THREE.CylinderGeometry(rTop, rBot, len, seg, 1, true); g.translate(0, -len / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < -len + 1e-4) p.setY(i, p.getY(i) - Math.abs(Math.sin(i * 12.9898 + seed * 78.233)) * tear);
      g.computeVertexNormals();
      const m = part(g, color, parent); m.material = m.material.clone(); m.material.side = THREE.DoubleSide;
      return m;
    }
    const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
    const F = cfg.sex === "f", skin = SKIN[cfg.skin] || SKIN[2], hairC = HAIRC[cfg.hairC] || HAIRC[1];
    const fat = cfg.build, mus = cfg.muscle;
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const J = { root, body };
    const hipW = F ? 0.105 : 0.095, shW = F ? 0.175 : 0.2;

    // legs: ragged trousers to below the knee, bare shins and feet
    for (const side of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(side * hipW * (1 + fat * 0.25), 0.93, 0); body.add(hip);
      const thighR = (F ? 0.092 : 0.088) * (1 + fat * 0.45 + mus * 0.15);
      limb(thighR * 1.06, thighR * 0.8, 0.43, RAGS.pants, hip);
      const knee = new THREE.Group(); knee.position.y = -0.43; hip.add(knee);
      const calf = (F ? 0.056 : 0.06) * (1 + fat * 0.25 + mus * 0.2);
      rag(calf * 1.25, calf * 1.2, 0.1, RAGS.pants, knee, 7, 0.05, side + 3);
      limb(calf, 0.042, 0.43, skin, knee);
      const foot = part(new THREE.BoxGeometry(0.09, 0.055, 0.24), skin, knee); foot.position.set(0, -0.455, 0.05);
      J[side < 0 ? "hipR" : "hipL"] = hip; J[side < 0 ? "kneeR" : "kneeL"] = knee;
    }
    // hips and torso in a torn linen tunic, a rope for a belt
    const pelvis = part(new THREE.CylinderGeometry((F ? 0.17 : 0.155) * (1 + fat * 0.3), (F ? 0.165 : 0.145) * (1 + fat * 0.25), 0.17, 7), RAGS.pants, body);
    pelvis.position.y = 0.99; pelvis.scale.z = 0.72;
    const chest = new THREE.Group(); chest.position.y = 1.06; body.add(chest); J.chest = chest;
    const waist = F ? 0.13 : 0.15;
    const torso = part(new THREE.CylinderGeometry(shW * (1 + mus * 0.15 + fat * 0.12), waist * (1 + fat * 0.5), 0.48, 7), RAGS.tunic, chest);
    torso.position.y = 0.24; torso.scale.z = 0.62;
    const skirt = rag(0.17 * (1 + fat * 0.4), (F ? 0.24 : 0.21) * (1 + fat * 0.4), 0.3, RAGS.tunic2, chest, 9, 0.08, 7);
    skirt.position.y = 0.03; skirt.scale.z = 0.75;
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.165 * (1 + fat * 0.45), 0.012, 4, 10), mat(RAGS.rope)); rope.rotation.x = Math.PI / 2; rope.scale.y = 0.74; rope.position.y = 0.03; chest.add(rope);
    const knot = part(new THREE.BoxGeometry(0.03, 0.09, 0.02), RAGS.rope, chest); knot.position.set(0.06, -0.02, 0.13 * (1 + fat * 0.3));
    if (F) for (const s of [-1, 1]) { const b = part(ico(0.062, 1), RAGS.tunic, chest, { outline: false }); b.position.set(s * 0.062, 0.32, 0.06); b.scale.set(1, 0.85, 0.65); }
    const belly = part(ico(0.15, 1), RAGS.tunic, chest, { outline: false }); belly.position.set(0, 0.1, 0.02 + 0.03 * fat);
    belly.scale.set(1 + fat * 0.3, 0.85, 0.3 + fat * 0.6);
    // neck, head, face
    const neck = new THREE.Group(); neck.position.y = 0.48; chest.add(neck); J.neck = neck;
    limb((F ? 0.048 : 0.056) * (1 + mus * 0.2), 0.06, 0.1, skin, neck).rotation.x = Math.PI;
    const head = new THREE.Group(); head.position.y = 0.17; neck.add(head); J.head = head;
    const skull = part(ico(F ? 0.106 : 0.112, 1), skin, head); skull.scale.set(F ? 0.88 : 0.92, 1.12, 1.0);
    const nose = part(new THREE.ConeGeometry(F ? 0.018 : 0.022, 0.045, 4), skin, head, { outline: false }); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.005, 0.11);
    for (const s of [-1, 1]) {
      const eye = part(new THREE.BoxGeometry(0.022, 0.014, 0.01), "#1a1410", head, { outline: false }); eye.position.set(s * 0.038, 0.02, 0.1);
      const brow = part(new THREE.BoxGeometry(0.036, F ? 0.007 : 0.01, 0.012), hairC, head, { outline: false }); brow.position.set(s * 0.038, 0.045, 0.098);
      const ear = part(new THREE.BoxGeometry(0.02, 0.05, 0.035), skin, head); ear.position.set(s * (F ? 0.096 : 0.104), 0, 0);
    }
    const mouth = part(new THREE.BoxGeometry(F ? 0.038 : 0.045, 0.008, 0.01), F ? "#9a3f34" : "#6b2f22", head, { outline: false }); mouth.position.set(0, -0.055, 0.097);
    // hair
    const hs = cfg.hair;
    if (hs !== "glatze") {
      const cap = part(new THREE.SphereGeometry(0.118, 7, 4, 0, Math.PI * 2, 0, Math.PI * (hs === "kurz" ? 0.5 : 0.56)), hairC, head, { outline: false });
      cap.scale.set(F ? 0.94 : 0.97, 1.12, 1.05); cap.position.set(0, 0.012, -0.01);
      if (hs === "lang") {
        const back = part(new THREE.BoxGeometry(F ? 0.2 : 0.19, F ? 0.36 : 0.24, 0.05), hairC, head); back.position.set(0, F ? -0.12 : -0.07, -0.085);
        for (const s of [-1, 1]) { const side = part(new THREE.BoxGeometry(0.035, F ? 0.24 : 0.16, 0.08), hairC, head); side.position.set(s * 0.1, F ? -0.07 : -0.03, -0.02); }
      }
      if (hs === "zopf") for (let i = 0; i < 7; i++) { const b = part(ico(0.032 - i * 0.002, 0), hairC, head); b.position.set(0, -0.06 - i * 0.05, -0.11 - i * 0.004); }
      if (hs === "dutt") { const b = part(ico(0.055, 1), hairC, head); b.position.set(0, 0.09, -0.08); }
      if (hs === "locken") for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, c = part(ico(0.04, 0), hairC, head, { outline: false }); c.position.set(Math.cos(a) * 0.1, 0.06 + Math.sin(i * 1.7) * 0.025, Math.sin(a) * 0.1 - 0.01); }
      if (hs === "wild") for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, sp = part(new THREE.ConeGeometry(0.03, 0.09, 4), hairC, head, { outline: false });
        sp.position.set(Math.cos(a) * 0.085, 0.07 + (i % 3) * 0.015, Math.sin(a) * 0.085 - 0.02); sp.lookAt(sp.position.clone().multiplyScalar(3).add(new THREE.Vector3(0, 0.3, 0))); sp.rotateX(Math.PI / 2);
      }
    }
    // beard (men only)
    if (!F && cfg.beard !== "keiner") {
      const long = cfg.beard === "wild" ? 1.55 : cfg.beard === "voll" ? 1.3 : 1.1;
      const b = part(new THREE.SphereGeometry(0.118, 8, 3, Math.PI / 2 - 1.85, 3.7, Math.PI * 0.6, Math.PI * 0.3), hairC, head, { outline: cfg.beard !== "stoppeln" });
      b.scale.set(0.95, long, 1.05);
      if (cfg.beard === "stoppeln") { b.material = b.material.clone(); b.material.transparent = true; b.material.opacity = 0.5; }
      if (cfg.beard !== "stoppeln") { const m = part(new THREE.BoxGeometry(0.08, 0.02, 0.025), hairC, head, { outline: false }); m.position.set(0, -0.035, 0.103); }
    }
    // arms: torn short sleeves, bare forearms and hands
    for (const side of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(side * (shW + mus * 0.03 + fat * 0.02), 0.43, 0); chest.add(sh);
      sh.rotation.z = side * 0.09;
      const ur = (F ? 0.042 : 0.048) * (1 + mus * 0.55 + fat * 0.2);
      rag(ur * 1.35, ur * 1.3, 0.13, RAGS.tunic, sh, 7, 0.04, side + 11);
      limb(ur, ur * 0.8, 0.29, skin, sh);
      const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
      limb(ur * 0.82, 0.032, 0.25, skin, el);
      const hand = new THREE.Group(); hand.position.y = -0.25; el.add(hand);
      part(new THREE.BoxGeometry(0.065, 0.085, 0.032), skin, hand).position.y = -0.042;
      J[side < 0 ? "shR" : "shL"] = sh; J[side < 0 ? "elR" : "elL"] = el;
    }
    root.scale.setScalar(cfg.height / 180);
    let t = 0;
    function update(dt, walk = 0) {
      t += dt * (1 + walk * 5);
      const sw = Math.sin(t * 1.6) * 0.55 * walk;
      J.hipR.rotation.x = sw; J.hipL.rotation.x = -sw;
      J.kneeR.rotation.x = Math.max(0, -Math.sin(t * 1.6 + 0.6)) * 0.8 * walk; J.kneeL.rotation.x = Math.max(0, Math.sin(t * 1.6 + 0.6)) * 0.8 * walk;
      J.shR.rotation.x = -sw * 0.8; J.shL.rotation.x = sw * 0.8;
      J.elR.rotation.x = -0.25 * walk; J.elL.rotation.x = -0.25 * walk;
      J.body.position.y = Math.abs(Math.sin(t * 1.6)) * 0.03 * walk;
      const br = Math.sin(t * 1.2) * 0.012 * (1 - walk);
      J.chest.scale.set(1 + br, 1 + br * 0.5, 1 + br);
      J.head.rotation.y = Math.sin(t * 0.37) * 0.15 * (1 - walk);
    }
    return { root, update };
  }
  window.CrusaderAvatar = { SKIN, HAIRC, HAIR, BEARD, defaults, build };
})();
