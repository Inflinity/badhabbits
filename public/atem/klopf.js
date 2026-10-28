/* Klopf: knocks on the back of the phone, felt by its motion sensors, for blind control.
   The screen lies on your chest; a knock is a short, hard jolt across the phone (its z axis).
   Tuned on a real log (Pixel, Chrome, 28.10.2026): the quiet level of the chest is about
   0.1 m/s², a knock 0.4–4 m/s², the phone rings on for 50–130 ms after it, and the two knocks
   of a double tap come 0.18–0.27 s apart. On that log: 17 of 18 right, no false alarm at rest.

   Klopf.start((g) => …) calls back once per gesture, about 0.45 s after the last knock:
   g = { kind: "tipp" | "doppel" | "mehr", n, t (first knock, performance time in s), v (strongest) }.
   Klopf.stop() ends it. Klopf.feed(t, z) lets tests push values in by hand. */
(function () {
  "use strict";
  const REFR = 0.16;    // ringing after a knock belongs to the same knock
  const GMAX = 0.45;    // the next knock of a double tap must come within this
  const REL = 0.3;      // a knock counts if it is at least this strong next to the strongest one
  const T_MIN = 0.35, T_MAX = 1.2;
  const now = () => performance.now() / 1000;
  let cb = null, on = false, prevRaw = null, hp = 0, hasLin = null;
  let last2 = [null, null], quiet = [], thr = T_MIN, nextThr = 0, gest = null, quietUntil = 0;

  function feed(t, z) {
    const v = Math.abs(z);
    // the quiet level: median of the last 1.5 s, leaving out the time around knocks
    if (t > quietUntil) quiet.push([t, v]);
    while (quiet.length && t - quiet[0][0] > 1.5) quiet.shift();
    if (t > nextThr && quiet.length > 20) {
      nextThr = t + 0.25;
      const s = quiet.map((q) => q[1]).sort((a, b) => a - b);
      thr = Math.min(T_MAX, Math.max(T_MIN, s[Math.floor(s.length / 2)] * 3.5));
    }
    // a peak, one sample late: the middle one of the last three, above the threshold
    const [a, b] = last2; last2 = [b, [t, v]];
    if (a && b && b[1] > thr && b[1] >= a[1] && b[1] >= v) knock(b[0], b[1]);
    // the gesture is complete once no further knock has come
    if (gest && t - gest.k[gest.k.length - 1].t > GMAX) done();
  }
  function knock(t, v) {
    quietUntil = t + 0.6;
    if (!gest) { gest = { k: [{ t, v }] }; return; }
    const lastK = gest.k[gest.k.length - 1];
    if (t - lastK.t < REFR) { if (v > lastK.v) lastK.v = v; return; }
    gest.k.push({ t, v });
  }
  function done() {
    const g = gest; gest = null;
    const m = Math.max(...g.k.map((k) => k.v)), k = g.k.filter((x) => x.v >= REL * m);
    const kind = k.length === 1 ? "tipp" : k.length === 2 ? "doppel" : "mehr";
    if (cb) cb({ kind, n: k.length, t: k[0].t, v: +m.toFixed(2), gaps: k.slice(1).map((x, i) => +(x.t - k[i].t).toFixed(3)) });
  }
  function onMotion(e) {
    const l = e.acceleration, g = e.accelerationIncludingGravity, t = now();
    if (hasLin === null) hasLin = !!(l && l.z != null);
    let z;
    if (hasLin && l && l.z != null) z = l.z;
    else if (g && g.z != null) { if (prevRaw == null) prevRaw = g.z; hp = 0.9 * (hp + g.z - prevRaw); prevRaw = g.z; z = hp; }
    else return;
    feed(t, z);
  }
  function start(f) { cb = f; if (!on) { on = true; window.addEventListener("devicemotion", onMotion); } }
  function stop() { on = false; cb = null; gest = null; window.removeEventListener("devicemotion", onMotion); }
  window.Klopf = { start, stop, feed, get threshold() { return thr; }, get linear() { return hasLin; } };
})();
