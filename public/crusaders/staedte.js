/* Crusaders: towns, the factions that shaped them around 1310, their markets and their jobs.
   The board of the nearest town is always open, however far away you are, so you can always play.
   A job you take spawns around you; the farther you choose to walk, the more it pays.
   The market only opens when you are there. Needs kampf.js (window.Spiel, window.Kampf). */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const km = (a, b) => { const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); };
  const fmtKm = (d) => (d < 1 ? Math.round(d * 1000) + " m" : (d < 10 ? d.toFixed(1).replace(".", ",") : Math.round(d)) + " km");
  const today = () => new Date().toISOString().slice(0, 10);
  const seeded = (str) => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; };

  /* ---------------- The powers of Rhodes, from myth to 1945 ----------------
     Every age left its masters in the towns; here they stand side by side. era: when they ruled or
     roamed. noJobs: they hand out no work, they are only fought against. hidden: their sway is not shown. */
  const FACTIONS = {
    telchinen: { name: "Telchinen", icon: "🔱", color: "#1f6a7a", era: "Mythos", rival: "mitra",
      desc: "Die ersten Bewohner der Insel, Kinder des Meeres. Sie schmiedeten Poseidons Dreizack und die Sichel des Kronos, riefen Regen und Hagel, bis Zeus sie in der Flut versenkte. Manche sagen, nicht alle." },
    mitra: { name: "Schwestern der Mitra", icon: "🐍", color: "#2a5a3a", era: "im Verborgenen", rival: "telchinen", hidden: true,
      desc: "Eine Schwesternschaft, älter als die Ritter, älter als die Hellenen. Sie flüstert Fürsten ins Ohr, lenkt Blutlinien über Jahrhunderte und trägt die Schlange unter dem Schleier. Wer ihr dient, wird reich, und gehört ihr." },
    griechen: { name: "Rhodische Griechen", icon: "☦", color: "#2a6fa8", era: "immer", rival: null,
      desc: "Bauern, Fischer, Mönche und Priester. Das Volk der Insel, orthodox, unter wechselnden Herren, und immer noch da." },
    johanniter: { name: "Johanniter", icon: "✠", color: "#b8322a", era: "1309–1522", rival: "mentese",
      desc: "Die Ritter des Hospitals. 1306 gelandet, ab 1309 Herren von Rhodos: Hospital, Galeeren, Mauern. 1522 ziehen sie nach der großen Belagerung ab." },
    genuesen: { name: "Genuesen", icon: "⚓", color: "#c9973c", era: "13.–15. Jh.", rival: "venezianer",
      desc: "Kaufleute und Korsaren. Der Genuese Vignolo de' Vignoli verkaufte den Rittern die Insel, die er nie besaß." },
    venezianer: { name: "Venezianer", icon: "🦁", color: "#8a2a5a", era: "13.–16. Jh.", rival: "genuesen",
      desc: "Händler der Serenissima: Pfeffer, Seide und Glas. Venedig handelt mit allen und traut keinem." },
    mentese: { name: "Menteşe", icon: "☾", color: "#2a7a4a", era: "1260–1424", rival: "johanniter",
      desc: "Das Emirat an der anatolischen Küste gegenüber. Seefahrer und Krieger, Feinde der Ritter, Partner im Handel." },
    osmanen: { name: "Osmanen", icon: "🌙", color: "#9a2a2a", era: "1522–1912", rival: "italiener",
      desc: "Süleyman der Prächtige nimmt die Stadt 1522. Fast vier Jahrhunderte Paschas, Moscheen, Bäder und Basare; die Griechen leben vor den Mauern." },
    italiener: { name: "Italiener", icon: "🏛", color: "#2a7a5a", era: "1912–1943", rival: "briten",
      desc: "1912 im Krieg gegen die Osmanen besetzt. Rom baut Straßen, das Bad von Kallithea, den Palast der Großmeister neu, gräbt in Lindos und Kamiros, und will die Insel italienisch machen." },
    wehrmacht: { name: "Wehrmacht", icon: "✚", color: "#4a4e48", era: "1943–1945", rival: "briten", noJobs: true,
      desc: "Die deutsche Besatzung ab September 1943, nach dem Kampf gegen die italienische Garnison. Im Juli 1944 deportierte sie die jüdische Gemeinde von Rhodos nach Auschwitz. Hier nur Gegner: Wer gegen sie arbeitet, hilft Widerstand, Briten und Flüchtenden." },
    briten: { name: "Briten", icon: "⚑", color: "#2a3a7a", era: "1943–1947", rival: "wehrmacht",
      desc: "Kommandos des Special Boat Service in den Buchten, 1945 die Übergabe, bis die Insel 1947 an Griechenland kommt." },
  };
  const NAMES = ["Mavros", "Kara Ali", "Il Guercio", "Rizzo der Rote", "Sfakianos", "Lomellino", "Kakomoiris", "Umur der Schwarze", "Spinola der Jüngere", "Sarakinos", "Barbadoro", "Mezzalancia"];

  /* What each faction asks of you. t: kind; foes: who stands in the way (none = just get there). */
  const JOBS = {
    telchinen: [
      { name: "Erz für die Schmiede", text: "In der Höhle der Telchinen fehlt Erz für den Amboss, und eine Bestie hat sich davor gelegt.", foes: ["bulle"], exp: 60, gold: 30 },
      { name: "Ein Splitter des Dreizacks", text: "Bring den Splitter zu einer Meereshöhle. Sprich nicht, bis du das Wasser hörst.", exp: 45, gold: 25 },
      { name: "Die Wächterinnen vertreiben", text: "Die Schlange will die alte Schmiede für sich. Die Telchinen bitten dich, ihre Wächterinnen zu vertreiben.", foes: ["adeptin", "adeptin", "schlange"], exp: 90, gold: 35, hurt: "mitra" },
    ],
    mitra: [
      { name: "Ein Flüstern am Hof", text: "Bring einen Brief ohne Siegel zu einem Mann, der ihn erwartet. Frag nicht, was darin steht.", exp: 40, gold: 80, hurt: "griechen" },
      { name: "Ein Amulett für den Schmied", text: "Leg das Schlangenamulett dort ab, wo die Telchinen schmieden. Mehr nicht. Die Schwestern sind großzügig.", exp: 45, gold: 90, hurt: "telchinen" },
      { name: "Die Neugierigen", text: "Zwei Söldner haben gesehen, was sie nicht sehen sollten. Die Schwestern wünschen, dass sie vergessen.", foes: ["soeldner", "soeldner"], exp: 50, gold: 110, hurt: "johanniter" },
    ],
    osmanen: [
      { name: "Die Steuer des Paschas", text: "Der Steuereintreiber wurde auf dem Weg überfallen. Hol die Truhe zurück, bevor der Pascha Fragen stellt.", foes: ["bandit", "bandit"], exp: 50, gold: 40 },
      { name: "Ein Brief an die Süleyman-Moschee", text: "Der Imam wartet auf Nachricht aus dem Dorf. Der Weg ist nicht weit, aber die Zeit drängt.", exp: 30, gold: 30 },
      { name: "Kopfgeld: Pirat {N}", text: "{N} plündert die Handelsschiffe nach Smyrna. Der Kapudan Pascha zahlt in Gold.", foes: [{ k: "korsar", name: "{N}", hp: 1.5 }, "korsar"], exp: 65, gold: 45 },
    ],
    italiener: [
      { name: "Nachtwache an der Grabung", text: "Die Archäologen aus Rom graben in der alten Stadt. Nachts kommen die Schatten aus den Gräbern.", foes: ["schatten", "schatten"], exp: 60, gold: 40, antik: true },
      { name: "Vermessung für die neue Straße", text: "Der Ingenieur braucht einen Läufer mit Messkette und gutem Orientierungssinn.", exp: 30, gold: 35 },
      { name: "Wasser aus den Quellen", text: "Für das neue Thermalbad soll das Quellwasser untersucht werden. Bring eine Probe, aber zerbrich das Glas nicht.", exp: 35, gold: 35 },
    ],
    briten: [
      { name: "Ablenkung am Flugfeld", text: "Kommandos des SBS wollen an die Flugzeuge. Jemand muss die Wache weglocken.", foes: ["soldat", "soldat"], exp: 70, gold: 40, hurt: "wehrmacht" },
      { name: "Das Fluchtboot nach Anatolien", text: "In einer Bucht wartet ein Kaiki. Bring die Versteckten ans Wasser, bevor die Streife kommt.", foes: ["soldat"], exp: 65, gold: 30, hurt: "wehrmacht" },
      { name: "Das Funkgerät", text: "Ein Funkgerät muss aus dem Dorf in eine Höhle am Hang. Niemand darf dich damit sehen.", exp: 35, gold: 25 },
    ],
    johanniter: [
      { name: "Kopfgeld: Korsar {N}", text: "Der Korsar {N} überfällt Pilgerschiffe vor der Küste. Der Orden zahlt für seinen Kopf.", foes: [{ k: "korsar", name: "{N}", hp: 1.5 }, "korsar"], exp: 70, gold: 45 },
      { name: "Versiegelte Order", text: "Bring einen Brief des Großmeisters an einen Ritter im Land. Niemand darf ihn lesen.", exp: 30, gold: 25 },
      { name: "Pilger geleiten", text: "Pilger auf dem Weg ins Heilige Land werden von Wegelagerern bedrängt. Bring sie sicher an ihr Ziel.", foes: ["bandit", "bandit"], exp: 50, gold: 30 },
      { name: "Die Schwester im Hospital", text: "Eine Schwester im Hospital trägt eine Schlange unter dem Habit. Folge ihr, wenn sie nachts hinausgeht.", foes: ["adeptin", "adeptin"], exp: 70, gold: 40, hurt: "mitra" },
      { name: "Späher der Menteşe", text: "Fremde Reiter wurden gesehen. Finde sie, bevor sie die Mauern ausgespäht haben.", foes: ["reiter", "reiter"], exp: 60, gold: 35, hurt: "mentese" },
    ],
    griechen: [
      { name: "Die versprengte Herde", text: "Wildhunde haben die Ziegen versprengt. Treib sie zurück, bevor es Nacht wird.", foes: ["wolf", "wolf"], exp: 35, gold: 18 },
      { name: "Die Ikone verstecken", text: "Die Ikone der Panagia soll vor Plünderern in eine Höhle gebracht werden.", exp: 30, gold: 15 },
      { name: "Kopfgeld: Räuber {N}", text: "{N} raubt die Bauern auf dem Weg zum Markt aus. Das ganze Dorf legt zusammen.", foes: [{ k: "bandit", name: "{N}", hp: 1.5 }, "bandit"], exp: 55, gold: 28 },
      { name: "Kräuter für den Priester", text: "Am Hang wachsen Salbei und Thymian. Der Priester braucht sie für die Kranken.", exp: 25, gold: 12 },
      { name: "Die Schlange im Brunnen", text: "Fremde Frauen in grünen Schleiern wurden am Dorfbrunnen gesehen. Seitdem schläft das Vieh nicht mehr.", foes: ["adeptin", "schlange"], exp: 70, gold: 30, hurt: "mitra" },
      { name: "Schatten in den Ruinen", text: "In den alten Mauern der Hellenen spukt es. Seitdem meiden die Leute den Weg.", foes: ["schatten", "schatten"], exp: 60, gold: 25, antik: true },
    ],
    genuesen: [
      { name: "Kiste ohne Siegel", text: "Am Strand liegt eine Kiste ohne Zollsiegel. Söldner sind schon unterwegs. Sei schneller.", foes: ["soeldner", "bandit"], exp: 50, gold: 50 },
      { name: "Schulden eintreiben", text: "Ein Venezianer schuldet Genua Geld. Er reist mit Leibwächtern.", foes: ["soeldner"], exp: 40, gold: 55, hurt: "venezianer" },
    ],
    venezianer: [
      { name: "Pfeffer aus Alexandria", text: "Eine Kiste Pfeffer, mehr wert als ein Dorf. Korsaren lauern am Weg.", foes: ["korsar", "korsar"], exp: 55, gold: 60 },
      { name: "Kopfgeld: {N} aus Genua", text: "{N} hat ein venezianisches Schiff gekapert. Die Signoria vergisst nicht.", foes: [{ k: "soeldner", name: "{N}", hp: 1.6 }], exp: 55, gold: 55, hurt: "genuesen" },
    ],
    mentese: [
      { name: "Botschaft ohne Kreuz", text: "Ein Händler aus Menteşe braucht einen Boten, der kein Ordenskreuz trägt.", exp: 35, gold: 40, hurt: "johanniter" },
      { name: "Die Pferde des Emirs", text: "Wildhunde reißen die Pferde am Weideplatz. Der Emir zahlt gut.", foes: ["wolf", "wolf", "wolf"], exp: 50, gold: 45 },
    ],
  };

  /* Goods. base: price in gold. use: what it becomes in your pack (figs and wine you can use in a fight). */
  const GOODS = {
    feigen: { name: "Feigen", icon: "🫐", base: 4, use: "figs" }, wein: { name: "Wein", icon: "🍷", base: 7, use: "wein" },
    oel: { name: "Olivenöl", icon: "🫒", base: 8 }, honig: { name: "Thymianhonig", icon: "🍯", base: 10 }, wachs: { name: "Bienenwachs", icon: "🕯", base: 9 },
    salz: { name: "Salz", icon: "🧂", base: 3 }, holz: { name: "Kiefernholz", icon: "🪵", base: 5 }, harz: { name: "Harz", icon: "🟫", base: 7 },
    keramik: { name: "Keramik", icon: "🏺", base: 14 }, schwamm: { name: "Schwämme", icon: "🧽", base: 12 }, leder: { name: "Leder", icon: "🟤", base: 11 },
    seide: { name: "Seide", icon: "🧵", base: 40 }, pfeffer: { name: "Pfeffer", icon: "🌶", base: 35 }, glas: { name: "Glas aus Murano", icon: "🍶", base: 26 },
  };
  /* The towns: who holds sway (shares), what is made there (cheap) and what is wanted (dear).
     Villages without an entry take after the nearest of these, with the Greeks stronger. */
  const HUBS = {
    Rhodos: { f: { johanniter: 28, osmanen: 20, italiener: 14, griechen: 14, genuesen: 6, venezianer: 6, wehrmacht: 5, briten: 3, mentese: 2, mitra: 2 }, make: ["seide", "pfeffer", "glas", "salz"], want: ["oel", "wein", "holz", "honig", "wachs"],
      note: "Der große Hafen. Hinter neuen Mauern bauen die Ritter ihr Hospital und ihren Konvent. Später Paschas und Basare, dann die Italiener mit ihren Neubauten am Mandraki." },
    Lindos: { f: { griechen: 40, johanniter: 24, italiener: 12, osmanen: 10, genuesen: 8, telchinen: 3, mitra: 3 }, make: ["schwamm", "keramik", "salz"], want: ["holz", "pfeffer", "wein"],
      note: "Die Burg auf der Akropolis, 1310 von den Rittern genommen. Unten die Kapitäne und ihre Häuser. Später graben hier die Archäologen, und die Akropolis wird neu aufgerichtet." },
    Ialysos: { f: { griechen: 38, johanniter: 25, italiener: 15, osmanen: 8, wehrmacht: 6, telchinen: 5, genuesen: 3 }, make: ["wein", "oel"], want: ["seide", "keramik"],
      note: "Vom Berg Filerimos aus eroberten die Ritter die Insel. Das Kloster ist ihr erster Stützpunkt. Die Italiener bauen das Kloster neu, 1943 kämpfen hier die Garnisonen." },
    Embonas: { f: { griechen: 78, telchinen: 10, osmanen: 6, mitra: 6 }, make: ["wein", "honig"], want: ["salz", "keramik"],
      note: "Am Fuß des Attavyros. Hier wird der Wein der Insel gekeltert." },
    Kritinia: { f: { griechen: 58, johanniter: 18, telchinen: 10, mitra: 7, mentese: 7 }, make: ["honig", "wachs"], want: ["salz", "leder"],
      note: "Über Kamiros, der toten Stadt der Hellenen. Ein Ausguck nach Westen." },
    Archangelos: { f: { griechen: 58, johanniter: 18, osmanen: 12, italiener: 8, mitra: 4 }, make: ["keramik", "leder"], want: ["oel", "glas"],
      note: "Töpfer und Gerber, und eine kleine Burg am Hang." },
    Monolithos: { f: { griechen: 64, johanniter: 12, mentese: 8, wehrmacht: 8, mitra: 8 }, make: ["holz", "harz"], want: ["salz", "wein", "pfeffer"],
      note: "Ein Fels über dem Meer und Wälder ringsum. Wer hier wohnt, sieht die Segel zuerst." },
    Charaki: { f: { johanniter: 44, griechen: 34, osmanen: 10, genuesen: 6, mitra: 6 }, make: ["salz", "oel"], want: ["leder", "glas"],
      note: "Die Burg Feraklos, eine der ersten Festen der Ritter, wacht über die Bucht." },
    Asklipio: { f: { griechen: 74, johanniter: 12, mitra: 8, telchinen: 6 }, make: ["oel", "wachs"], want: ["seide", "pfeffer"],
      note: "Die Kirche der Entschlafung, seit 1060 bemalt. Darüber die byzantinische Burg." },
    Kattavia: { f: { griechen: 52, mentese: 14, osmanen: 10, wehrmacht: 10, briten: 6, genuesen: 8 }, make: ["salz", "leder"], want: ["holz", "wein"],
      note: "Das Ende der Insel. Hierher kommen die Boote von der anatolischen Küste." },
    Gennadi: { f: { griechen: 58, mentese: 14, venezianer: 10, briten: 12, mitra: 6 }, make: ["feigen", "oel"], want: ["glas", "keramik"],
      note: "Feigengärten am langen Strand. Die Fischer zählen nachts die fremden Segel." },
    Apolakkia: { f: { griechen: 72, mentese: 10, osmanen: 10, mitra: 8 }, make: ["feigen", "honig"], want: ["seide", "salz"],
      note: "Unter der großen Platane wird verhandelt, gestritten und geheiratet." },
    Salakos: { f: { griechen: 66, italiener: 16, wehrmacht: 10, johanniter: 4, telchinen: 4 }, make: ["holz", "harz", "honig"], want: ["salz", "glas"],
      note: "Quellen und Wälder am Profitis Ilias. Oben am Profitis Ilias bauen die Italiener ihre Sommerhäuser." },
    Faliraki: { f: { griechen: 46, italiener: 20, telchinen: 12, venezianer: 10, genuesen: 8, mitra: 4 }, make: ["feigen", "salz"], want: ["leder", "wein"],
      note: "Ein Fischerstrand nahe der heilenden Quellen von Kallithea. 1929 bauen die Italiener dort ein Thermalbad, später ein Drehort für Navarone." },
  };
  // the old Greek towns of the Hellenes: their ruins are haunted
  const ANTIK = ["Lindos", "Kritinia", "Ialysos", "Faliraki", "Rhodos"];

  let ctx = null, places = [];
  function init(c) { ctx = c; places = (c.places || []).map((p) => ({ name: p.name, lat: p.lat, lon: p.lon })); build(); }
  function profile(name) {
    if (HUBS[name]) return HUBS[name];
    const p = places.find((x) => x.name === name); if (!p) return HUBS.Rhodos;
    let best = null; for (const n of Object.keys(HUBS)) { const h = places.find((x) => x.name === n); if (h) { const d = km(p, h); if (!best || d < best.d) best = { n, d }; } }
    const h = HUBS[best ? best.n : "Rhodos"], f = {};
    for (const [k, v] of Object.entries(h.f)) f[k] = k === "griechen" ? v + 30 : v;
    return { f, make: h.make, want: h.want, note: `Ein Dorf im Umland von ${best ? best.n : "Rhodos"}.`, near: best && best.n };
  }
  const shares = (pf) => { const sum = Object.values(pf.f).reduce((a, b) => a + b, 0); return Object.entries(pf.f).map(([k, v]) => [k, v / sum]).sort((a, b) => b[1] - a[1]); };
  function nearest(at) {
    return places.map((p) => ({ ...p, d: km(at, p) })).sort((a, b) => a.d - b.d);
  }

  /* ---------------- Jobs ---------------- */
  const DIST = [{ km: 0.5, m: 1 }, { km: 1, m: 1.5 }, { km: 3, m: 2.5 }, { km: 8, m: 4 }];
  function offers(town) {
    const pf = profile(town), rnd = seeded(town + today()), out = [];
    let sh = shares(pf).filter(([k]) => JOBS[k] && !FACTIONS[k].noJobs); const tot = sh.reduce((a, [, v]) => a + v, 0); sh = sh.map(([k, v]) => [k, v / tot]);
    for (let i = 0; i < 4; i++) {
      let r = rnd(), fac = sh[0][0]; for (const [k, v] of sh) { if (r < v) { fac = k; break; } r -= v; }
      const pool = JOBS[fac].filter((j) => !j.antik || ANTIK.includes(town) || ANTIK.includes(pf.near));
      const tpl = pool[Math.floor(rnd() * pool.length)], N = NAMES[Math.floor(rnd() * NAMES.length)];
      const fill = (s) => s.replace(/\{N\}/g, N);
      const id = `${town}:${today()}:${i}`;
      if (out.some((o) => o.name === fill(tpl.name))) continue;
      out.push({ id, town, fac, name: fill(tpl.name), text: fill(tpl.text), exp: tpl.exp, gold: tpl.gold, hurt: tpl.hurt,
        foes: tpl.foes ? tpl.foes.map((f) => (typeof f === "string" ? f : { ...f, name: fill(f.name) })) : null });
    }
    return out;
  }
  function take(offer, choice) {
    const s = window.Spiel.get();
    if (s.jobs.filter((j) => !j.story).length >= 3) return "Du hast schon drei Aufträge. Erledige oder gib einen auf.";
    const at = ctx.where(), spot = ctx.landNear(at, choice.km);
    if (!spot) return "Hier findet sich kein Weg dorthin.";
    const town = places.find((p) => p.name === offer.town), onSite = town && km(at, town) < 2;
    s.jobs.push({ ...offer, km: choice.km, mult: choice.m * (onSite ? 1.25 : 1), onSite, lat: spot.lat, lon: spot.lon, since: Date.now() });
    s.log["job:" + offer.id] = 1; window.Spiel.save(s);
    ctx.changed(); return null;
  }
  function drop(id) { const s = window.Spiel.get(); s.jobs = s.jobs.filter((j) => j.id !== id); window.Spiel.save(s); ctx.changed(); }
  function finish(job) {
    const s0 = window.Spiel.get(), rep = s0.rep[job.fac] || 0, bonus = 1 + clamp(rep, 0, 100) / 200;
    const exp = Math.round(job.exp * job.mult * bonus), gold = Math.round(job.gold * job.mult * bonus);
    const s = window.Spiel.reward(exp, gold);
    s.jobs = s.jobs.filter((j) => j.id !== job.id);
    s.rep[job.fac] = clamp((s.rep[job.fac] || 0) + 8, -100, 100);
    const rival = FACTIONS[job.fac].rival; if (rival) s.rep[rival] = clamp((s.rep[rival] || 0) - 3, -100, 100);
    if (job.hurt) s.rep[job.hurt] = clamp((s.rep[job.hurt] || 0) - 6, -100, 100);
    if (job.story) s.quests[job.story] = { ...(s.quests[job.story] || {}), done: today() };
    s.log.jobsDone = (s.log.jobsDone || 0) + 1; s.log["fac:" + job.fac] = (s.log["fac:" + job.fac] || 0) + 1;
    delete s.up; window.Spiel.save(s); ctx.changed();
    return { exp, gold, up: s.level };
  }
  // you reached a job's spot: a fight, or simply done
  function arrive(job, done) {
    if (!job.foes) { const r = finish(job); done(true, r); return; }
    const L = window.Spiel.get().level, tier = 1 + Math.floor((L - 1) / 3);
    window.Kampf.start({
      title: `${FACTIONS[job.fac].icon} ${job.name}`, foes: job.foes, tier, boss: !!job.boss, at: { lat: job.lat, lon: job.lon },
      loot: { text: `Auftrag für ${FACTIONS[job.fac].name} erfüllt. ×${job.mult.toString().replace(".", ",")} für ${fmtKm(job.km)} Weg.` },
      onWin: () => { const r = finish(job); done(true, r); },
      onLose: (why) => done(false, why),
    });
  }

  /* ---------------- Market ---------------- */
  function prices(town) {
    const pf = profile(town), rnd = seeded("markt" + town + today()), s = window.Spiel.get(), out = {};
    const top = shares(pf)[0][0], friend = (s.rep[top] || 0) >= 50 ? 0.9 : 1;
    for (const [k, g] of Object.entries(GOODS)) {
      const f = pf.make.includes(k) ? 0.6 : pf.want.includes(k) ? 1.45 : 1, j = 0.85 + rnd() * 0.3;
      const buy = Math.max(1, Math.round(g.base * f * j * friend));
      out[k] = { buy, sell: Math.max(1, Math.round(g.base * f * j * 0.8)), make: pf.make.includes(k), want: pf.want.includes(k) };
    }
    return out;
  }
  const CAP = 20;
  const have = (s, k) => (GOODS[k].use ? s[GOODS[k].use] || 0 : s.inv[k] || 0);
  const load = (s) => Object.values(s.inv).reduce((a, b) => a + b, 0);
  function trade(town, k, n) {
    const s = window.Spiel.get(), p = prices(town)[k], g = GOODS[k];
    if (n > 0) {
      if (s.gold < p.buy) return "Zu wenig Gold.";
      if (!g.use && load(s) >= CAP) return `Dein Bündel ist voll (${CAP} Stück).`;
      s.gold -= p.buy; if (g.use) s[g.use] = (s[g.use] || 0) + 1; else s.inv[k] = (s.inv[k] || 0) + 1;
    } else {
      if (have(s, k) <= 0) return "Davon hast du nichts.";
      s.gold += p.sell; if (g.use) s[g.use]--; else { s.inv[k]--; if (!s.inv[k]) delete s.inv[k]; }
    }
    window.Spiel.save(s); ctx.changed(); return null;
  }

  /* ---------------- The panel ---------------- */
  const css = `
  #stadt { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; background: rgba(20,12,6,0.55); font: 16px/1.35 "IM Fell English", Georgia, serif; }
  #stadt .sh { margin-top: auto; max-height: 92%; display: flex; flex-direction: column; background: linear-gradient(#f3e6c6, #e6d3a6); color: #2b1d12; border-radius: 16px 16px 0 0; box-shadow: 0 -6px 24px rgba(0,0,0,0.5); padding-bottom: env(safe-area-inset-bottom); }
  #stadt header { display: flex; align-items: center; gap: 10px; padding: 12px 14px 6px; }
  #stadt header h2 { margin: 0; font: 800 20px "Cinzel", serif; flex: 1; }
  #stadt header small { display: block; font: italic 14px "IM Fell English", serif; color: #6a5030; }
  #stadt header button, #stadt select { font: 600 15px "Cinzel", serif; border: 1px solid #b9925a; background: #fff8e6; border-radius: 8px; padding: 6px 10px; color: #2b1d12; }
  #stadt .tabs { display: flex; gap: 4px; padding: 0 10px; border-bottom: 2px solid #b9925a; }
  #stadt .tabs button { flex: 1; border: 0; background: none; font: 700 13px "Cinzel", serif; padding: 9px 2px; color: #6a5030; border-bottom: 3px solid transparent; margin-bottom: -2px; }
  #stadt .tabs button.on { color: #2b1d12; border-color: #8e2a1c; }
  #stadt .body { overflow: auto; padding: 10px 14px 16px; }
  #stadt .note { font-style: italic; color: #5a4024; margin: 4px 0 10px; }
  #stadt .card { background: rgba(255,250,235,0.7); border: 1px solid #c9a873; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
  #stadt .card b { font: 700 16px "Cinzel", serif; }
  #stadt .fac { display: inline-flex; align-items: center; gap: 4px; font: 700 12px "Cinzel", serif; color: #fff; border-radius: 10px; padding: 2px 8px; }
  #stadt .bar { height: 7px; border-radius: 4px; background: rgba(0,0,0,0.12); overflow: hidden; margin: 4px 0; }
  #stadt .bar i { display: block; height: 100%; }
  #stadt .rw { font: 600 14px "Figtree", sans-serif; color: #6a3a14; margin: 6px 0; }
  #stadt .dist { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-top: 8px; }
  #stadt .dist button { border: 1px solid #b9925a; background: linear-gradient(#2a6fa8, #1d4f7c); color: #fff; border-radius: 8px; padding: 6px 2px; font: 700 13px "Figtree", sans-serif; line-height: 1.15; }
  #stadt .dist button span { display: block; font-size: 11px; color: #ffe08a; }
  #stadt .goods { width: 100%; border-collapse: collapse; font: 14px "Figtree", sans-serif; }
  #stadt .goods td { padding: 6px 3px; border-bottom: 1px dashed #c9a873; }
  #stadt .goods td.n { font-weight: 700; }
  #stadt .goods small { color: #4a7a3a; font-weight: 700; } #stadt .goods small.w { color: #8e2a1c; }
  #stadt .goods button { width: 34px; height: 30px; border-radius: 7px; border: 1px solid #b9925a; background: #fff8e6; font: 700 15px "Figtree", sans-serif; }
  #stadt .act { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 6px; font: 14px "Figtree", sans-serif; }
  #stadt .act button { border: 1px solid #8e2a1c; color: #8e2a1c; background: none; border-radius: 8px; padding: 5px 10px; font: 600 13px "Figtree", sans-serif; }
  #stadt .purse { font: 700 14px "Figtree", sans-serif; color: #6a3a14; }`;
  let tab = "auftraege", town = null, el = null;
  function build() {
    if ($("#stadtCss")) return;
    const st = document.createElement("style"); st.id = "stadtCss"; st.textContent = css; document.head.append(st);
  }
  function open(which) {
    const near = nearest(ctx.where());
    town = which || (town && near.find((p) => p.name === town) ? town : near[0].name);
    if (!el) { el = document.createElement("div"); el.id = "stadt"; document.body.append(el); el.addEventListener("click", (e) => { if (e.target === el) close(); }); }
    el.hidden = false; render();
  }
  function close() { if (el) el.hidden = true; }
  const isOpen = () => !!el && !el.hidden;
  const facTag = (k) => `<span class="fac" style="background:${FACTIONS[k].color}">${FACTIONS[k].icon} ${FACTIONS[k].name}</span>`;
  function render() {
    const at = ctx.where(), near = nearest(at), here = near.find((p) => p.name === town), d = here ? here.d : 0, pf = profile(town), s = window.Spiel.get();
    el.innerHTML = `<div class="sh"><header><div style="flex:1"><h2>🏰 ${town}</h2><small>${fmtKm(d)} entfernt · ${pf.note}</small></div>
      <button type="button" data-x>✕</button></header>
      <div style="padding:0 14px 8px;display:flex;gap:8px;align-items:center"><select id="stOrt">${near.slice(0, 12).map((p) => `<option ${p.name === town ? "selected" : ""}>${p.name}</option>`).join("")}</select><span class="purse">🪙 ${s.gold} · Stufe ${s.level}</span></div>
      <div class="tabs">${[["auftraege", "Aufträge"], ["unterwegs", `Unterwegs ${s.jobs.length ? "(" + s.jobs.length + ")" : ""}`], ["markt", "Markt"], ["fraktionen", "Fraktionen"]].map(([k, t]) => `<button type="button" data-t="${k}" class="${tab === k ? "on" : ""}">${t}</button>`).join("")}</div>
      <div class="body">${body(d, pf, s)}</div></div>`;
    el.querySelector("[data-x]").onclick = close;
    el.querySelector("#stOrt").onchange = (e) => { town = e.target.value; render(); };
    el.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => { tab = b.dataset.t; render(); });
    el.querySelectorAll("[data-take]").forEach((b) => b.onclick = () => {
      const o = offers(town).find((x) => x.id === b.dataset.take), err = take(o, DIST[+b.dataset.d]);
      if (err) ctx.toast(err); else { ctx.toast(`Angenommen: ${o.name}. Das Ziel liegt ${fmtKm(DIST[+b.dataset.d].km)} von dir.`); tab = "unterwegs"; render(); }
    });
    el.querySelectorAll("[data-drop]").forEach((b) => b.onclick = () => { if (confirm("Diesen Auftrag aufgeben?")) { drop(b.dataset.drop); render(); } });
    el.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { close(); ctx.focus(s.jobs.find((j) => j.id === b.dataset.go)); });
    el.querySelectorAll("[data-buy],[data-sell]").forEach((b) => b.onclick = () => { const err = trade(town, b.dataset.buy || b.dataset.sell, b.dataset.buy ? 1 : -1); if (err) ctx.toast(err); render(); });
  }
  function body(d, pf, s) {
    if (tab === "auftraege") {
      const list = offers(town).filter((o) => !s.log["job:" + o.id]);
      return `<p class="note">Das Auftragsbrett von ${town}. Das Ziel erscheint in deiner Nähe, so weit weg, wie du wählst. Je weiter du gehst, desto mehr zahlt es.${d < 2 ? " Vor Ort angenommen: ×1,25." : ""}</p>` +
        (list.length ? list.map((o) => `<div class="card">${facTag(o.fac)}<div><b>${o.name}</b></div><div>${o.text}</div>
          <div class="rw">${o.foes ? "⚔ Kampf" : "🧭 Weg"} · ab ${o.exp} EXP · ${o.gold} Gold${s.rep[o.fac] > 0 ? ` · Ruf +${Math.round(clamp(s.rep[o.fac], 0, 100) / 2)} %` : ""}</div>
          <div class="dist">${DIST.map((c, i) => `<button type="button" data-take="${o.id}" data-d="${i}">${fmtKm(c.km)}<span>×${String(c.m).replace(".", ",")}</span></button>`).join("")}</div></div>`).join("")
          : `<p class="note">Für heute ist das Brett leer. Morgen gibt es neue Aufträge, oder schau in einem anderen Ort.</p>`);
    }
    if (tab === "unterwegs") {
      if (!s.jobs.length) return `<p class="note">Du hast keine Aufträge angenommen.</p>`;
      const at = ctx.where();
      return s.jobs.map((j) => `<div class="card">${facTag(j.fac)}<div><b>${j.name}</b></div><div>${j.text}</div>
        <div class="rw">Ziel in ${fmtKm(km(at, j))} · ${j.foes ? "⚔ Kampf" : "🧭 Weg"} · ×${j.mult.toString().replace(".", ",")} · von ${j.town}</div>
        <div class="act"><button type="button" data-go="${j.id}" style="border-color:#1d4f7c;color:#1d4f7c">Zeigen</button><button type="button" data-drop="${j.id}">Aufgeben</button></div></div>`).join("");
    }
    if (tab === "markt") {
      if (d > 2) return `<p class="note">Der Markt von ${town} ist nur vor Ort offen. Noch ${fmtKm(d)} bis dorthin.</p><p class="note">Was hier billig ist (erzeugt): ${pf.make.map((k) => GOODS[k] ? GOODS[k].name : k).join(", ")}.<br>Was hier teuer bezahlt wird (gesucht): ${pf.want.map((k) => GOODS[k] ? GOODS[k].name : k).join(", ")}.</p>`;
      const pr = prices(town);
      return `<p class="note">Kaufe, wo etwas gemacht wird, verkaufe, wo es gesucht wird. Dein Bündel fasst ${CAP} Stück (jetzt ${load(s)}). Feigen und Wein trägst du extra, für den Kampf.</p>
        <table class="goods">${Object.entries(GOODS).map(([k, g]) => `<tr><td>${g.icon}</td><td class="n">${g.name}${pr[k].make ? ' <small>erzeugt</small>' : pr[k].want ? ' <small class="w">gesucht</small>' : ""}<br><span style="font-weight:400">Kauf ${pr[k].buy} · Verkauf ${pr[k].sell} · du hast ${have(s, k)}</span></td>
          <td><button type="button" data-sell="${k}">−</button></td><td><button type="button" data-buy="${k}">+</button></td></tr>`).join("")}</table>`;
    }
    return `<p class="note">Wer in ${town} das Sagen hatte und hat, durch alle Zeiten, und wie man dort über dich spricht.</p>` + shares(pf).map(([k, v]) => { const F = FACTIONS[k], hid = F.hidden && !(s.rep[k] || s.log["fac:" + k]);
      return `<div class="card">${facTag(k)} <small style="color:#6a5030;font:italic 13px 'IM Fell English',serif">${F.era}</small>
      <div style="margin-top:6px">${hid ? "Man spricht nicht darüber. Man senkt die Stimme, wenn grüne Schleier vorübergehen." : F.desc}</div>
      ${F.noJobs ? `<div class="rw" style="color:#8e2a1c">Gegner · vergibt keine Aufträge</div>` : ""}
      <div class="rw">Einfluss in ${town}: ${hid ? "verborgen" : Math.round(v * 100) + " %"}</div><div class="bar"><i style="width:${hid ? 0 : Math.round(v * 100)}%;background:${F.color}"></i></div>
      <div class="rw">Dein Ruf: ${s.rep[k] || 0}</div><div class="bar"><i style="width:${clamp(50 + (s.rep[k] || 0) / 2, 0, 100)}%;background:${(s.rep[k] || 0) < 0 ? "#8e2a1c" : "#4a7a3a"}"></i></div></div>`; }).join("");
  }

  window.Staedte = { init, open, close, isOpen, nearest, profile, offers, arrive, drop, FACTIONS, GOODS, HUBS, fmtKm, km };
})();
