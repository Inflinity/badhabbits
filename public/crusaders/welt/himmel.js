/* Crusaders · the sky and the sea. Loaded after the world's own script and uses its globals
   (THREE, scene, camera, water, maskTex, hemi, sun, pl, pan, camDist, heightAt, HOUSES, W0, D0, W1, D1).

   - The sea: one shader, cheap. Small waves made of a few sine trains tilt the surface; the sky is
     mirrored in it by Fresnel, the sun glints, the shallows from the coast mask glow through, and
     foam runs up the shore. Far off it melts into the haze of the horizon.
   - The sky: a dome with a real horizon, the sun where it really stands over Rhodes right now,
     dawn and dusk, night with stars and lit windows in the towns.
   - The weather: the real weather on Rhodes (open-meteo.com, no key, only the island's coordinates
     are sent), with clouds, rain and thunderstorms. For trying: welt/?wetter=gewitter&zeit=21 */
(function () {
  "use strict";
  const LAT = 36.2, LON = 28.0;
  const q = new URLSearchParams(location.search);
  const C = (h) => new THREE.Color(h);
  const W = { cover: 0.15, rain: 0, storm: 0, wind: 12, windDir: 300, temp: null, code: 0, src: "" };
  let sunDir = new THREE.Vector3(0, 1, 0), night = 0, flash = 0, nextBolt = 3;

  /* ---------------- Where the sun stands ---------------- */
  function sunNow(date) {
    const d = date.getTime() / 864e5 + 2440587.5 - 2451545, r = Math.PI / 180;
    const g = (357.529 + 0.98560028 * d) * r, qq = 280.459 + 0.98564736 * d;
    const L = (qq + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r, e = (23.439 - 0.00000036 * d) * r;
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = (18.697374558 + 24.06570982441908 * d) * 15 * r, H = gmst + LON * r - ra, lat = LAT * r;
    const east = -Math.cos(dec) * Math.sin(H), north = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(H) * Math.sin(lat);
    const up = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(H) * Math.cos(lat);
    return new THREE.Vector3(east, up, -north).normalize();      // world: x east, y up, z south
  }
  function clock() {
    const d = new Date(); if (q.get("zeit") != null) { const h = parseFloat(q.get("zeit")); d.setUTCHours(Math.floor(h) - 2, (h % 1) * 60, 0, 0); }      // Rhodes is UTC+2/+3
    return d;
  }

  /* ---------------- Colours of the day, by the sun's height in degrees ---------------- */
  const KEYS = [
    { e: -18, zen: "#03060f", hor: "#0d1424", sun: "#000000", si: 0, hs: "#4a5c88", hg: "#0e1016", hi: 0.32 },
    { e: -7, zen: "#0e1a3a", hor: "#2c3050", sun: "#000000", si: 0, hs: "#4a5a88", hg: "#141418", hi: 0.3 },
    { e: -1, zen: "#283f78", hor: "#d27a5a", sun: "#ff7a3a", si: 0.15, hs: "#8a80a8", hg: "#3a2a24", hi: 0.42 },
    { e: 6, zen: "#4a6eae", hor: "#f0b884", sun: "#ffb46a", si: 0.65, hs: "#d8c8c0", hg: "#5a5040", hi: 0.55 },
    { e: 20, zen: "#3f78bc", hor: "#bcd6e8", sun: "#fff0d8", si: 0.95, hs: "#e6f0ff", hg: "#6a7458", hi: 0.62 },
    { e: 90, zen: "#2f6cb4", hor: "#b4d2e8", sun: "#fff6e8", si: 1.05, hs: "#eef4ff", hg: "#6a7a5a", hi: 0.66 },
  ];
  const cA = new THREE.Color(), cB = new THREE.Color();
  function palette(elev) {
    let i = 0; while (i < KEYS.length - 2 && elev > KEYS[i + 1].e) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = Math.min(1, Math.max(0, (elev - a.e) / (b.e - a.e)));
    const mix = (k) => cA.set(a[k]).clone().lerp(cB.set(b[k]), t);
    return { zen: mix("zen"), hor: mix("hor"), sun: mix("sun"), si: a.si + (b.si - a.si) * t, hs: mix("hs"), hg: mix("hg"), hi: a.hi + (b.hi - a.hi) * t };
  }

  /* ---------------- The dome of the sky ---------------- */
  const skyU = { uSun: { value: new THREE.Vector3() }, uZen: { value: C("#3f78bc") }, uHor: { value: C("#bcd6e8") }, uSunCol: { value: C("#fff") },
    uNight: { value: 0 }, uCloud: { value: 0 }, uFlash: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vD; uniform vec3 uSun, uZen, uHor, uSunCol; uniform float uNight, uCloud, uFlash;
      float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vD); float h = d.y;
        vec3 col = mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.45));
        if (h < 0.0) col = mix(uHor, uHor * 0.85, clamp(-h * 6.0, 0.0, 1.0));
        float s = max(dot(d, uSun), 0.0);
        col += uSunCol * (pow(s, 7.0) * 0.18 + pow(s, 120.0) * 0.5) * (1.0 - uCloud * 0.8);       // the glow round the sun
        col += uSunCol * smoothstep(0.99955, 0.9998, s) * 3.0 * (1.0 - uCloud);                    // the sun itself
        if (uNight > 0.01 && h > 0.0) {                                                           // stars
          vec3 c = floor(d * 380.0); float st = h3(c);
          col += vec3(0.9, 0.95, 1.0) * smoothstep(0.9965, 1.0, st) * uNight * (1.0 - uCloud) * smoothstep(0.0, 0.15, h) * (0.6 + 0.4 * sin(st * 900.0));
        }
        col += vec3(0.8, 0.85, 1.0) * uFlash * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  sky.renderOrder = -10; sky.frustumCulled = false;

  /* ---------------- The sea ---------------- */
  const seaU = { uT: { value: 0 }, uSun: skyU.uSun, uSunCol: skyU.uSunCol, uZen: skyU.uZen, uHor: skyU.uHor, uFlash: skyU.uFlash,
    uCam: { value: new THREE.Vector3() }, uFogN: { value: 30 }, uFogF: { value: 120 }, uLight: { value: 1 }, uRough: { value: 1 },
    uMask: { value: null }, uBox: { value: new THREE.Vector4() } };
  const seaMat = new THREE.ShaderMaterial({
    transparent: true, uniforms: seaU,
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; varying vec3 vW;
      uniform float uT, uFogN, uFogF, uLight, uRough, uFlash; uniform vec3 uSun, uSunCol, uZen, uHor, uCam; uniform sampler2D uMask; uniform vec4 uBox;
      // a few trains of waves, long to short; the short ones fade with distance so nothing shimmers
      vec2 slope(vec2 p, float dist) {
        vec2 s = vec2(0.0);
        vec2 D[6]; D[0] = vec2(0.94, 0.34); D[1] = vec2(0.6, 0.8); D[2] = vec2(-0.3, 0.95); D[3] = vec2(0.98, -0.2); D[4] = vec2(0.2, -0.98); D[5] = vec2(-0.85, 0.5);
        float K[6]; K[0] = 38.0; K[1] = 67.0; K[2] = 113.0; K[3] = 197.0; K[4] = 331.0; K[5] = 560.0;
        for (int i = 0; i < 6; i++) {
          float k = K[i], f = 1.0 / (1.0 + dist * k * 0.012);
          float ph = dot(D[i], p) * k + uT * sqrt(9.81 * k * 0.001) * 6.0;
          s += D[i] * cos(ph) * (0.055 - float(i) * 0.006) * f * uRough;
        }
        return s;
      }
      void main() {
        vec3 toCam = uCam - vW; float dist = length(toCam); vec3 V = toCam / dist;
        vec2 sl = slope(vW.xz, dist);
        vec3 N = normalize(vec3(-sl.x, 1.0, -sl.y));
        vec2 uv = vec2((vW.x - uBox.x) / uBox.z, 1.0 - (vW.z - uBox.y) / uBox.w);
        vec4 mk = texture2D(uMask, clamp(uv, 0.0, 1.0)); if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) mk = vec4(0.0);
        float sh = clamp(mk.b * 1.4, 0.0, 1.0);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 skyc = mix(uHor, uZen, pow(clamp(R.y, 0.0, 1.0), 0.45));
        float up = max(uSun.y, 0.0);
        vec3 deep = vec3(0.02, 0.10, 0.20), shal = vec3(0.16, 0.55, 0.58);
        vec3 body = mix(deep, shal, sh * sh) * (0.25 + 0.75 * uLight) + uHor * 0.04;
        vec3 col = mix(body, skyc, clamp(fres * (1.0 - sh * 0.45), 0.0, 1.0));
        float rs = max(dot(R, uSun), 0.0);
        col += uSunCol * (pow(rs, 500.0) * 4.0 + pow(rs, 40.0) * 0.12) * smoothstep(-0.02, 0.05, uSun.y) * uLight;
        // foam where the sea meets the land, running up the shore
        float shore = smoothstep(0.72, 0.97, mk.b) * (1.0 - step(0.5, mk.r));
        float wv = sin(mk.b * 46.0 - uT * 1.4 + sin(vW.x * 23.0 + vW.z * 17.0) * 1.5) * 0.5 + 0.5;
        col = mix(col, vec3(0.92, 0.95, 0.96) * (0.3 + 0.7 * uLight), shore * smoothstep(0.6, 0.95, wv) * 0.65 * (1.0 / (1.0 + dist * 0.3)));
        col += vec3(0.7, 0.75, 0.9) * uFlash * 0.35;
        float a = mix(0.97, 0.78, sh);
        float fg = smoothstep(uFogN, uFogF, dist);
        col = mix(col, uHor, fg); a = mix(a, 1.0, fg);
        gl_FragColor = vec4(col, a);
      }`,
  });

  /* ---------------- Clouds: low and flat-shaded, like the hills ---------------- */
  const PUFFS = 9, MAXC = 46;
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.92, depthWrite: false });
  const clouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), cloudMat, MAXC * PUFFS);
  clouds.frustumCulled = false; clouds.renderOrder = 2;
  const CL = [];
  for (let i = 0; i < MAXC; i++) {
    const puffs = []; for (let j = 0; j < PUFFS; j++) puffs.push([(Math.random() - 0.5) * 2.2, (Math.random() - 0.3) * 0.35, (Math.random() - 0.5) * 1.2, 0.35 + Math.random() * 0.45]);
    CL.push({ x: (Math.random() - 0.5) * 80, z: (Math.random() - 0.5) * 80, y: 2.2 + Math.random() * 0.9, s: 0.6 + Math.random() * 0.9, puffs });
  }
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
  function cloudStep(dt, fx, fz) {
    const n = Math.round(MAXC * Math.min(1, W.cover * 1.1)), wr = (W.windDir * Math.PI) / 180, ws = W.wind / 3600 * 4;    // drift a little faster than real
    const wx = -Math.sin(wr) * ws, wz = Math.cos(wr) * ws;
    let k = 0;
    for (let i = 0; i < MAXC; i++) {
      const c = CL[i]; c.x += wx * dt; c.z += wz * dt;
      // keep them round where you look: wrap at 40 km
      if (c.x - fx > 40) c.x -= 80; if (c.x - fx < -40) c.x += 80; if (c.z - fz > 40) c.z -= 80; if (c.z - fz < -40) c.z += 80;
      if (i >= n) continue;
      const low = W.storm ? 0.6 : 0;
      for (const [px, py, pz, ps] of c.puffs) {
        v3.set(c.x + px * c.s, c.y - low + py * c.s, c.z + pz * c.s); const k2 = ps * c.s * (W.storm ? 1.4 : 1); sc.set(k2 * 1.25, k2 * 0.5, k2); m4.compose(v3, qt, sc); clouds.setMatrixAt(k++, m4);
      }
    }
    clouds.count = k; clouds.instanceMatrix.needsUpdate = true;
    // looking from high above, the clouds thin so the island stays visible
    cloudMat.opacity = 0.92 * Math.min(1, Math.max(0.12, 1 - (camera.position.y - 1.6) / 2.5));
  }

  /* ---------------- Rain and lightning ---------------- */
  const DROPS = 1400, rainPos = new Float32Array(DROPS * 6), rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb8c4d4, transparent: true, opacity: 0.45 }));
  rain.frustumCulled = false;
  const drops = []; for (let i = 0; i < DROPS; i++) drops.push([Math.random(), Math.random(), Math.random()]);
  function rainStep(dt, fx, fz) {
    rain.visible = W.rain > 0.02; if (!rain.visible) return;
    const box = Math.min(24, Math.max(0.25, camDist * 1.6)), h = box * 1.2, len = h * 0.035, wr = (W.windDir * Math.PI) / 180, slant = 0.15 + W.wind / 120;
    const sx = -Math.sin(wr) * slant, sz = Math.cos(wr) * slant, n = Math.round(DROPS * Math.min(1, W.rain));
    rain.geometry.setDrawRange(0, n * 2);
    for (let i = 0; i < n; i++) {
      const d = drops[i]; d[1] -= dt * 1.6; if (d[1] < 0) { d[1] += 1; d[0] = Math.random(); d[2] = Math.random(); }
      const x = fx + (d[0] - 0.5) * box * 2, z = fz + (d[2] - 0.5) * box * 2, y = d[1] * h, o = i * 6;
      rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z; rainPos[o + 3] = x + sx * len; rainPos[o + 4] = y + len; rainPos[o + 5] = z + sz * len;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }
  const boltGeo = new THREE.BufferGeometry(), bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: 0xf4f6ff, transparent: true }));
  bolt.frustumCulled = false; bolt.visible = false;
  function lightning(dt, fx, fz) {
    flash = Math.max(0, flash - dt * 5);
    if (W.storm) {
      nextBolt -= dt;
      if (nextBolt < 0) {
        nextBolt = 3 + Math.random() * 9; flash = 1;
        const r = Math.min(20, camDist * 3 + 1), x0 = fx + (Math.random() - 0.5) * r * 2, z0 = fz - r * (0.4 + Math.random() * 0.6), pts = [];
        let x = x0, z = z0; const top = 2.2, bottom = Math.max(0, heightAt(x0, z0));
        for (let i = 0; i <= 12; i++) { pts.push(new THREE.Vector3(x, top - ((top - bottom) * i) / 12, z)); x += (Math.random() - 0.5) * 0.25; z += (Math.random() - 0.5) * 0.25; }
        boltGeo.setFromPoints(pts);
      }
    }
    bolt.visible = flash > 0.35; bolt.material.opacity = flash;
  }

  /* ---------------- Lights in the towns at night ---------------- */
  let lamps = null;
  function makeLamps() {
    const pts = [];
    // a lit window on one side of every other house
    for (const [x, y, z, s, ry] of (typeof HOUSES !== "undefined" ? HOUSES : [])) {
      if (Math.random() < 0.45) continue;
      const side = Math.floor(Math.random() * 4), a = ry + (side * Math.PI) / 2, off = (side % 2 ? 0.0115 : 0.0095) * s;
      pts.push(x + Math.sin(a) * off, y + 0.008 * s, z + Math.cos(a) * off);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const cv = document.createElement("canvas"); cv.width = cv.height = 32; const c = cv.getContext("2d"), gr = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(255,230,170,1)"); gr.addColorStop(0.3, "rgba(255,180,90,0.6)"); gr.addColorStop(1, "rgba(255,150,60,0)"); c.fillStyle = gr; c.fillRect(0, 0, 32, 32);
    lamps = new THREE.Points(g, new THREE.PointsMaterial({ size: 10 * Math.min(2, devicePixelRatio || 1), sizeAttenuation: false, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
    scene.add(lamps);
  }

  /* ---------------- The real weather on Rhodes ---------------- */
  const PRESET = { klar: [0.05, 0, 0], wolken: [0.75, 0, 0], regen: [0.95, 0.7, 0], gewitter: [1, 1, 1] };
  async function weather() {
    const p = q.get("wetter");
    if (p && PRESET[p]) { [W.cover, W.rain, W.storm] = PRESET[p]; W.src = p; return; }
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,cloud_cover,precipitation,weather_code,wind_speed_10m,wind_direction_10m`);
      const c = (await r.json()).current;
      W.cover = c.cloud_cover / 100; W.code = c.weather_code; W.temp = c.temperature_2m; W.wind = c.wind_speed_10m; W.windDir = c.wind_direction_10m;
      W.storm = c.weather_code >= 95 ? 1 : 0;
      W.rain = W.storm ? 1 : (c.weather_code >= 51 && c.weather_code <= 67) || (c.weather_code >= 80 && c.weather_code <= 82) ? Math.min(1, 0.35 + c.precipitation / 4) : 0;
      W.src = "live";
    } catch (e) { W.src = "offline"; }
  }
  const icon = () => (W.storm ? "⛈" : W.rain ? "🌧" : W.cover > 0.7 ? "☁" : W.cover > 0.3 ? (night > 0.5 ? "☁" : "⛅") : night > 0.5 ? "🌙" : "☀");
  function label() {
    const el = document.querySelector("#wx"); if (!el) return;
    const d = clock(), t = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens" });
    el.textContent = `${icon()} ${W.temp != null ? Math.round(W.temp) + "° · " : ""}${t} auf Rhodos`;
  }

  /* ---------------- Each frame ---------------- */
  const tmp = new THREE.Color(), grey = new THREE.Color();
  function step(dt, now) {
    const fx = pl.x + pan.x, fz = pl.z + pan.z;
    const fresh = now - (step.t || 0) > 20000 || !step.t; if (fresh) { step.t = now; sunDir = sunNow(clock()); }
    const elev = (Math.asin(sunDir.y) * 180) / Math.PI, P = palette(elev);
    night = Math.min(1, Math.max(0, (-elev - 2) / 10));
    if (fresh) label();
    // weather greys the sky and dims the sun
    const ov = Math.min(1, W.cover * 0.7 + W.rain * 0.3 + W.storm * 0.3);
    grey.setRGB(1, 1, 1).multiplyScalar(((P.hor.r + P.hor.g + P.hor.b) / 3) * (1 - W.storm * 0.45));
    P.hor.lerp(grey, ov * 0.75); P.zen.lerp(tmp.copy(grey).multiplyScalar(0.8), ov * 0.8);
    skyU.uZen.value.copy(P.zen); skyU.uHor.value.copy(P.hor); skyU.uSunCol.value.copy(P.sun); skyU.uSun.value.copy(sunDir);
    skyU.uNight.value = night; skyU.uCloud.value = Math.min(1, W.cover * 0.9 + W.rain * 0.3); skyU.uFlash.value = flash;
    scene.fog.color.copy(P.hor);
    // the sun (or, at night, the moon's pale light from above the sea)
    if (sunDir.y > -0.05) { sun.position.copy(sunDir).multiplyScalar(100); sun.color.copy(P.sun); sun.intensity = P.si * (1 - ov * 0.65); }
    else { sun.position.set(-40, 80, 30); sun.color.set("#9ab0e0"); sun.intensity = 0.2 * (1 - ov); }
    hemi.color.copy(P.hs); hemi.groundColor.copy(P.hg); hemi.intensity = P.hi * (1 - ov * 0.25) + flash * 1.4;
    cloudMat.color.set(W.storm ? "#5d636e" : W.rain ? "#8c939e" : "#ffffff").multiplyScalar(0.35 + 0.65 * Math.min(1, P.si + 0.25) + flash);
    // sea
    seaU.uT.value = now / 1000; seaU.uCam.value.copy(camera.position); seaU.uFogN.value = scene.fog.near; seaU.uFogF.value = scene.fog.far;
    seaU.uLight.value = Math.min(1, P.si + P.hi * 0.4) * (1 - ov * 0.45); seaU.uRough.value = 0.7 + Math.min(1.6, W.wind / 25) + W.storm * 0.6;
    water.position.set(Math.round(camera.position.x), 0, Math.round(camera.position.z));
    sky.position.copy(camera.position);
    if (lamps) lamps.material.opacity = Math.min(1, night * 1.3 + ov * 0.2 * night);
    cloudStep(dt, fx, fz); rainStep(dt, fx, fz); lightning(dt, fx, fz);
  }

  function init() {
    scene.background = null; scene.add(sky); scene.add(clouds); scene.add(rain); scene.add(bolt);
    camera.far = 3000; camera.updateProjectionMatrix();
    water.geometry.dispose(); water.geometry = new THREE.PlaneGeometry(4000, 4000);
    seaU.uMask.value = maskTex; seaU.uBox.value.set(W0, D0, W1 - W0, D1 - D0);
    water.material = seaMat; water.renderOrder = 1;
    makeLamps(); weather(); setInterval(weather, 30 * 60 * 1000);
  }
  window.Himmel = { init, step, weather: W, sunNow };
})();
