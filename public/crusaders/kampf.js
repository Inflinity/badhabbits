/* Crusaders: the game state (gold, experience, level, party, quests, camp) and the battles.
   A battle is side-on, in pixels, with ATB bars: every fighter's bar fills, and when yours is
   full you choose. Win, and the find is yours. Gold can buy a victory, except against bosses. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------------- State ---------------- */
  const KEY = "crusaders-spiel";
  const ME_KEY = "crusaders-ich";
  const S0 = { gold: 50, exp: 0, level: 1, figs: 3, party: [], quests: {}, camp: 0, aura: true };
  function get() { let s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {} return { ...S0, ...s, quests: { ...(s.quests || {}) } }; }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  const me = () => { try { return JSON.parse(localStorage.getItem(ME_KEY) || "null"); } catch (e) { return null; } };
  const expFor = (lvl) => 100 * lvl;
  function reward(exp, gold) {
    const s = get(); s.exp += exp; s.gold += gold; let up = 0;
    while (s.exp >= expFor(s.level)) { s.exp -= expFor(s.level); s.level++; s.figs = Math.max(s.figs, 3); up++; }
    save(s); return { ...s, up };
  }
  const RANKS = ["Schiffbrüchig", "Strandläufer", "Pilger", "Knappe", "Waffenknecht", "Ritter"];
  const rank = (lvl) => RANKS[Math.min(RANKS.length - 1, Math.floor((lvl - 1) / 3))];

  /* ---------------- Pixel sprites ----------------
     Little pictures written as letters, one letter per pixel; colours come from a palette. */
  const SPR = {
    held: [
      "......kkkk......", ".....khhhhk.....", "....khhhhhhk....", "....khsssshk....", "....kssksskk....", "....ksssssk.....",
      ".....kssssk.....", "......kssk......", "....kkttttkk....", "...kttttttttk...", "..ksktttttttsk..", "..kskttTtttksk..",
      "..ks.ktrrrtk.sk.", "..kk.kTtttTk.kk.", ".....kttTttk.....", ".....kTtttTk.....", ".....kppkppk.....", ".....kppkppk.....",
      ".....kpk.kpk.....", ".....ksk.ksk.....", ".....ksk.ksk.....", "....kffk.kffk....", "....kkkk.kkkk....", "................"],
    hund: [
      "..kk................", ".kbbk...............", "kbbbbk..............", "kbkbbbkkkkkkkkkk....", "kbbbbbbbbbbbbbbbk..k",
      ".kkcccbbbbbbbbbbbkbk", "...kcbbbbbbbbbbbbbk.", "...kbbbbbbbbbbbbbk..", "...kbbkkbbkkkbbkbk..", "...kbk.kbk...kbk.kbk",
      "...kbk.kbk...kbk.kbk", "...kkk.kkk...kkk.kkk"],
    bandit: [
      "......kkkk......", ".....kWWWWk.....", "....kWWWWWWk....", "....kWrWWWWk....", "....kssssssk....", "....kskssksk....",
      "....khsssshk....", ".....khhhhk.....", "....kkmmmmkk....", "...kmmmmmmmmk...", "..ksmmmmmmmmsk..", "..ksmmmmmmmmsk..",
      "..ks.krrrrrk.sk.", "..kk.kmmmmmk.kk.", ".....kPPPPPk.....", ".....kPPkPPk.....", ".....kPPkPPk.....", ".....kPPkPPk.....",
      ".....kPk.kPk.....", ".....kBk.kBk.....", ".....kBk.kBk.....", "....kBBk.kBBk....", "....kkkk.kkkk....", "................"],
    schatten: [
      "......kkkk......", ".....kvvvvk.....", "....kvvvvvvk....", "....kvkkkkvk....", "....kvkyykvk....", "....kvkkkkvk....",
      "....kvvvvvvk....", "...kvvvvvvvvk...", "..kvvvvvvvvvvk..", "..kvvvvvvvvvvvk.", ".kvvvvvvvvvvvvk.", ".kvvvvvvvvvvvvvk",
      ".kgvvvvvvvvvvvgk", ".kgkvvvvvvvvvkgk", "..k.kvvvvvvvk.k.", ".....kvvvvvvk....", ".....kvvvvvvk....", "....kvvvvvvvvk...",
      "....kvvvvvvvvk...", "...kvvvvvvvvvvk..", "...kvvvvvvvvvvk..", "..kvvvvvvvvvvvvk.", "..kkkkkkkkkkkkkk.", "................"],
    bulle: [
      "..kk........kk..", "..kHk......kHk..", "...kHkkkkkkHk...", "...kuuuuuuuuk...", "...kuyuuuuyuk...", "...kuuuuuuuuk...",
      "....kuukkuuk....", "...kkuuuuuukk...", "..kuuuuuuuuuuk..", ".kuuuuuuuuuuuuk.", ".kuuukuuuukuuuk.", "kuuk.kuuuuk.kuuk",
      "kuuk.kLLLLk.kuuk", "kkk..kLLLLk..kkk", ".....kLLLLk.....", ".....kuukuuk.....", "....kuuk.kuuk....", "....kuuk.kuuk....",
      "....kuuk.kuuk....", "....kuuk.kuuk....", "...kuuuk.kuuuk...", "...kkkkk.kkkkk...", "................", "................"],
  };
  const PAL = { k: "#1a120c", b: "#8a5a32", c: "#b8322a", W: "#f2ede2", r: "#b8322a", m: "#8e939a", P: "#c9b48a", B: "#5a3a22",
    v: "#4b2a6b", y: "#e8d84a", g: "#c9b84a", H: "#d8c9a8", u: "#6a4a6e", L: "#7a5a3a", t: "#b9a582", T: "#a08a62", p: "#7d6a50" };
  function sprite(ctx, name, x, y, pal, flip = false, alpha = 1) {
    const rows = SPR[name], P = { ...PAL, ...pal };
    ctx.globalAlpha = alpha;
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === "." || !P[ch]) continue; ctx.fillStyle = P[ch]; ctx.fillRect(flip ? x + row.length - 1 - i : x + i, y + j, 1, 1); } });
    ctx.globalAlpha = 1;
  }

  /* ---------------- Backdrops ----------------
     Where a painting of the surroundings exists, it stands behind the fight at full size, and a
     strip of pixel sand, scrub and stones in the middle ground hides where painting meets pixels. */
  const BASE = (document.currentScript && document.currentScript.src || "").replace(/kampf\.js.*$/, "");
  const BACKDROPS = [
    { id: "kallithea", img: BASE + "bilder/kampf-kallithea.jpg", lat: 36.3795, lon: 28.2415, r: 4, pos: "30% 0%", ground: 0.55,
      sand: ["#d4a96a", "#c69a5a", "#b88a4e", "#ddb87c"], bush: ["#3e5a26", "#56762f", "#6f8c3a", "#2c4219"], stone: ["#cbbfa8", "#a89c86"] },
  ];
  function backdrop(lat, lon) {
    let best = null;
    for (const b of BACKDROPS) { const d = Math.hypot((lat - b.lat) * 111.3, (lon - b.lon) * 111.3 * Math.cos((lat * Math.PI) / 180)); if (d <= b.r && (!best || d < best.d)) best = { b, d }; }
    return best && best.b;
  }
  function midground(W, H, seed, bg) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    let h = Math.floor(seed * 1e6) || 1; const rnd = () => ((h = (h * 16807) % 2147483647) / 2147483647);
    const P = (col, px, py, w = 1, hh = 1) => { x.fillStyle = col; x.fillRect(px | 0, py | 0, w, hh); };
    const gY = H * bg.ground, edge = [];
    for (let i = 0; i < W; i++) edge[i] = Math.round(gY + Math.sin(i * 0.21 + seed) * 1.5 + Math.sin(i * 0.067 + seed * 2) * 3);
    // sand, a little darker towards you, with ripples
    for (let i = 0; i < W; i++) for (let j = edge[i]; j < H; j++) {
      const t = (j - gY) / (H - gY), n = rnd();
      P(n < 0.08 ? bg.sand[3] : n < 0.25 + t * 0.3 ? bg.sand[1] : t > 0.6 && n > 0.85 ? bg.sand[2] : bg.sand[0], i, j);
    }
    // a ragged, dithered seam, then scrub and stones sitting on it so the eye never finds the join
    for (let i = 0; i < W; i++) for (let k = 1; k <= 3; k++) if ((i + k) % 2 === 0 && rnd() < 0.7 - k * 0.18) P(bg.sand[0], i, edge[i] - k);
    for (let n = 0; n < Math.round(W / 5); n++) {
      const bx = Math.floor(rnd() * W), by = edge[bx] + 1, r = 3 + Math.floor(rnd() * 5);
      for (let dy = -r; dy <= 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
        if (dx * dx + dy * dy * 1.3 > r * r + 1 || rnd() < 0.14) continue;
        P(dy > 0 ? bg.bush[3] : dy < -r / 2 ? (rnd() < 0.5 ? bg.bush[2] : bg.bush[1]) : (rnd() < 0.7 ? bg.bush[0] : bg.bush[1]), bx + dx, by + dy);
      }
    }
    for (let n = 0; n < 7; n++) { const sx = Math.floor(rnd() * W), sy = edge[sx] + 3 + Math.floor(rnd() * (H - gY - 6)), w = 2 + Math.floor(rnd() * 3);
      P(bg.stone[1], sx, sy + 1, w, 1); P(bg.stone[0], sx, sy, w, 1); }
    return c;
  }

  /* ---------------- The battle screen ---------------- */
  const css = `
  #kampf { position: fixed; inset: 0; z-index: 60; background: #120d0a; display: flex; flex-direction: column; font-family: "Pixelify Sans", "VT323", monospace; color: #f3ead6; }
  #kampf canvas { width: 100%; flex: 1; min-height: 0; image-rendering: pixelated; display: block; }
  #kmsg { position: absolute; left: 10px; right: 10px; top: max(10px, env(safe-area-inset-top)); background: rgba(10,8,6,0.78); border-radius: 6px; padding: 8px 12px; text-align: right; font-size: 20px; }
  .kpanels { display: grid; grid-template-columns: 1.15fr 1fr; gap: 6px; padding: 6px; padding-bottom: max(8px, env(safe-area-inset-bottom)); background: #1b1f2a; }
  .kbox { background: linear-gradient(#2a3040, #1c2130); border: 3px solid #8d929c; box-shadow: inset 0 0 0 2px #3c4252, 0 0 0 2px #2a2e38; border-radius: 6px; padding: 8px 10px; min-height: 150px; }
  .kfig { padding: 3px 4px; border-radius: 4px; }
  .kfig.act { background: rgba(255,255,255,0.08); }
  .kfig b { font-size: 17px; display: block; }
  .kfig .row { display: flex; align-items: center; gap: 6px; font-size: 15px; }
  .kfig .row span:first-child { color: #d9c76a; width: 30px; }
  .kbar { flex: 1; height: 9px; border: 2px solid #8d929c; border-radius: 6px; background: #12151d; overflow: hidden; }
  .kbar i { display: block; height: 100%; }
  .kmenu button { display: block; width: 100%; text-align: left; background: none; border: 0; color: #f3ead6; font: 600 19px "Pixelify Sans", monospace; padding: 4px 6px; cursor: pointer; }
  .kmenu button:disabled { color: #6b7080; }
  .kmenu button.sel::before { content: "☛ "; }
  .kmenu small { color: #d9c76a; font-size: 13px; }
  #kfloat { position: absolute; inset: 0; pointer-events: none; }
  .kf { position: absolute; font: 700 22px "Pixelify Sans", monospace; text-shadow: 0 2px 0 #000, 0 0 6px #000; animation: kf 1.1s ease-out forwards; }
  @keyframes kf { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-40px); opacity: 0; } }
  #ksieg { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: rgba(10,6,4,0.55); padding: 20px; }
  #ksieg h1 { margin: 0; font: 700 64px "Pixelify Sans", monospace; background: linear-gradient(#fff2a8, #ffb030 45%, #d83a10); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 3px 0 #5a1a06) drop-shadow(0 0 12px #ff7a20); animation: pop 0.6s cubic-bezier(.2,1.6,.4,1); }
  @keyframes pop { from { transform: scale(0.3); } to { transform: scale(1); } }
  #ksieg .loot { background: linear-gradient(#2a3040, #1c2130); border: 3px solid #8d929c; border-radius: 8px; padding: 14px; text-align: center; max-width: 320px; }
  #ksieg .loot img { width: 230px; transform: rotate(-4deg); border: 6px solid #fbf3e2; box-shadow: 0 6px 16px rgba(0,0,0,0.5); }
  #ksieg .loot b { display: block; color: #ffc94a; font-size: 24px; margin-top: 10px; }
  #ksieg .loot span { display: block; font-size: 17px; }
  #ksieg .gain { font-size: 22px; color: #8fe3ff; } #ksieg .gain i { color: #ffd24a; font-style: normal; }
  #ksieg button { font: 700 24px "Pixelify Sans", monospace; padding: 10px 34px; border-radius: 8px; border: 3px solid #e6b44a; background: linear-gradient(#c9963c, #8a5a1c); color: #fff6dc; cursor: pointer; }`;
  let styled = false;
  function addStyle() {
    if (styled) return; styled = true;
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;600;700&display=swap"; document.head.append(l);
    const s = document.createElement("style"); s.textContent = css; document.head.append(s);
  }
  // the scene behind the fight: dusk, mountains, a castle, sand and scrub, all in big pixels
  function scenery(ctx, W, H, seed) {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.45); g.addColorStop(0, "#5a3a4a"); g.addColorStop(0.6, "#c9805a"); g.addColorStop(1, "#e2b07a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.45);
    ctx.fillStyle = "#9a6a52"; for (let x = 0; x < W; x++) { const h = 18 + Math.sin(x * 0.05 + seed) * 8 + Math.sin(x * 0.13) * 4; ctx.fillRect(x, H * 0.45 - h, 1, h); }
    // castle
    ctx.fillStyle = "#a07a58"; const cx = W - 66, cy = H * 0.45;
    ctx.fillRect(cx, cy - 26, 50, 26); for (let i = 0; i < 6; i++) ctx.fillRect(cx + i * 9, cy - 30, 5, 4);
    ctx.fillRect(cx - 6, cy - 36, 12, 36); ctx.fillRect(cx + 46, cy - 40, 12, 40);
    ctx.fillStyle = "#5a3a2a"; ctx.fillRect(cx + 21, cy - 12, 8, 12); ctx.fillStyle = "#b8322a"; ctx.fillRect(cx + 52, cy - 50, 1, 10); ctx.fillRect(cx + 53, cy - 50, 5, 3);
    // tents on the left
    ctx.fillStyle = "#c9b08a"; for (const tx of [8, 30]) { ctx.beginPath(); ctx.moveTo(tx, cy); ctx.lineTo(tx + 12, cy - 16); ctx.lineTo(tx + 24, cy); ctx.fill(); }
    const s = ctx.createLinearGradient(0, H * 0.45, 0, H); s.addColorStop(0, "#c9965c"); s.addColorStop(1, "#a8743e"); ctx.fillStyle = s; ctx.fillRect(0, H * 0.45, W, H * 0.55);
    for (let i = 0; i < 160; i++) { const x = (Math.sin(i * 12.9 + seed) * 0.5 + 0.5) * W, y = H * 0.47 + (Math.sin(i * 78.2 + seed) * 0.5 + 0.5) * H * 0.53; ctx.fillStyle = i % 3 ? "#b88450" : "#d8a868"; ctx.fillRect(x | 0, y | 0, 2, 1); }
    ctx.fillStyle = "#6a4a2a"; for (const [x, y] of [[W * 0.15, H * 0.62], [W * 0.5, H * 0.85], [W * 0.85, H * 0.55]]) for (let i = 0; i < 6; i++) ctx.fillRect((x + i * 2 - 6) | 0, (y - (i % 3) * 3) | 0, 1, 5 + (i % 3) * 2);
  }

  const STATS = {
    held: (L) => ({ hp: 60 + 15 * L, mp: 20 + 4 * L, atk: 10 + 3 * L, def: 4 + L, spd: 1 }),
    porthos: (L) => ({ hp: 50 + 10 * L, mp: 0, atk: 9 + 2 * L, def: 3 + L, spd: 1.35 }),
  };
  const FOES = {
    bandit: (t) => ({ name: "Wegelagerer", spr: "bandit", hp: 28 + 16 * t, atk: 6 + 3 * t, def: 2 + t, spd: 0.9 + Math.random() * 0.2 }),
    soeldner: (t) => ({ name: "Söldner", spr: "bandit", pal: { W: "#2a2420", r: "#3a6a9a" }, hp: 34 + 18 * t, atk: 7 + 3 * t, def: 3 + t, spd: 0.95 }),
    schatten: (t) => ({ name: "Schatten", spr: "schatten", hp: 24 + 14 * t, atk: 8 + 3 * t, def: 1 + t, spd: 1.15 }),
    bulle: (t) => ({ name: "Bestie", spr: "bulle", hp: 50 + 24 * t, atk: 9 + 4 * t, def: 3 + t, spd: 0.75 }),
    haendler: (t) => ({ name: "Sklavenhändler Kerim", spr: "bandit", pal: { W: "#7a1a14", r: "#e2b04a", m: "#5a3a2a" }, hp: 70 + 30 * t, atk: 7 + 4 * t, def: 4 + t, spd: 1.0, boss: true }),
  };

  /* Battle.start({ title, foes: ["bandit", …], tier, boss, loot: { img, title, text }, onWin, onLose }) */
  function start(opt) {
    addStyle();
    const st = get(), who = me(), L = st.level;
    const look = (who && who.look) || {};
    const SK = (window.CrusaderAvatar && window.CrusaderAvatar.SKIN) || ["#e0a982"], HC = (window.CrusaderAvatar && window.CrusaderAvatar.HAIRC) || ["#3b2416"];
    const heroes = [{ id: "held", name: who ? who.name : "Namenlos", spr: "held", pal: { s: SK[look.skin ?? 2], f: SK[look.skin ?? 2], h: HC[look.hairC ?? 1] }, ...STATS.held(L) }];
    if (st.party.includes("porthos")) heroes.push({ id: "porthos", name: "Porthos", spr: "hund", ai: true, ...STATS.porthos(L) });
    heroes.forEach((h) => { h.max = h.hp; h.maxmp = h.mp; h.atb = Math.random() * 0.5; h.side = 0; });
    const foes = opt.foes.map((k, i) => { const f = FOES[k](opt.tier || 1); return { ...f, id: k + i, max: f.hp, atb: Math.random() * 0.3, side: 1 }; });
    const all = () => [...heroes, ...foes];
    const el = document.createElement("div"); el.id = "kampf";
    el.innerHTML = `<canvas></canvas><div id="kmsg">${opt.title || "Ein Kampf!"}</div><div id="kfloat"></div>
      <div class="kpanels"><div class="kbox" id="kparty"></div><div class="kbox kmenu" id="kmenu"></div></div>`;
    document.body.append(el);
    const cv = el.querySelector("canvas"), ctx = cv.getContext("2d");
    // big pixels, as many rows as the screen is tall: 136 across, never stretched
    const W = 136, H = clamp(Math.round((W * cv.clientHeight) / Math.max(1, cv.clientWidth)), 96, 280); cv.width = W; cv.height = H;
    const seed = Math.random() * 10;
    const bg = opt.bg || (opt.at && backdrop(opt.at.lat, opt.at.lon)), mid = bg && midground(W, H, seed, bg);
    if (bg) cv.style.background = `#2a1a0c url("${bg.img}") ${bg.pos} / cover no-repeat`;
    // places on the field: heroes on the left, foes on the right, spread over the sand
    const ground = H * (bg ? bg.ground + 0.04 : 0.47), room = H - ground - 28;
    heroes.forEach((h, i) => { h.x = 16 + (i % 2) * 6; h.y = Math.round(ground + 6 + (room / heroes.length) * i); });
    foes.forEach((f, i) => { f.x = W - 44 + (i % 2) * 18; f.y = Math.round(ground + (room / foes.length) * i); });
    let turn = null, picking = null, over = false, last = performance.now(), defend = {}, shake = 0, items = st.figs;
    const msg = (t) => { el.querySelector("#kmsg").textContent = t; };
    const float = (f, text, color) => {
      const r = cv.getBoundingClientRect(), d = document.createElement("div"); d.className = "kf"; d.textContent = text; d.style.color = color;
      d.style.left = r.left + ((f.x + 6) / W) * r.width + "px"; d.style.top = r.top + ((f.y - 4) / H) * r.height + "px";
      el.querySelector("#kfloat").append(d); setTimeout(() => d.remove(), 1100);
    };
    function hit(a, b, mult = 1) {
      if (Math.random() < 0.1) { float(b, "MISS", "#ff5a4a"); return; }
      let dmg = Math.max(1, Math.round((a.atk * mult - b.def) * (0.85 + Math.random() * 0.3)));
      if (defend[b.id]) dmg = Math.ceil(dmg / 2);
      b.hp = Math.max(0, b.hp - dmg); float(b, String(dmg), "#fff"); shake = 0.25;
    }
    const alive = (l) => l.filter((x) => x.hp > 0);
    function panels() {
      el.querySelector("#kparty").innerHTML = heroes.map((h) => `<div class="kfig ${turn === h ? "act" : ""}"><b>${h.name}</b>
        <div class="row"><span>HP</span>${h.hp}/${h.max}</div>
        <div class="row"><span>ATB</span><div class="kbar"><i style="width:${Math.round(h.atb * 100)}%;background:#e6a43a"></i></div></div>
        ${h.maxmp ? `<div class="row"><span>MP</span><div class="kbar"><i style="width:${Math.round((h.mp / h.maxmp) * 100)}%;background:#3aa0e6"></i></div></div>` : ""}</div>`).join("");
    }
    function menu() {
      const m = el.querySelector("#kmenu");
      if (!turn) { m.innerHTML = `<div style="opacity:0.6;font-size:16px;padding:6px">Warte …</div><button type="button" id="kauto" ${opt.boss ? "disabled" : ""}>🪙 Sieg kaufen <small>${opt.boss ? "nicht im Bosskampf" : cost() + " Gold, du hast " + get().gold}</small></button>`; bindAuto(); return; }
      if (picking) {
        m.innerHTML = `<div style="font-size:15px;color:#d9c76a;padding:2px 6px">Ziel wählen</div>` + alive(picking.list).map((t, i) => `<button type="button" data-t="${i}">${t.name} <small>${t.hp}/${t.max}</small></button>`).join("") + `<button type="button" data-back>Zurück</button>`;
        m.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => { const tgt = alive(picking.list)[+b.dataset.t], f = picking.fn; picking = null; f(tgt); });
        m.querySelector("[data-back]").onclick = () => { picking = null; menu(); };
        return;
      }
      const h = turn;
      m.innerHTML = `<button type="button" data-a="atk">🗡 ANGRIFF</button>
        <button type="button" data-a="spez" ${h.mp < 8 ? "disabled" : ""}>⚔ SPEZIAL <small>Treibholz-Wirbel · 8 MP</small></button>
        <button type="button" data-a="gebet" ${h.mp < 6 ? "disabled" : ""}>✚ GEBET <small>heilt · 6 MP</small></button>
        <button type="button" data-a="item" ${items <= 0 ? "disabled" : ""}>GEGENSTAND <small>Feigen ×${items}</small></button>
        <button type="button" data-a="def">VERTEIDIGEN</button>
        <button type="button" data-a="flucht" ${opt.boss ? "disabled" : ""}>FLUCHT</button>
        <button type="button" id="kauto" ${opt.boss ? "disabled" : ""}>🪙 SIEG KAUFEN <small>${opt.boss ? "nicht im Bosskampf" : cost() + " Gold"}</small></button>`;
      const act = (a) => {
        if (a === "atk") { picking = { list: foes, fn: (t) => { hit(h, t); endTurn(h, `${h.name} greift an!`); } }; return menu(); }
        if (a === "spez") { h.mp -= 8; for (const f of alive(foes)) hit(h, f, 1.25); return endTurn(h, `${h.name}: Treibholz-Wirbel!`); }
        if (a === "gebet") { h.mp -= 6; picking = { list: heroes, fn: (t) => { const v = Math.round(t.max * 0.35); t.hp = Math.min(t.max, t.hp + v); float(t, "HEAL " + v, "#5aff7a"); endTurn(h, `${h.name} betet.`); } }; return menu(); }
        if (a === "item") { items--; const s = get(); s.figs = items; save(s); h.hp = Math.min(h.max, h.hp + 40); float(h, "+40", "#5aff7a"); return endTurn(h, `${h.name} isst Feigen.`); }
        if (a === "def") { defend[h.id] = true; return endTurn(h, `${h.name} verteidigt.`); }
        if (a === "flucht") { close(); if (opt.onLose) opt.onLose("flucht"); }
      };
      m.querySelectorAll("[data-a]").forEach((b) => b.onclick = () => act(b.dataset.a));
      bindAuto();
    }
    const cost = () => 10 * (opt.tier || 1) * foes.length;
    function bindAuto() {
      const b = el.querySelector("#kauto"); if (!b) return;
      b.onclick = () => {
        const s = get(); if (opt.boss) return;
        if (s.gold < cost()) { msg(`Zu wenig Gold: ${cost()} nötig.`); return; }
        s.gold -= cost(); save(s); foes.forEach((f) => { f.hp = 0; }); msg("Die Söldner deiner Wahl erledigen das."); win(true);
      };
    }
    function endTurn(h, text) { msg(text); h.atb = 0; turn = null; panels(); menu(); check(); }
    function check() {
      if (!alive(foes).length) return win(false);
      if (!alive(heroes.filter((h) => !h.ai)).length) return lose();
    }
    function win(bought) {
      if (over) return; over = true;
      const tier = opt.tier || 1, exp = bought ? Math.round(20 * tier * foes.length) : 40 * tier * foes.length, gold = bought ? 0 : 15 * tier * foes.length + Math.round(Math.random() * 10);
      const s = reward(exp, gold);
      setTimeout(() => {
        const d = document.createElement("div"); d.id = "ksieg";
        d.innerHTML = `<h1>SIEG!</h1><div class="loot">${opt.loot && opt.loot.img ? `<img src="${opt.loot.img}" alt="">` : ""}<b>${opt.loot ? "BEUTE ERHALTEN!" : "GESCHAFFT!"}</b><span>${opt.loot ? opt.loot.text : ""}</span></div>
          <div class="gain">+ ${exp} EXP · <i>+ ${gold} Gold</i>${s.up ? `<br>Stufe ${s.level}: ${rank(s.level)}!` : ""}</div><button type="button">WEITER</button>`;
        el.append(d);
        d.querySelector("button").onclick = () => { close(); if (opt.onWin) opt.onWin(s); };
      }, 600);
    }
    function lose() {
      if (over) return; over = true;
      const d = document.createElement("div"); d.id = "ksieg";
      d.innerHTML = `<h1 style="filter:none;background:linear-gradient(#ccc,#666);-webkit-background-clip:text;background-clip:text">NIEDERLAGE</h1><div class="loot"><span>Du kommst im Sand wieder zu dir. Ruh dich aus und versuch es noch einmal.</span></div><button type="button">ZURÜCK</button>`;
      el.append(d); d.querySelector("button").onclick = () => { close(); if (opt.onLose) opt.onLose("niederlage"); };
    }
    function close() { el.remove(); cancelAnimationFrame(raf); }
    function ai(f) {
      const targets = alive(f.side ? heroes : foes); if (!targets.length) return;
      const t = targets[Math.floor(Math.random() * targets.length)];
      if (f.side) msg(`${f.name} greift an!`); else msg(`${f.name} beißt zu!`);
      f.lunge = 0.3; hit(f, t); defend[t.id] = defend[t.id] && t.side === 0 ? defend[t.id] : false; f.atb = 0; panels(); check();
    }
    let raf = 0;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!over && !turn) {
        for (const f of all()) {
          if (f.hp <= 0) continue;
          f.atb = Math.min(1, f.atb + dt * 0.5 * f.spd);
          if (f.atb >= 1) {
            if (f.side === 0 && !f.ai) { turn = f; defend[f.id] = false; panels(); menu(); msg(`${f.name} ist bereit.`); break; }
            ai(f); if (over) break;
          }
        }
        if (now - (frame.p || 0) > 120) { frame.p = now; panels(); }
      }
      // draw
      ctx.save(); if (shake > 0) { shake -= dt; ctx.translate(Math.round((Math.random() - 0.5) * 3), 0); }
      if (mid) { ctx.clearRect(0, 0, W, H); ctx.drawImage(mid, 0, 0); } else scenery(ctx, W, H, seed);
      for (const f of all()) {
        if (f.hp <= 0 && f.side) continue;
        if (f.lunge > 0) f.lunge -= dt;
        const dx = f.lunge > 0 ? (f.side ? -6 : 6) : 0, bob = Math.round(Math.sin(now / 300 + f.x) * 0.6);
        ctx.fillStyle = "rgba(60,30,10,0.35)"; ctx.fillRect(f.x + dx + 1, f.y + (f.spr === "hund" ? 12 : 23), f.spr === "hund" ? 20 : 14, 2);
        sprite(ctx, f.spr, f.x + dx, f.y + bob, f.pal || {}, f.side === 1, f.hp <= 0 ? 0.35 : 1);
        if (f.side === 1 && f.hp > 0) { ctx.fillStyle = "#1a120c"; ctx.fillRect(f.x, f.y - 4, 16, 3); ctx.fillStyle = f.boss ? "#ffb030" : "#d83a2a"; ctx.fillRect(f.x + 1, f.y - 3, Math.ceil((14 * f.hp) / f.max), 1); }
        if (f.side === 0 && f.spr === "held") { ctx.fillStyle = "#7a5230"; ctx.fillRect(f.x + 15, f.y + 6, 2, 12); ctx.fillStyle = "#5a3a20"; ctx.fillRect(f.x + 14, f.y + 4, 4, 4); }
        if (f.side === 1 && f.spr === "bandit") { ctx.fillStyle = "#d8dde2"; ctx.fillRect(f.x - 3, f.y + 8, 2, 9); ctx.fillRect(f.x - 4, f.y + 6, 2, 3); }
        if (turn === f) { ctx.fillStyle = "#ffd24a"; ctx.fillRect(f.x + 6, f.y - 7 + Math.round(Math.sin(now / 150)), 3, 3); }
      }
      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    panels(); menu(); raf = requestAnimationFrame(frame);
    return { close };
  }

  window.Spiel = { get, save, reward, rank, expFor, me, SPR, PAL, sprite };
  window.Kampf = { start, backdrop, BACKDROPS };
})();
