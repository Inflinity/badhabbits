/* Postcards, shared: the pop-up when you reach a place, the collection and the editor.
   Include it on a page with Alfa Slab One, Caveat and Figtree loaded; call Postcards.check(fix)
   with every GPS fix { lat, lon, acc }. A button with id "pcBtn" opens the collection. */
(function () {
"use strict";
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const distKm = (a, b) => { const R = 6371, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const style = document.createElement("style");
style.textContent = `:root { --pc-ink: #3b2412; --pc-red: #c8321e; --pc-paper: #fbf3e2; }
.pcb { font-size: 20px; width: auto; min-width: 44px; padding: 0 10px; border-radius: 22px; }
#pcPop {
  position: fixed; left: 50%; top: 22%; width: min(330px, 86vw); background: #fffaf0; border-radius: 6px; padding: 8px 8px 10px;
  box-shadow: 0 14px 40px rgba(0,0,0,0.45); z-index: 30; cursor: pointer; transform: translateX(-50%) rotate(-4deg);
}
#pcPop img { width: 100%; display: block; border-radius: 3px; }
#pcPop div { display: flex; flex-direction: column; padding: 8px 4px 0; }
#pcPop b { font: 400 20px "Alfa Slab One", Georgia, serif; }
#pcPop small { color: #7a5a3a; }
#pcPop #pcLater { position: absolute; top: -12px; right: -12px; width: 34px; height: 34px; border-radius: 50%; border: 0; background: var(--pc-ink); color: #fff; font-size: 20px; }
#pcPop.in { animation: pop 0.9s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes pop { 0% { transform: translate(-50%, -120vh) rotate(30deg) scale(0.6); } 70% { transform: translate(-50%, 8px) rotate(-8deg) scale(1.04); } 100% { transform: translateX(-50%) rotate(-4deg); } }
.sheet { position: fixed; inset: 0; z-index: 40; background: var(--pc-paper); overflow-y: auto; padding: 12px 16px; padding-top: max(12px, env(safe-area-inset-top)); padding-bottom: max(16px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 10px; }
.sheetHead { display: flex; align-items: center; }
.sheetHead h2 { margin: 0; font: 400 22px "Alfa Slab One", Georgia, serif; flex: 1; }
.sheetHead button, #pcAddText, #pcShare { border: 0; border-radius: 12px; padding: 10px 14px; font: 700 15px "Figtree", sans-serif; background: var(--pc-ink); color: #fff; cursor: pointer; }
#pcShare { background: var(--pc-red); padding: 14px; font-size: 17px; }
.note { margin: 0; color: #7a5a3a; font-size: 13px; }
#pcList { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pcThumb { border: 0; padding: 6px; background: #fff; border-radius: 6px; box-shadow: 0 3px 10px rgba(0,0,0,0.15); display: flex; flex-direction: column; gap: 4px; font: 700 14px "Figtree", sans-serif; color: var(--pc-ink); cursor: pointer; text-align: left; }
.pcThumb img { width: 100%; border-radius: 3px; }
.pcThumb.locked { background: #efe6d4; box-shadow: none; aspect-ratio: 3/2.35; justify-content: center; align-items: center; color: #a08a6a; cursor: default; }
.pcThumb small { font-weight: 400; }
.pcKind { grid-column: 1 / -1; margin: 8px 0 0; font: 400 18px "Alfa Slab One", Georgia, serif; }
.pcKind small { font: 400 13px "Figtree", sans-serif; color: #7a5a3a; }
.pcItem { grid-column: 1 / -1; margin: 2px 0 -4px; font: 700 14px "Figtree", sans-serif; }
.pcItem small { font-weight: 400; color: #7a5a3a; }
#pcCard {
  position: relative; width: 100%; aspect-ratio: 3/2; background-size: cover; border: 9px solid #fffaf0; border-radius: 4px;
  box-shadow: 0 8px 22px rgba(0,0,0,0.3); overflow: hidden; touch-action: none; container-type: inline-size;
}
#pcTitle { position: absolute; left: 4%; top: 5%; font: 400 6cqw "Alfa Slab One", Georgia, serif; color: var(--pc-ink); paint-order: stroke; -webkit-text-stroke: 0.8cqw #fffaf0; pointer-events: none; }
#pcCard .it { position: absolute; cursor: grab; user-select: none; -webkit-user-select: none; touch-action: none; white-space: nowrap; line-height: 1; }
#pcCard .it.sel { outline: 2px dashed var(--pc-red); outline-offset: 4px; border-radius: 4px; }
#pcCard .e { font-size: 10cqw; }
#pcCard .t { font: 600 7.6cqw/1.05 "Caveat", cursive; text-align: center; display: block; paint-order: stroke; -webkit-text-stroke: 1.2cqw rgba(255,250,240,0.85); }
#pcCard .st { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 21cqw; height: 21cqw; border-radius: 50%; border: 0.8cqw double #a3341f; color: #a3341f; font: 700 3.3cqw "Figtree", sans-serif; }
#pcCard .st i { font: 400 2.8cqw "Figtree", sans-serif; }
#pcCard .bn { display: inline-block; padding: 1.4cqw 4cqw; background: #f3e3bd; border: 0.4cqw solid #a0672c; font: 400 5.6cqw "Alfa Slab One", Georgia, serif; color: var(--pc-ink); clip-path: polygon(0 0, 100% 0, 96% 50%, 100% 100%, 0 100%, 4% 50%); }
#pcCard .hr { display: inline-block; padding: 1.6cqw 4cqw; background: #c8321e; color: #fff; border-radius: 6cqw; font: 700 6.5cqw "Figtree", sans-serif; }
#pcTools { display: flex; gap: 8px; justify-content: center; }
#pcTools button { width: 48px; height: 40px; border-radius: 10px; border: 1px solid #e2d6c2; background: #fff; font-size: 20px; cursor: pointer; }
.pcRow { display: flex; gap: 8px; }
.pcRow textarea { flex: 1; font: 600 20px "Caveat", cursive; border: 1px solid #e2d6c2; border-radius: 10px; padding: 6px 10px; background: #fff; resize: none; }
.pcInk { display: flex; gap: 8px; }
.pcInk button { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px #d8cbb3; cursor: pointer; }
.pcInk button[aria-pressed=true] { box-shadow: 0 0 0 3px var(--pc-red); }
.pcScroll { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.pcScroll button { flex: 0 0 auto; font-size: 28px; background: #fff; border: 1px solid #e2d6c2; border-radius: 10px; padding: 4px 8px; cursor: pointer; }
.pcScroll.stick button { font: 700 14px "Figtree", sans-serif; padding: 10px 12px; color: var(--pc-ink); }
`;
document.head.append(style);
const wrap = document.createElement("div");
wrap.innerHTML = `<div id="pcPop" hidden>
  <img alt="">
  <div><b></b><small>Tippen zum Schnappen</small></div>
  <button type="button" id="pcLater" aria-label="Später">×</button>
</div>
<div id="pcAll" class="sheet" hidden>
  <div class="sheetHead"><h2>Postkarten</h2><button type="button" id="pcAllClose">Fertig</button></div>
  <p class="note">Erreichst du einen dieser Orte, poppt seine Postkarte auf.</p>
  <div id="pcList"></div>
</div>
<div id="pcEd" class="sheet" hidden>
  <div class="sheetHead"><h2>Postkarte</h2><button type="button" id="pcClose">Fertig</button></div>
  <div id="pcCard"><div id="pcTitle"></div></div>
  <div id="pcTools" hidden><button type="button" id="pcSmaller">−</button><button type="button" id="pcBigger">+</button><button type="button" id="pcTurn">⟳</button><button type="button" id="pcDel">🗑</button></div>
  <div class="pcRow"><textarea id="pcText" rows="2" placeholder="Liebe Grüße …"></textarea><button type="button" id="pcAddText">Text</button></div>
  <div class="pcInk" id="pcInk"></div>
  <div class="pcScroll" id="pcEmoji"></div>
  <div class="pcScroll stick" id="pcStick"></div>
  <button type="button" id="pcShare">Teilen</button>
</div>
`;
document.body.append(...wrap.children);
/* ---------------- Postcards ----------------
   Reach a place (Rhodos-Stadt, Lindos, …) and a postcard pops up on the map. Snap it, then fill it with
   writing, stickers and emojis, and share it as a picture. Found cards stay in the collection (✉). */
const sky = (a, b) => `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
  <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f9ad8"/><stop offset="1" stop-color="#1a6aa8"/></linearGradient></defs>
  <rect width="600" height="400" fill="url(#s)"/>`;
const sea = (y) => `<rect y="${y}" width="600" height="${400 - y}" fill="url(#w)"/>` +
  Array.from({ length: 6 }, (_, i) => `<path d="M${-40 + (i % 2) * 50} ${y + 22 + i * 26} q25 -10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="3"/>`).join("");
const sunC = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const house = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fbf8f1" stroke="#c9bfae" stroke-width="2"/><rect x="${x + w * 0.35}" y="${y + h * 0.45}" width="${w * 0.25}" height="${h * 0.4}" fill="#3b6ea5"/>`;
const SCENES = {
  rhodos: () => sky("#7cc7f2", "#d9f0fb") + sunC(500, 70, 34, "#ffd45c") + sea(260) +
    `<path d="M0 230 H600 V265 H0 Z" fill="#d9b77a"/><path d="M0 120 H220 V230 H0 Z" fill="#c99a57"/>` +
    Array.from({ length: 11 }, (_, i) => `<rect x="${i * 20}" y="104" width="12" height="18" fill="#c99a57"/>`).join("") +
    `<rect x="150" y="70" width="44" height="70" fill="#b98945"/>` + Array.from({ length: 3 }, (_, i) => `<rect x="${150 + i * 16}" y="58" width="10" height="14" fill="#b98945"/>`).join("") +
    [300, 380, 460].map((x) => `<path d="M${x - 16} 230 L${x - 12} 168 H${x + 12} L${x + 16} 230 Z" fill="#f4ede0" stroke="#bfae92" stroke-width="2"/><path d="M${x - 14} 170 Q${x} 150 ${x + 14} 170 Z" fill="#8a5a33"/>` +
      [0, 1, 2, 3].map((k) => `<line x1="${x}" y1="172" x2="${x + Math.cos(k * 1.57 + 0.4) * 34}" y2="${172 + Math.sin(k * 1.57 + 0.4) * 34}" stroke="#6b4a2a" stroke-width="4"/>`).join("")).join("") +
    [540, 580].map((x) => `<rect x="${x - 6}" y="180" width="12" height="80" fill="#efe6d4"/><path d="M${x - 12} 182 l12 -26 l12 26 Z" fill="#8a6a3a"/>`).join(""),
  lindos: () => sky("#86cdf4", "#e6f5fc") + sunC(90, 70, 30, "#ffd45c") + sea(300) +
    `<path d="M120 300 L180 150 L250 120 L330 118 L390 150 L440 300 Z" fill="#c89a5c"/><path d="M180 150 L250 120 L330 118 L390 150 Z" fill="#b5864a"/>` +
    Array.from({ length: 7 }, (_, i) => `<rect x="${240 + i * 13}" y="86" width="7" height="36" fill="#efe3c8"/>`).join("") + `<rect x="236" y="80" width="94" height="8" fill="#efe3c8"/>` +
    `<path d="M0 300 L0 250 Q120 236 160 300 Z" fill="#d8c08a"/><path d="M430 300 Q520 220 600 240 V300 Z" fill="#d8c08a"/>` +
    [[20, 262, 34, 28], [58, 270, 30, 30], [460, 262, 36, 30], [500, 252, 30, 36], [536, 258, 40, 32], [92, 276, 28, 24]].map((h) => house(...h)).join(""),
  kallithea: () => sky("#7fd0f3", "#ecf8fd") + sea(290) + `<rect y="290" width="600" height="110" fill="#38c2c9" opacity="0.55"/>` +
    `<path d="M0 290 H600 V310 H0 Z" fill="#e6d3a8"/><rect x="230" y="200" width="140" height="90" fill="#f3efe6" stroke="#cbbfa8" stroke-width="3"/>` +
    `<path d="M220 200 Q300 110 380 200 Z" fill="#e8dcc4" stroke="#cbbfa8" stroke-width="3"/>` +
    Array.from({ length: 5 }, (_, i) => `<rect x="${244 + i * 26}" y="215" width="10" height="75" fill="#fff"/>`).join("") +
    [[120, 290], [480, 290]].map(([x, y]) => `<path d="M${x} ${y} q8 -80 4 -140" stroke="#7a5a33" stroke-width="10" fill="none"/>` +
      [-60, -25, 15, 50].map((a) => `<path d="M${x + 4} ${y - 140} q${a} -20 ${a * 1.6} 20" stroke="#3f8a3c" stroke-width="12" fill="none" stroke-linecap="round"/>`).join("")).join(""),
  faliraki: () => sky("#ff9e6b", "#ffe2a8") + sunC(300, 210, 70, "#ffd06a") + sea(250) + `<path d="M0 320 Q300 290 600 320 V400 H0 Z" fill="#f0d39a"/>` +
    [[120, 320, "#e34a3a"], [250, 312, "#2a86d1"], [400, 316, "#f2b33a"], [520, 324, "#e34a3a"]].map(([x, y, c]) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 60}" stroke="#6b4a2a" stroke-width="4"/><path d="M${x - 40} ${y - 56} Q${x} ${y - 96} ${x + 40} ${y - 56} Z" fill="${c}"/>`).join(""),
  prasonisi: () => sky("#8fd3f5", "#eaf7fd") + sea(220) + `<path d="M0 260 Q300 300 600 250 V280 Q300 330 0 290 Z" fill="#f1dfae"/>` +
    `<path d="M380 160 Q470 120 560 170 L560 230 L380 230 Z" fill="#c9a067"/>` +
    `<path d="M160 70 L210 90 L180 130 L140 105 Z" fill="#ff5a5f"/><path d="M180 130 q-20 60 -30 150" stroke="#333" stroke-width="2" fill="none"/>` +
    `<path d="M80 150 L120 170 L95 200 L65 180 Z" fill="#ffd23f"/><path d="M95 200 q-10 50 -15 100" stroke="#333" stroke-width="2" fill="none"/>`,
  petaloudes: () => sky("#9fd8a8", "#e9f6dd") + `<rect y="250" width="600" height="150" fill="#5f9e4f"/>` +
    Array.from({ length: 9 }, (_, i) => `<rect x="${i * 70 + 20}" y="${120 + (i % 3) * 20}" width="14" height="160" fill="#6b4a2a"/><circle cx="${i * 70 + 27}" cy="${110 + (i % 3) * 20}" r="${48 - (i % 2) * 8}" fill="${i % 2 ? "#3f7d3a" : "#4f9145"}"/>`).join("") +
    Array.from({ length: 14 }, (_, i) => { const x = 40 + (i * 97) % 540, y = 60 + (i * 53) % 220; return `<g transform="translate(${x} ${y}) rotate(${(i * 37) % 60 - 30})"><path d="M0 0 q-14 -14 -18 2 q8 10 18 -2 q14 -14 18 2 q-8 10 -18 -2" fill="${i % 3 ? "#e35d2a" : "#f2b33a"}" stroke="#3a2a1a" stroke-width="1.5"/></g>`; }).join(""),
  kamiros: () => sky("#88cdf3", "#f0f8fc") + sea(230) + `<path d="M0 230 Q200 170 600 210 V400 H0 Z" fill="#d6b277"/>` +
    [[150, 120], [190, 140], [230, 110], [270, 150], [380, 130], [420, 160]].map(([x, h]) => `<rect x="${x}" y="${300 - h}" width="22" height="${h}" fill="#efe3c8" stroke="#bda886" stroke-width="2"/><rect x="${x - 4}" y="${296 - h}" width="30" height="8" fill="#e5d6b4"/>`).join("") +
    `<rect x="120" y="300" width="340" height="14" fill="#e5d6b4"/>`,
  monolithos: () => sky("#f6a26b", "#fde3b8") + sunC(470, 150, 46, "#ffcc66") + sea(300) +
    `<path d="M140 300 L190 170 L230 120 L290 110 L330 160 L360 300 Z" fill="#8f6a4a"/>` +
    `<rect x="225" y="70" width="90" height="50" fill="#c9a98a"/>` + Array.from({ length: 6 }, (_, i) => `<rect x="${225 + i * 16}" y="58" width="10" height="14" fill="#c9a98a"/>`).join("") +
    `<rect x="300" y="80" width="18" height="18" fill="#fff"/><path d="M296 80 L309 66 L322 80 Z" fill="#c0392b"/>`,
  // a law scroll: the sea law of Rhodes, unrolled on a harbour wall
  lexrhodia: () => sky("#8fd0f2", "#eaf6fb") + sea(250) +
    `<rect x="0" y="292" width="600" height="108" fill="#c9a873"/>` + Array.from({ length: 12 }, (_, i) => `<line x1="${i * 50}" y1="292" x2="${i * 50 + 20}" y2="400" stroke="#b08e5a" stroke-width="2"/>`).join("") +
    [380, 460, 540].map((x) => `<path d="M${x - 12} 250 L${x - 9} 205 H${x + 9} L${x + 12} 250 Z" fill="#f4ede0"/><path d="M${x - 10} 207 Q${x} 192 ${x + 10} 207 Z" fill="#8a5a33"/>`).join("") +
    `<path d="M70 120 H430 Q440 120 440 132 V300 Q440 312 430 312 H70 Q60 312 60 300 V132 Q60 120 70 120 Z" fill="#f1dfb0" stroke="#a87c3a" stroke-width="3"/>` +
    `<rect x="40" y="108" width="34" height="216" rx="17" fill="#d9bf86" stroke="#8a6a3a" stroke-width="3"/><rect x="426" y="108" width="34" height="216" rx="17" fill="#d9bf86" stroke="#8a6a3a" stroke-width="3"/>` +
    `<text x="250" y="165" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="26" fill="#5a3412">ΝΟΜΟΣ ΡΟΔΙΩΝ ΝΑΥΤΙΚΟΣ</text>` +
    `<text x="250" y="198" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="20" fill="#7a4a1a">Lex Rhodia de iactu</text>` +
    Array.from({ length: 6 }, (_, i) => `<line x1="${105 + (i % 2) * 10}" y1="${222 + i * 13}" x2="${395 - (i % 3) * 20}" y2="${222 + i * 13}" stroke="#a07a48" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`).join("") +
    `<circle cx="385" cy="285" r="20" fill="#a3341f"/><circle cx="385" cy="285" r="13" fill="none" stroke="#e0a090" stroke-width="2"/>` +
    `<path d="M140 268 q30 -28 60 0 Z M170 268 V246 L188 262 Z" fill="#7a4a1a" opacity="0.8"/>`,
  // a film poster: The Guns of Navarone, filmed on Rhodes in 1961 (our own drawing, after the film)
  navarone: () => `<defs><linearGradient id="ps" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a2e"/><stop offset="0.55" stop-color="#b8442a"/><stop offset="1" stop-color="#f2a23c"/></linearGradient></defs>
    <rect width="600" height="400" fill="#1a1414"/><rect x="150" y="10" width="300" height="380" fill="url(#ps)" stroke="#f1e4c4" stroke-width="6"/>
    <path d="M150 390 V170 L230 120 L300 150 L340 110 L420 160 L450 140 V390 Z" fill="#3a2a22"/>
    <path d="M220 210 h60 v30 h-60 Z M330 230 h60 v30 h-60 Z" fill="#120c0a"/>
    <path d="M250 222 L170 200 L172 210 L250 232 Z M360 242 L262 214 L264 224 L360 252 Z" fill="#6b6a64" stroke="#2a2a28" stroke-width="2"/>
    <path d="M150 340 Q300 325 450 345 V390 H150 Z" fill="#1f4f78"/><path d="M270 338 l30 -12 l30 12 Z M300 326 v-14" stroke="#f1e4c4" stroke-width="2" fill="#7a5230"/>
    <text x="300" y="52" text-anchor="middle" font-family="Georgia, serif" font-weight="900" font-size="22" fill="#f6e2b4" letter-spacing="2">DIE KANONEN</text>
    <text x="300" y="86" text-anchor="middle" font-family="Georgia, serif" font-weight="900" font-size="27" fill="#ffd36a" letter-spacing="2">VON NAVARONE</text>
    <text x="300" y="376" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#f6e2b4">gedreht auf Rhodos · 1961</text>
    <circle cx="90" cy="200" r="34" fill="#c0392b"/><text x="90" y="206" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="16" fill="#fff">KINO</text>`,
};

/* Works that live in several places of the world: one work, a card for each place.
   Each picture is the work in front of the place where you find it. */
const marble = "#ece6da", marbleD = "#cfc6b4";
function laokoon(cx, by) {
  return `<g stroke="#9c927f" stroke-width="2" stroke-linejoin="round">
    <rect x="${cx - 120}" y="${by}" width="240" height="22" fill="${marbleD}"/>
    <path d="M${cx - 30} ${by} L${cx - 38} ${by - 70} L${cx - 70} ${by - 120} L${cx - 58} ${by - 128} L${cx - 22} ${by - 92} L${cx - 10} ${by - 150} L${cx + 20} ${by - 150} L${cx + 26} ${by - 100} L${cx + 60} ${by - 170} L${cx + 72} ${by - 162} L${cx + 40} ${by - 80} L${cx + 30} ${by} Z" fill="${marble}"/>
    <circle cx="${cx + 4}" cy="${by - 164}" r="16" fill="${marble}"/>
    <path d="M${cx - 110} ${by} L${cx - 100} ${by - 80} L${cx - 84} ${by - 90} L${cx - 76} ${by} Z" fill="${marble}"/><circle cx="${cx - 92}" cy="${by - 100}" r="11" fill="${marble}"/>
    <path d="M${cx + 76} ${by} L${cx + 82} ${by - 70} L${cx + 100} ${by - 76} L${cx + 106} ${by} Z" fill="${marble}"/><circle cx="${cx + 92}" cy="${by - 86}" r="11" fill="${marble}"/></g>
    <path d="M${cx - 100} ${by - 40} C${cx - 60} ${by - 90} ${cx - 20} ${by - 10} ${cx} ${by - 70} S${cx + 60} ${by - 140} ${cx + 66} ${by - 166} M${cx + 90} ${by - 30} C${cx + 50} ${by - 60} ${cx + 20} ${by - 40} ${cx - 10} ${by - 110}" fill="none" stroke="#8a8f78" stroke-width="9" stroke-linecap="round"/>`;
}
function nike(cx, by, k = 1) {
  const X = (v) => cx + v * k, Y = (v) => by - v * k;
  return `<g stroke="#9c927f" stroke-width="2" stroke-linejoin="round">
    <path d="M${X(-70)} ${Y(0)} L${X(70)} ${Y(0)} L${X(90)} ${Y(30)} L${X(40)} ${Y(50)} L${X(-70)} ${Y(50)} Z" fill="${marbleD}"/>
    <path d="M${X(-20)} ${Y(50)} L${X(-30)} ${Y(140)} L${X(-10)} ${Y(190)} L${X(15)} ${Y(190)} L${X(28)} ${Y(130)} L${X(40)} ${Y(50)} Z" fill="${marble}"/>
    <path d="M${X(-8)} ${Y(185)} C${X(-60)} ${Y(240)} ${X(-110)} ${Y(250)} ${X(-150)} ${Y(232)} C${X(-110)} ${Y(215)} ${X(-80)} ${Y(190)} ${X(-60)} ${Y(150)} C${X(-40)} ${Y(165)} ${X(-25)} ${Y(170)} ${X(-8)} ${Y(170)} Z" fill="${marble}"/>
    <path d="M${X(6)} ${Y(185)} C${X(30)} ${Y(245)} ${X(60)} ${Y(262)} ${X(95)} ${Y(258)} C${X(70)} ${Y(232)} ${X(55)} ${Y(200)} ${X(40)} ${Y(165)} Z" fill="${marble}"/></g>`;
}
function argo(cx, y, k = 1) {
  const X = (v) => cx + v * k, Y = (v) => y - v * k;
  return `<path d="M${X(-110)} ${Y(10)} Q${X(0)} ${Y(-25)} ${X(110)} ${Y(10)} L${X(125)} ${Y(40)} L${X(95)} ${Y(20)} Q${X(0)} ${Y(5)} ${X(-100)} ${Y(25)} Z" fill="#7a4a24" stroke="#3a2412" stroke-width="2"/>` +
    Array.from({ length: 12 }, (_, i) => `<line x1="${X(-90 + i * 16)}" y1="${Y(0)}" x2="${X(-100 + i * 16)}" y2="${Y(-30)}" stroke="#3a2412" stroke-width="2"/>`).join("") +
    `<line x1="${X(0)}" y1="${Y(20)}" x2="${X(0)}" y2="${Y(130)}" stroke="#3a2412" stroke-width="4"/><rect x="${X(-48)}" y="${Y(125)}" width="${96 * k}" height="${80 * k}" fill="#f1e4c4" stroke="#8a5a26" stroke-width="2"/>` +
    `<circle cx="${X(0)}" cy="${Y(85)}" r="${16 * k}" fill="#c9973c"/>` + Array.from({ length: 8 }, (_, i) => `<line x1="${X(0)}" y1="${Y(85)}" x2="${X(Math.cos(i * 0.785) * 26)}" y2="${Y(85 + Math.sin(i * 0.785) * 26)}" stroke="#c9973c" stroke-width="3"/>`).join("");
}
const caption = (t) => `<rect x="0" y="372" width="600" height="28" fill="rgba(43,29,18,0.72)"/><text x="300" y="391" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="15" fill="#f6e2b4">${t}</text>`;
Object.assign(SCENES, {
  // the age-old plane tree on the village square of Apolakkia
  platane: () => sky("#9dd6f2", "#eef8fb") + `<rect y="300" width="600" height="100" fill="#e8dcc0"/>` +
    [[20, 230, 70, 70], [480, 220, 90, 80], [100, 250, 60, 50]].map((h) => house(...h)).join("") +
    `<rect x="500" y="150" width="34" height="80" fill="#fbf8f1" stroke="#c9bfae" stroke-width="2"/><path d="M496 150 L517 124 L538 150 Z" fill="#b8502e"/><circle cx="517" cy="170" r="7" fill="#8a6a3a"/>` +
    `<path d="M270 320 C262 260 250 230 230 200 L250 196 C268 222 282 240 290 262 C296 232 300 210 310 186 L330 192 C318 226 314 262 316 320 Z" fill="#8a6f52" stroke="#5a4532" stroke-width="3"/>` +
    [[300, 120, 95], [200, 150, 75], [400, 150, 80], [250, 80, 70], [360, 80, 70], [150, 200, 55], [450, 200, 55]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#4f8a3c" stroke="#3a6a2c" stroke-width="2"/>`).join("") +
    [[300, 105, 50], [230, 140, 40], [380, 130, 42]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#6aa64e"/>`).join("") +
    [[180, 340], [380, 345], [450, 338]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="24" ry="8" fill="#f4efe2"/><rect x="${x - 3}" y="${y}" width="6" height="22" fill="#6b4a2a"/><rect x="${x + 28}" y="${y - 14}" width="12" height="34" fill="#2f6aa8"/>`).join("") +
    caption("Die uralte Platane von Apolakkia"),
  "laokoon-rhodos": () => `<rect width="600" height="400" fill="#d8c08f"/>` +
    [60, 200, 340, 480].map((x) => `<path d="M${x} 380 V170 Q${x + 60} 90 ${x + 120} 170 V380" fill="#efe1bd" stroke="#a88a52" stroke-width="5"/>`).join("") +
    `<rect y="360" width="600" height="40" fill="#b9a271"/>` + laokoon(300, 345) + caption("Laokoon · geschaffen von Bildhauern aus Rhodos"),
  "laokoon-rom": () => `<rect width="600" height="400" fill="#c9cfd4"/><path d="M160 380 V140 Q300 20 440 140 V380 Z" fill="#a9b2ba" stroke="#7d868f" stroke-width="5"/>` +
    `<rect y="360" width="600" height="40" fill="#8e979f"/>` + laokoon(300, 345) + caption("Laokoon · Vatikanische Museen, Rom"),
  "nike-lindos": () => sky("#86cdf4", "#e6f5fc") + `<path d="M0 400 V140 L120 110 L300 100 L480 120 L600 150 V400 Z" fill="#c89a5c"/>` +
    Array.from({ length: 7 }, (_, i) => `<rect x="${250 + i * 14}" y="64" width="8" height="38" fill="#efe3c8"/>`).join("") +
    `<path d="M80 330 L240 330 L270 280 L200 270 L80 280 Z" fill="none" stroke="#8a6a3a" stroke-width="4"/><path d="M100 290 H230" stroke="#8a6a3a" stroke-width="3"/>` + nike(420, 360, 0.85) + caption("Nike · wie Pythokritos' Schiffsrelief am Fels von Lindos"),
  "nike-samothrake": () => sky("#9dd6f2", "#eef8fb") + sea(300) + `<path d="M0 300 L0 200 Q150 120 300 160 Q450 110 600 190 V300 Z" fill="#6f9a52"/>` +
    [[120, 230], [150, 225], [180, 222]].map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="70" fill="#efe3c8"/>`).join("") + nike(400, 330, 0.95) + caption("Nike von Samothrake · im Heiligtum der Großen Götter"),
  "nike-paris": () => `<rect width="600" height="400" fill="#b9b2a6"/><path d="M120 400 V80 H480 V400" fill="#cfc8bc"/>` +
    Array.from({ length: 9 }, (_, i) => `<rect x="${60 + i * 6}" y="${400 - (i + 1) * 14}" width="${480 - i * 12}" height="14" fill="${i % 2 ? "#ddd6ca" : "#e6e0d5"}"/>`).join("") + nike(300, 274, 0.8) +
    `<text x="300" y="60" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="6" fill="#6e665a">LOUVRE</text>` + caption("Nike von Samothrake · Louvre, Paris"),
  "argonautika-rhodos": () => sky("#f2b06b", "#fde7c4") + sea(290) + `<path d="M0 290 V200 Q200 150 380 180 L600 230 V290 Z" fill="#a8935c"/>` +
    [[160, 120], [190, 120], [220, 120]].map(([x, y]) => `<rect x="${x}" y="${y}" width="16" height="70" fill="#efe3c8"/>`).join("") + `<rect x="152" y="112" width="92" height="10" fill="#efe3c8"/>` + argo(420, 330, 0.9) +
    caption("Argonautika · Apollonios von Rhodos"),
  "argonautika-alexandria": () => sky("#86cdf4", "#e6f5fc") + sea(270) + `<rect x="80" y="110" width="50" height="160" fill="#efe3c8"/><rect x="90" y="60" width="30" height="50" fill="#efe3c8"/><circle cx="105" cy="52" r="10" fill="#ffd36a"/>` + argo(380, 320, 0.9) +
    caption("Argonautika · Alexandria, wo Apollonios die Bibliothek leitete"),
  "argonautika-volos": () => sky("#9dd6f2", "#eef8fb") + sea(280) + `<path d="M0 280 L0 120 Q160 60 320 130 Q460 80 600 140 V280 Z" fill="#4f8a3c"/>` + argo(330, 330, 0.95) +
    caption("Argonautika · Iolkos, wo die Argo in See stach"),
});
// what can be collected; every find is a card
const KINDS = { postkarte: "Postkarte", gesetzesrolle: "Gesetzesrolle", filmposter: "Filmposter", flora: "Flora", skulptur: "Bildhauerwerk", literatur: "Literatur" };
const KINDS_PL = { postkarte: "Postkarten", gesetzesrolle: "Gesetzesrollen", filmposter: "Filmposter", flora: "Flora", skulptur: "Bildhauerwerke", literatur: "Literatur" };
const titleOf = (s) => s.title || "Grüße aus " + s.name;
const SPOTS = [
  { id: "rhodos", name: "Rhodos", lat: 36.4495, lon: 28.2265, r: 1.5 },
  { id: "lindos", name: "Lindos", lat: 36.0915, lon: 28.0875, r: 1.2 },
  { id: "kallithea", name: "Kallithea", lat: 36.3795, lon: 28.2415, r: 0.8 },
  { id: "faliraki", name: "Faliraki", lat: 36.338, lon: 28.205, r: 1.2 },
  { id: "prasonisi", name: "Prasonisi", lat: 35.883, lon: 27.765, r: 1.5 },
  { id: "petaloudes", name: "Petaloudes", lat: 36.335, lon: 28.063, r: 0.9 },
  { id: "kamiros", name: "Kamiros", lat: 36.336, lon: 27.92, r: 0.9 },
  { id: "monolithos", name: "Monolithos", lat: 36.128, lon: 27.723, r: 1.2 },
  // Rhodes gave the sea its first law: the scroll lies in the harbour
  { id: "lexrhodia", kind: "gesetzesrolle", name: "Lex Rhodia", title: "Lex Rhodia · Seerecht von Rhodos", lat: 36.4508, lon: 28.2272, r: 0.45 },
  // the Kallithea springs were a film set
  { id: "navarone", kind: "filmposter", name: "Navarone", title: "Die Kanonen von Navarone", lat: 36.3803, lon: 28.2405, r: 0.35 },
  { id: "platane", kind: "flora", name: "Platane", place: "Apolakkia", title: "Die uralte Platane von Apolakkia", hint: "irgendwo auf Rhodos", lat: 36.0667, lon: 27.7878, r: 0.35 },
  // one work, several places: the card is different in each
  { id: "laokoon-rhodos", kind: "skulptur", item: "Laokoon-Gruppe", name: "Laokoon", place: "Rhodos", title: "Laokoon · Rhodos", hint: "irgendwo auf Rhodos", lat: 36.4451, lon: 28.2273, r: 0.25 },
  { id: "laokoon-rom", kind: "skulptur", item: "Laokoon-Gruppe", name: "Laokoon", place: "Rom", title: "Laokoon · Rom", hint: "in Rom", lat: 41.9065, lon: 12.4536, r: 0.5 },
  { id: "nike-lindos", kind: "skulptur", item: "Nike von Samothrake", name: "Nike", place: "Lindos", title: "Nike · Lindos", hint: "irgendwo auf Rhodos", lat: 36.0905, lon: 28.0883, r: 0.3 },
  { id: "nike-samothrake", kind: "skulptur", item: "Nike von Samothrake", name: "Nike", place: "Samothrake", title: "Nike · Samothrake", hint: "auf Samothrake", lat: 40.4936, lon: 25.5306, r: 1 },
  { id: "nike-paris", kind: "skulptur", item: "Nike von Samothrake", name: "Nike", place: "Paris", title: "Nike · Paris", hint: "in Paris", lat: 48.8606, lon: 2.3376, r: 0.5 },
  { id: "argonautika-rhodos", kind: "literatur", item: "Argonautika", name: "Argonautika", place: "Rhodos", title: "Argonautika · Rhodos", hint: "irgendwo auf Rhodos", lat: 36.4300, lon: 28.2093, r: 0.35 },
  { id: "argonautika-alexandria", kind: "literatur", item: "Argonautika", name: "Argonautika", place: "Alexandria", title: "Argonautika · Alexandria", hint: "in Alexandria", lat: 31.2089, lon: 29.9092, r: 0.6 },
  { id: "argonautika-volos", kind: "literatur", item: "Argonautika", name: "Argonautika", place: "Volos", title: "Argonautika · Iolkos", hint: "in Volos, dem alten Iolkos", lat: 39.3616, lon: 22.9422, r: 1 },
];
SPOTS.forEach((s) => { s.kind = s.kind || "postkarte"; });
const sceneSVG = (id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="1500" height="1000">${SCENES[id]()}</svg>`;
const sceneURL = (id) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sceneSVG(id));
const PC_KEY = "rhodos-postkarten";
let PC = {};
try { PC = JSON.parse(localStorage.getItem(PC_KEY) || "{}"); } catch (e) {}
const pcSave = () => { try { localStorage.setItem(PC_KEY, JSON.stringify(PC)); } catch (e) {} };
const pcCount = () => Object.keys(PC).length;
function pcBadge() { $("#pcBtn").textContent = "✉" + (pcCount() ? " " + pcCount() : ""); }

// where you are: a spot reached for the first time pops its card
function postcardCheck(f) {
  // the smallest circles first: a hidden find inside a postcard's circle pops before the postcard
  for (const s of [...SPOTS].sort((a, b) => a.r - b.r)) {
    if (PC[s.id] || popping === s.id) continue;
    if (distKm([f.lat, f.lon], [s.lat, s.lon]) <= s.r && f.acc < 300) { popCard(s); break; }
  }
}
let popping = null;
function popCard(s) {
  popping = s.id;
  const pop = $("#pcPop");
  pop.querySelector("img").src = sceneURL(s.id);
  pop.querySelector("b").textContent = titleOf(s);
  pop.querySelector("small").textContent = (s.kind === "postkarte" ? "Postkarte" : KINDS[s.kind] + " gefunden!") + " · Tippen zum Schnappen";
  pop.hidden = false; pop.classList.remove("in"); void pop.offsetWidth; pop.classList.add("in");
  if (navigator.vibrate) try { navigator.vibrate([40, 60, 40]); } catch (e) {}
  pop.onclick = () => { snap(s); };
}
function snap(s) {
  $("#pcPop").hidden = true; popping = null;
  if (!PC[s.id]) { PC[s.id] = { at: new Date().toISOString(), items: [stampItem(s)] }; pcSave(); pcBadge(); }
  openEditor(s.id);
}
$("#pcLater").onclick = (e) => { e.stopPropagation(); const id = popping; $("#pcPop").hidden = true; popping = null;
  const s = SPOTS.find((x) => x.id === id); if (s && !PC[id]) { PC[id] = { at: new Date().toISOString(), items: [stampItem(s)] }; pcSave(); pcBadge(); } };
const stampItem = (s) => ({ k: "stamp", x: 82, y: 22, s: 1, r: -12, t: (s.place || s.name).toUpperCase(), d: new Date().toLocaleDateString("de-DE") });

/* the collection */
$("#pcBtn").onclick = () => {
  const list = $("#pcList");
  // by kind, and within a kind by work: a work found in several places shows one card per place
  const card = (s, label) => PC[s.id]
    ? `<button type="button" class="pcThumb" data-id="${s.id}"><img src="${sceneURL(s.id)}" alt=""><span>${label}</span></button>`
    : `<div class="pcThumb locked"><span>${s.kind === "postkarte" ? s.name : s.item && !s.hint.startsWith("irgendwo") ? s.place : "???"}</span><small>${s.kind === "postkarte" ? "noch nicht dort" : s.hint || "irgendwo auf Rhodos"}</small></div>`;
  list.innerHTML = Object.keys(KINDS).map((k) => {
    const of = SPOTS.filter((s) => s.kind === k), n = of.filter((s) => PC[s.id]).length;
    const items = [...new Set(of.map((s) => s.item || s.id))];
    return `<h3 class="pcKind">${KINDS_PL[k]} <small>${n} von ${of.length}</small></h3>` + items.map((it) => {
      const cards = of.filter((s) => (s.item || s.id) === it);
      const head = cards[0].item ? `<h4 class="pcItem">${cards[0].item} <small>${cards.filter((s) => PC[s.id]).length} von ${cards.length} Orten</small></h4>` : "";
      return head + cards.map((s) => card(s, s.item ? s.place : s.name)).join("");
    }).join("");
  }).join("");
  list.querySelectorAll("button[data-id]").forEach((b) => b.onclick = () => { $("#pcAll").hidden = true; openEditor(b.dataset.id); });
  $("#pcAll").hidden = false;
};
$("#pcAllClose").onclick = () => { $("#pcAll").hidden = true; };

/* ---------------- The editor ---------------- */
const EMOJI = ["😎", "🌞", "🏖️", "🌊", "⛵", "🏛️", "🐢", "🐙", "🦋", "🍉", "🍹", "🥙", "🫒", "❤️", "✨", "😘", "🤿", "🍦", "🐐", "🌺"];
const STICKERS = [["stamp", "Stempel"], ["banner:Kalimera!", "Kalimera!"], ["banner:Yassou!", "Yassou!"], ["banner:Wish you were here", "Wish you were here"], ["heart", "♥ Rhodos"]];
const INK = ["#2b1d12", "#c8321e", "#1f5fa8", "#ffffff", "#2f7d3a"];
let ED = null;   // { id, sel }
function openEditor(id) {
  const s = SPOTS.find((x) => x.id === id);
  ED = { id, s, sel: -1, ink: INK[0] };
  $("#pcEd").hidden = false;
  $("#pcCard").style.backgroundImage = `url("${sceneURL(id)}")`;
  $("#pcTitle").textContent = titleOf(s);
  $("#pcEmoji").innerHTML = EMOJI.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join("");
  $("#pcEmoji").querySelectorAll("button").forEach((b) => b.onclick = () => addItem({ k: "emoji", t: b.dataset.e, x: 30 + Math.random() * 40, y: 40 + Math.random() * 30, s: 1, r: 0 }));
  $("#pcStick").innerHTML = STICKERS.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join("");
  $("#pcStick").querySelectorAll("button").forEach((b) => b.onclick = () => {
    const v = b.dataset.v;
    if (v === "stamp") addItem(stampItem(s));
    else if (v === "heart") addItem({ k: "heart", t: "Rhodos", x: 50, y: 50, s: 1, r: -6 });
    else addItem({ k: "banner", t: v.slice(7), x: 50, y: 34, s: 1, r: -4 });
  });
  $("#pcInk").innerHTML = INK.map((c, i) => `<button type="button" data-i="${i}" style="background:${c}" aria-pressed="${i === 0}"></button>`).join("");
  $("#pcInk").querySelectorAll("button").forEach((b) => b.onclick = () => {
    ED.ink = INK[+b.dataset.i];
    $("#pcInk").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const it = PC[ED.id].items[ED.sel]; if (it && it.k === "text") { it.c = ED.ink; pcSave(); drawItems(); }
  });
  $("#pcText").value = "";
  drawItems();
}
function addItem(it) { const l = PC[ED.id].items; l.push(it); ED.sel = l.length - 1; pcSave(); drawItems(); }
$("#pcAddText").onclick = () => {
  const t = $("#pcText").value.trim(); if (!t) return $("#pcText").focus();
  addItem({ k: "text", t, x: 35, y: 70, s: 1, r: -3, c: ED.ink }); $("#pcText").value = "";
};
function itemHTML(it) {
  if (it.k === "emoji") return `<span class="e">${it.t}</span>`;
  if (it.k === "text") return `<span class="t" style="color:${it.c}">${it.t.replace(/[<>&]/g, "").replace(/\n/g, "<br>")}</span>`;
  if (it.k === "stamp") return `<span class="st"><b>${it.t}</b><i>${it.d}</i></span>`;
  if (it.k === "banner") return `<span class="bn">${it.t}</span>`;
  if (it.k === "heart") return `<span class="hr">♥ ${it.t}</span>`;
  return "";
}
function drawItems() {
  const card = $("#pcCard"); card.querySelectorAll(".it").forEach((e) => e.remove());
  PC[ED.id].items.forEach((it, i) => {
    const d = document.createElement("div"); d.className = "it" + (i === ED.sel ? " sel" : "");
    d.style.left = it.x + "%"; d.style.top = it.y + "%";
    d.style.transform = `translate(-50%, -50%) rotate(${it.r}deg) scale(${it.s})`;
    d.innerHTML = itemHTML(it);
    let st = null;
    d.addEventListener("pointerdown", (e) => { e.stopPropagation(); ED.sel = i; card.querySelectorAll(".it").forEach((x) => x.classList.remove("sel")); d.classList.add("sel"); d.setPointerCapture(e.pointerId); st = [e.clientX, e.clientY, it.x, it.y]; $("#pcTools").hidden = false; });
    d.addEventListener("pointermove", (e) => {
      if (!st) return; const r = card.getBoundingClientRect();
      it.x = clamp(st[2] + (e.clientX - st[0]) / r.width * 100, 0, 100); it.y = clamp(st[3] + (e.clientY - st[1]) / r.height * 100, 0, 100);
      d.style.left = it.x + "%"; d.style.top = it.y + "%";
    });
    d.addEventListener("pointerup", () => { st = null; pcSave(); });
    card.append(d);
  });
  $("#pcTools").hidden = ED.sel < 0 || !PC[ED.id].items[ED.sel];
}
$("#pcCard").addEventListener("pointerdown", () => { ED.sel = -1; drawItems(); });
const selIt = () => PC[ED.id].items[ED.sel];
$("#pcBigger").onclick = () => { const it = selIt(); if (it) { it.s = Math.min(4, it.s * 1.2); pcSave(); drawItems(); } };
$("#pcSmaller").onclick = () => { const it = selIt(); if (it) { it.s = Math.max(0.3, it.s / 1.2); pcSave(); drawItems(); } };
$("#pcTurn").onclick = () => { const it = selIt(); if (it) { it.r = (it.r + 15) % 360; pcSave(); drawItems(); } };
$("#pcDel").onclick = () => { if (selIt()) { PC[ED.id].items.splice(ED.sel, 1); ED.sel = -1; pcSave(); drawItems(); } };
$("#pcClose").onclick = () => { $("#pcEd").hidden = true; ED = null; };

/* the picture to share: the scene, the title, and every item, drawn the same way on a canvas */
async function renderCard() {
  const W = 1500, H = 1000, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const img = new Image(); img.src = sceneURL(ED.id); await img.decode();
  c.drawImage(img, 0, 0, W, H);
  try { await document.fonts.ready; } catch (e) {}
  // white border like a printed card
  c.strokeStyle = "#fffaf0"; c.lineWidth = 36; c.strokeRect(0, 0, W, H);
  c.font = "90px 'Alfa Slab One', Georgia, serif"; c.textBaseline = "top"; c.lineJoin = "round";
  c.lineWidth = 12; c.strokeStyle = "#fffaf0"; c.strokeText($("#pcTitle").textContent, 60, 54);
  c.fillStyle = "#3b2412"; c.fillText($("#pcTitle").textContent, 60, 54);
  const u = W / 100;   // 1 % of the card width, the unit the card on screen uses (cqw)
  for (const it of PC[ED.id].items) {
    c.save(); c.translate(it.x / 100 * W, it.y / 100 * H); c.rotate(it.r * Math.PI / 180); c.scale(it.s, it.s);
    c.textAlign = "center"; c.textBaseline = "middle";
    if (it.k === "emoji") { c.font = `${10 * u}px system-ui, 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`; c.fillText(it.t, 0, 0); }
    else if (it.k === "text") {
      c.font = `600 ${7.6 * u}px 'Caveat', cursive`; const lines = it.t.split("\n");
      lines.forEach((l, i) => { const y = (i - (lines.length - 1) / 2) * 8 * u; c.lineWidth = 1.6 * u; c.lineJoin = "round"; c.strokeStyle = it.c === "#ffffff" ? "rgba(0,0,0,0.35)" : "rgba(255,250,240,0.85)"; c.strokeText(l, 0, y); c.fillStyle = it.c; c.fillText(l, 0, y); });
    } else if (it.k === "stamp") {
      c.strokeStyle = "#a3341f"; c.fillStyle = "#a3341f"; c.lineWidth = 0.4 * u;
      c.beginPath(); c.arc(0, 0, 10.5 * u, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, 9.4 * u, 0, Math.PI * 2); c.stroke();
      c.font = `700 ${3.3 * u}px 'Figtree', sans-serif`; c.fillText(it.t, 0, -1.6 * u); c.font = `400 ${2.8 * u}px 'Figtree', sans-serif`; c.fillText(it.d, 0, 2.4 * u);
    } else if (it.k === "banner") {
      c.font = `${5.6 * u}px 'Alfa Slab One', Georgia, serif`; const w = c.measureText(it.t).width + 8 * u, h = 4.2 * u;
      c.fillStyle = "#f3e3bd"; c.strokeStyle = "#a0672c"; c.lineWidth = 0.4 * u;
      c.beginPath(); c.moveTo(-w / 2, -h); c.lineTo(w / 2, -h); c.lineTo(w / 2 - 0.04 * w, 0); c.lineTo(w / 2, h); c.lineTo(-w / 2, h); c.lineTo(-w / 2 + 0.04 * w, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = "#3b2412"; c.fillText(it.t, 0, 0.2 * u);
    } else if (it.k === "heart") {
      c.font = `700 ${6.5 * u}px 'Figtree', sans-serif`; const w = c.measureText("♥ " + it.t).width + 8 * u, h = 5 * u;
      c.fillStyle = "#c8321e"; c.beginPath(); if (c.roundRect) c.roundRect(-w / 2, -h, w, 2 * h, h); else c.rect(-w / 2, -h, w, 2 * h); c.fill();
      c.fillStyle = "#fff"; c.fillText("♥ " + it.t, 0, 0.2 * u);
    }
    c.restore();
  }
  return new Promise((res) => cv.toBlob(res, "image/jpeg", 0.9));
}
$("#pcShare").onclick = async () => {
  const blob = await renderCard(), name = "postkarte-" + ED.id + ".jpg";
  const file = new File([blob], name, { type: "image/jpeg" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: $("#pcTitle").textContent, text: $("#pcTitle").textContent }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
};
pcBadge();
// for trying it out at home: karte/?postkarte=lindos
const testId = new URLSearchParams(location.search).get("postkarte");
if (testId && SPOTS.find((s) => s.id === testId)) setTimeout(() => popCard(SPOTS.find((s) => s.id === testId)), 800);

window.Postcards = { check: postcardCheck, count: pcCount, spots: SPOTS, found: () => PC, open: () => $("#pcBtn") && $("#pcBtn").click() };
})();
