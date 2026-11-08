// THE FILM: draws frame t of the Freddo Cappuccino ad. Pure function of t (offscreen canvases are
// scratch space cleared every frame, or static layers built once in init).
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { BEAT, ev, clock } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H;

  // ---------- palette + layout ----------
  const GREEN = '#2bd17e', MINT = '#9be8bf', CREAM = '#f3efe6';
  const TABLE = 1290; // horizon of the table
  const IMG_W = 1549, IMG_H = 2370; // source cup cutout size
  const CW = 480, k = CW / IMG_W, CH = IMG_H * k; // cup on screen
  const CX = W / 2, CUP_Y = TABLE + 24 - CH; // cup image top-left y
  const CUP_X = CX - CW / 2;
  const RIM_Y = 800; // rim in image px (body below, lid above)
  const LIQ_TOP = 830, LIQ_BOT = 2318; // liquid range in image px
  const SERIF = "'DM Serif Display', Georgia, serif";

  const A = {}; // assets + static layers
  const sm = (x) => x * x * (3 - 2 * x);
  const win = (t, a, b) => t >= a && t < b;
  const hash = (i, s = 0) => U.hash ? U.hash(i * 7.13 + s * 101.7) : ((Math.sin(i * 127.1 + s * 311.7) * 43758.5453) % 1 + 1) % 1;
  const rr = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

  // ---------- static layers ----------
  function buildStudio() {
    const c = mk(W, H), x = c.getContext('2d');
    let g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#061a10'); g.addColorStop(0.6, '#030c07'); g.addColorStop(1, '#010402');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // green glow behind the cup
    g = x.createRadialGradient(CX, TABLE - 360, 0, CX, TABLE - 360, 640);
    g.addColorStop(0, 'rgba(43,209,126,0.38)'); g.addColorStop(0.45, 'rgba(20,110,62,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createRadialGradient(W, 0, 0, W, 0, 900);
    g.addColorStop(0, 'rgba(31,138,76,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // fluted wall
    x.save();
    const m = x.createRadialGradient(CX, TABLE - 500, 0, CX, TABLE - 500, 820);
    for (let i = 0; i < W; i += 80) {
      x.fillStyle = 'rgba(255,255,255,0.025)'; x.fillRect(i + 38, 0, 2, TABLE);
      x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(i + 40, 0, 4, TABLE);
    }
    x.restore();
    // leaf shadows (gobo), blurred
    x.save(); x.filter = 'blur(16px)'; x.fillStyle = 'rgba(0,0,0,0.6)';
    const leaf = (tx, ty, r, s) => { x.save(); x.translate(tx, ty); x.rotate(r); x.scale(s, s); x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(70, -46, 200, -46, 300, 0); x.bezierCurveTo(200, 46, 70, 46, 0, 0); x.fill(); x.restore(); };
    for (const [tx, ty, r, s] of [[-60, 260, 0.5, 1.1], [60, 250, -0.1, 1.1], [30, 300, 1.1, 1.0], [1140, 520, 2.6, 1.1], [1060, 470, 3.3, 1.0], [1100, 600, 2.1, 0.9]]) leaf(tx, ty, r, s);
    x.restore();
    // table
    g = x.createLinearGradient(0, TABLE, 0, H);
    g.addColorStop(0, '#0b1d13'); g.addColorStop(0.3, '#040a06'); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(0, TABLE, W, H - TABLE);
    g = x.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(155,232,191,0)'); g.addColorStop(0.5, 'rgba(155,232,191,0.4)'); g.addColorStop(1, 'rgba(155,232,191,0)');
    x.fillStyle = g; x.fillRect(0, TABLE, W, 2);
    g = x.createRadialGradient(CX, TABLE, 0, CX, TABLE, 520);
    g.addColorStop(0, 'rgba(43,209,126,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, TABLE, W, 400);
    return c;
  }
  function buildTableFade() { // laid over reflections so they fade into the table
    const c = mk(W, H - TABLE), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 420);
    g.addColorStop(0, 'rgba(4,12,7,0)'); g.addColorStop(1, 'rgba(1,4,2,1)');
    x.fillStyle = g; x.fillRect(0, 0, W, H - TABLE);
    return c;
  }
  function buildSky() {
    const SH = 2200, c = mk(W, SH), x = c.getContext('2d');
    let g = x.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, '#010805'); g.addColorStop(0.55, '#06301c'); g.addColorStop(1, '#061a10');
    x.fillStyle = g; x.fillRect(0, 0, W, SH);
    g = x.createRadialGradient(780, 520, 0, 780, 520, 520); // moon glow
    g.addColorStop(0, 'rgba(210,255,230,0.5)'); g.addColorStop(0.12, 'rgba(155,232,191,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, SH);
    x.fillStyle = 'rgba(235,255,244,0.95)'; x.beginPath(); x.arc(780, 520, 46, 0, 7); x.fill();
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(220,255,235,${0.2 + rr(i, 1) * 0.6})`; x.beginPath(); x.arc(rr(i, 2) * W, rr(i, 3) * SH * 0.7, 0.8 + rr(i, 4) * 2, 0, 7); x.fill(); }
    return c;
  }
  function cloud(x, cx, cy, s, a) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    for (let i = 0; i < 9; i++) {
      const px = (i - 4) * 70 + rr(i, cx) * 30, py = -Math.cos((i - 4) / 4 * 1.4) * 60 + rr(i, cy) * 20, r = 90 + rr(i, cx + cy) * 70;
      const g = x.createRadialGradient(px, py - r * 0.3, r * 0.1, px, py, r);
      g.addColorStop(0, `rgba(120,170,145,${0.55 * a})`); g.addColorStop(0.6, `rgba(30,70,50,${0.6 * a})`); g.addColorStop(1, 'rgba(10,30,20,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    x.restore();
  }
  function buildHero() { // the real cup with studio light + condensation
    const c = mk(IMG_W, IMG_H), x = c.getContext('2d');
    x.drawImage(A.cup, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    let g = x.createLinearGradient(0, 0, IMG_W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(0.62, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    x.fillStyle = g; x.fillRect(0, 0, IMG_W, IMG_H);
    // light layer, masked to the cup, then screened on
    const L = mk(IMG_W, IMG_H), lx = L.getContext('2d');
    g = lx.createLinearGradient(0, 0, IMG_W, 0);
    g.addColorStop(0, 'rgba(120,255,180,0.5)'); g.addColorStop(0.09, 'rgba(120,255,180,0)'); g.addColorStop(0.88, 'rgba(0,0,0,0)'); g.addColorStop(0.97, 'rgba(255,255,255,0.3)');
    lx.fillStyle = g; lx.fillRect(0, 0, IMG_W, IMG_H);
    g = lx.createLinearGradient(0, 0, IMG_W, IMG_H * 0.18);
    g.addColorStop(0.22, 'rgba(255,255,255,0)'); g.addColorStop(0.25, 'rgba(255,255,255,0.24)'); g.addColorStop(0.29, 'rgba(255,255,255,0.04)'); g.addColorStop(0.31, 'rgba(255,255,255,0)');
    lx.fillStyle = g; lx.fillRect(0, 0, IMG_W, IMG_H);
    lx.globalCompositeOperation = 'destination-in'; lx.drawImage(A.cup, 0, 0);
    x.globalCompositeOperation = 'screen'; x.drawImage(L, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.filter = 'blur(2px)';
    for (let i = 0; i < 150; i++) {
      const px = 280 + rr(i, 5) * 1000, py = 900 + rr(i, 6) * 1350, r = 5 + Math.pow(rr(i, 7), 2.2) * 19;
      x.fillStyle = 'rgba(0,0,0,0.16)'; x.beginPath(); x.ellipse(px, py, r, r * 1.2, 0, 0, 7); x.fill();
      x.fillStyle = `rgba(255,255,255,${0.2 + rr(i, 8) * 0.25})`; x.beginPath(); x.ellipse(px - r * 0.3, py - r * 0.4, r * 0.32, r * 0.34, 0, 0, 7); x.fill();
    }
    x.filter = 'none';
    return c;
  }

  // ---------- scratch canvases ----------
  let liq, liqX, layer, layerX;
  const LAYER_PAD = 0; // cup layer = exactly the cup image box, in image px scaled by k

  // ---------- liquid state (all from t) ----------
  function liquidState(t) {
    const st = { level: 0, esp: 0, amp: 0, plume: 0 };
    if (t < ev.creamStart) return st;
    const cream = sm(clamp((t - ev.creamStart - 0.12) / (ev.creamEnd - ev.creamStart)));
    st.level = 0.52 * cream;
    for (const c of S.cubes) st.level += 0.035 * sm(clamp((t - c.t) / 0.25));
    const esp = clamp((t - ev.espStart - 0.1) / (ev.espEnd - ev.espStart + 0.5));
    st.esp = esp;
    st.level += 0.27 * sm(clamp((t - ev.espStart - 0.1) / (ev.espEnd - ev.espStart)));
    // surface agitation: pouring + each impact
    let amp = 0;
    if (win(t, ev.creamStart, ev.creamEnd + 0.4)) amp += 10;
    if (win(t, ev.espStart, ev.espEnd + 0.4)) amp += 8;
    for (const c of S.cubes) if (t >= c.t) amp += 26 * Math.exp(-(t - c.t) * 5);
    if (t >= ev.drop - 0.02) amp *= Math.exp(-(t - ev.drop) * 4);
    st.amp = amp;
    return st;
  }
  const surfY = (L) => LIQ_BOT - L * (LIQ_BOT - LIQ_TOP);
  function wave(x, t, amp, ph = 0) { return amp * (Math.sin(x * 0.011 + t * 9 + ph) * 0.6 + Math.sin(x * 0.027 - t * 13 + ph * 2) * 0.4); }

  function drawLiquid(x, t) {
    const st = liquidState(t);
    if (st.level <= 0.001) return st;
    const ys = surfY(st.level);
    const top = (px, ph = 0) => ys + wave(px, t, st.amp, ph);
    const band = (y0f, y1f, fill) => {
      x.beginPath();
      for (let px = 0; px <= IMG_W; px += 40) x.lineTo(px, y0f(px));
      for (let px = IMG_W; px >= 0; px -= 40) x.lineTo(px, y1f(px));
      x.closePath(); x.fillStyle = fill; x.fill();
    };
    // base liquid: cream, warming to caramel as the espresso mixes in
    const e = st.esp;
    const mixc = (a, b, f) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], f))).join(',')})`;
    let g = x.createLinearGradient(0, ys, 0, LIQ_BOT);
    g.addColorStop(0, mixc([248, 242, 230], [176, 128, 84], e * 0.9));
    g.addColorStop(1, mixc([228, 214, 192], [128, 84, 48], e));
    band((px) => top(px), () => LIQ_BOT + 30, g);
    if (e > 0) {
      // espresso cloud: descends from the surface, leaves a foam cap on top
      const foamH = 240 * sm(clamp(e * 1.4));
      const darkBot = lerp(ys + 60, 1930, sm(clamp(e * 1.15)));
      const fb = (px) => top(px) + foamH + wave(px, t * 0.6, 14, 2);
      const db = (px) => Math.max(fb(px) + 10, darkBot + wave(px, t * 0.5, 40, 4));
      g = x.createLinearGradient(0, ys, 0, darkBot + 60);
      g.addColorStop(0, `rgba(48,28,14,${0.96 * clamp(e * 3)})`); g.addColorStop(0.75, `rgba(62,36,18,${0.95 * clamp(e * 3)})`); g.addColorStop(1, 'rgba(90,56,30,0)');
      band(fb, (px) => db(px) + 60, g);
      // foam cap
      g = x.createLinearGradient(0, ys, 0, ys + foamH + 20);
      g.addColorStop(0, '#efe5d3'); g.addColorStop(0.8, '#d9c7aa'); g.addColorStop(1, 'rgba(150,105,65,0.9)');
      band((px) => top(px), fb, g);
    } else {
      // milky top highlight
      g = x.createLinearGradient(0, ys, 0, ys + 60);
      g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      band((px) => top(px), (px) => top(px) + 60, g);
    }
    // plume where a stream hits
    const plume = (t0, t1, col) => {
      if (!win(t, t0, t1 + 0.6)) return;
      const a = clamp((t - t0) / 0.2) * (1 - clamp((t - t1) / 0.6));
      const px = IMG_W / 2 - 60, d = 260 + 200 * Math.sin((t - t0) * 6) ** 2;
      const pg = x.createRadialGradient(px, ys + 60, 10, px, ys + 120, d);
      pg.addColorStop(0, col.replace('A', 0.75 * a)); pg.addColorStop(1, col.replace('A', 0));
      x.fillStyle = pg; x.fillRect(px - d, ys, d * 2, d * 1.6);
    };
    plume(ev.creamStart, ev.creamEnd, 'rgba(255,255,255,A)');
    plume(ev.espStart, ev.espEnd, 'rgba(40,22,10,A)');
    // fine bubbles at the surface
    for (let i = 0; i < 40; i++) {
      const px = 240 + rr(i, 9) * 1060, py = top(px) + 6 + rr(i, 10) * 26;
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(px, py, 3 + rr(i, 11) * 6, 0, 7); x.fill();
    }
    return st;
  }

  function iceCube(x, cx, cy, s, rot, alpha) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.globalAlpha = alpha;
    const h = s / 2, r = s * 0.18;
    const path = () => { x.beginPath(); x.roundRect(-h, -h, s, s, r); };
    path(); let g = x.createLinearGradient(-h, -h, h, h);
    g.addColorStop(0, 'rgba(235,255,250,0.55)'); g.addColorStop(0.5, 'rgba(190,230,225,0.25)'); g.addColorStop(1, 'rgba(160,210,205,0.45)');
    x.fillStyle = g; x.fill();
    x.lineWidth = Math.max(1.5, s * 0.03); x.strokeStyle = 'rgba(255,255,255,0.85)'; x.stroke();
    x.beginPath(); x.roundRect(-h * 0.55, -h * 0.55, s * 0.55, s * 0.55, r * 0.6); x.strokeStyle = 'rgba(255,255,255,0.35)'; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.ellipse(-h * 0.45, -h * 0.5, s * 0.16, s * 0.05, -0.6, 0, 7); x.fill();
    x.restore();
  }
  // cube position in SCREEN px relative to the cup's origin (CUP_X, CUP_Y), from t
  function cubePos(c, t, ysScreen) {
    const t0 = c.t - 0.42;
    if (t < t0) return null;
    const tx = CW / 2 + c.x;
    if (t < c.t) {
      const u = (t - t0) / 0.42;
      return { x: lerp(tx - c.x * 0.4, tx, u), y: lerp(-CUP_Y - 120, ysScreen, ease.inQuad(u)), rot: c.rot + (1 - u) * 3, a: 1, inCup: false };
    }
    const d = t - c.t;
    const bob = 34 * Math.exp(-d * 6) * Math.cos(d * 16);
    return { x: tx + Math.sin(t * 1.3 + c.i) * 3, y: ysScreen + c.depth * sm(clamp(d / 0.5)) + bob * 0.6 + Math.sin(t * 2 + c.i * 2) * 2, rot: c.rot + Math.sin(t * 1.1 + c.i) * 0.05, a: 0.82, inCup: true };
  }

  // a jug of cold cream and a shot glass of espresso, drawn around their spout (0,0)
  function jug(x, sx, sy, tilt) {
    x.save(); x.translate(sx, sy); x.rotate(tilt);
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(-30, -10, -40, -40); x.lineTo(-210, -60); x.quadraticCurveTo(-250, -60, -250, -20);
    x.lineTo(-240, 150); x.quadraticCurveTo(-236, 185, -200, 185); x.lineTo(-70, 185); x.quadraticCurveTo(-36, 185, -40, 150); x.lineTo(-30, 20); x.closePath();
    let g = x.createLinearGradient(-250, 0, -30, 0);
    g.addColorStop(0, '#cfd6d2'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(0.7, '#e9eeeb'); g.addColorStop(1, '#a9b4ae');
    x.fillStyle = g; x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,0.6)'; x.stroke();
    x.beginPath(); x.arc(-262, 60, 52, Math.PI * 0.55, Math.PI * 1.45); x.lineWidth = 18; x.strokeStyle = '#dfe6e2'; x.stroke();
    x.fillStyle = 'rgba(43,209,126,0.9)'; x.fillRect(-235, 95, 190, 14); // a green band: brand touch
    x.restore();
  }
  function shotGlass(x, sx, sy, tilt, fill) {
    x.save(); x.translate(sx, sy); x.rotate(-tilt);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(110, -8); x.lineTo(100, 150); x.quadraticCurveTo(98, 165, 84, 165); x.lineTo(26, 165); x.quadraticCurveTo(12, 165, 10, 150); x.closePath();
    x.fillStyle = 'rgba(220,255,240,0.14)'; x.fill(); x.lineWidth = 4; x.strokeStyle = 'rgba(230,255,245,0.75)'; x.stroke();
    if (fill > 0) { // espresso inside (keeps level horizontal in world space roughly)
      x.save(); x.clip();
      const lvl = lerp(160, 30, fill);
      x.fillStyle = '#2a170b'; x.fillRect(-20, lvl, 160, 200);
      x.fillStyle = '#b97a3e'; x.fillRect(-20, lvl - 10, 160, 12);
      x.restore();
    }
    x.restore();
  }
  function stream(x, x0, y0, y1, w, col, hi, t) {
    if (y1 <= y0 || w <= 0.5) return;
    x.save();
    const g = x.createLinearGradient(x0 - w, 0, x0 + w, 0);
    g.addColorStop(0, col); g.addColorStop(0.35, hi); g.addColorStop(1, col);
    x.fillStyle = g; x.beginPath();
    for (let y = y0; y <= y1; y += 20) x.lineTo(x0 + Math.sin(y * 0.03 + t * 25) * 2.2 - w / 2 * (0.75 + 0.25 * Math.sin(y * 0.05 - t * 30)), y);
    for (let y = y1; y >= y0; y -= 20) x.lineTo(x0 + Math.sin(y * 0.03 + t * 25) * 2.2 + w / 2 * (0.75 + 0.25 * Math.sin(y * 0.05 - t * 30)), y);
    x.closePath(); x.fill(); x.restore();
  }
  function splash(x, t, t0, ox, oy, { n = 14, seed = 1, col = '255,255,255', spread = 260, up = 520, size = 7, life = 0.6 } = {}) {
    const d = t - t0; if (d < 0 || d > life) return;
    for (let i = 0; i < n; i++) {
      const vx = (rr(i, seed) - 0.5) * spread * 2, vy = -up * (0.4 + rr(i, seed + 1) * 0.6);
      const px = ox + vx * d, py = oy + vy * d + 1400 * d * d, a = 1 - d / life;
      x.fillStyle = `rgba(${col},${a})`; x.beginPath(); x.arc(px, py, size * (0.5 + rr(i, seed + 2)), 0, 7); x.fill();
    }
  }
  function bean(x, cx, cy, s, rot) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(s / 100, s / 100);
    x.shadowColor = 'rgba(0,0,0,0.8)'; x.shadowBlur = 14; x.shadowOffsetY = 10;
    const g = x.createRadialGradient(-12, -12, 4, 0, 0, 52);
    g.addColorStop(0, '#8a5634'); g.addColorStop(0.45, '#4e2c18'); g.addColorStop(1, '#1c0d06');
    x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, 47, 34, 0, 0, 7); x.fill();
    x.shadowColor = 'transparent';
    x.strokeStyle = '#120804'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(-38, 9); x.bezierCurveTo(-16, -11, 8, 13, 38, -11); x.stroke();
    x.fillStyle = 'rgba(255,230,200,0.16)'; x.beginPath(); x.ellipse(-16, -17, 16, 6, -0.3, 0, 7); x.fill();
    x.restore();
  }
  function sparkle(x, cx, cy, s, a) {
    if (a <= 0) return;
    x.save(); x.translate(cx, cy); x.globalAlpha = a; x.fillStyle = '#fff';
    x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.16 : s; const an = (i / 8) * Math.PI * 2; x.lineTo(Math.cos(an) * r, Math.sin(an) * r); } x.fill();
    const g = x.createRadialGradient(0, 0, 0, 0, 0, s * 1.4); g.addColorStop(0, 'rgba(200,255,225,0.6)'); g.addColorStop(1, 'rgba(200,255,225,0)');
    x.fillStyle = g; x.fillRect(-s * 1.4, -s * 1.4, s * 2.8, s * 2.8);
    x.restore();
  }

  // ---------- the cup, composited into `layer` (image px) ----------
  function composeCup(t) {
    const x = layerX; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, IMG_W, IMG_H);
    if (t >= ev.drop) { x.drawImage(A.hero, 0, 0); return null; }
    // back rim (open cup)
    x.lineWidth = 10; x.strokeStyle = 'rgba(220,255,240,0.35)';
    x.beginPath(); x.ellipse(IMG_W / 2 + 8, RIM_Y + 10, 645, 60, 0, Math.PI, Math.PI * 2); x.stroke();
    // liquid, clipped to the inside of the cup
    const lx = liqX; lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, IMG_W, IMG_H);
    const st = drawLiquid(lx, t);
    lx.globalCompositeOperation = 'destination-in'; lx.drawImage(A.mask, 0, 0); lx.globalCompositeOperation = 'source-over';
    x.drawImage(liq, 0, 0);
    // glass front
    x.drawImage(A.glass, 0, 0);
    x.lineWidth = 9; x.strokeStyle = 'rgba(235,255,245,0.6)';
    x.beginPath(); x.ellipse(IMG_W / 2 + 8, RIM_Y + 10, 645, 60, 0, 0, Math.PI); x.stroke();
    return st;
  }

  // ---------- captions ----------
  function chip(x, label, text, t, t0, t1, y) {
    if (!win(t, t0, t1)) return;
    const pin = ease.outBack(clamp((t - t0) / 0.28), 2.2), out = 1 - clamp((t - (t1 - 0.15)) / 0.15);
    x.save(); x.globalAlpha = out; x.translate(W / 2, y); x.scale(pin, pin); x.rotate(-0.03);
    x.font = '800 30px Inter'; x.letterSpacing = '6px';
    const lw = x.measureText(label).width + 40;
    x.fillStyle = GREEN; x.beginPath(); x.roundRect(-lw / 2, -118, lw, 52, 26); x.fill();
    x.fillStyle = '#02140a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 3, -91);
    x.font = '800 92px Inter'; x.letterSpacing = '2px';
    x.lineWidth = 14; x.strokeStyle = 'rgba(0,0,0,0.85)'; x.lineJoin = 'round'; x.strokeText(text, 0, 0);
    x.fillStyle = '#fff'; x.fillText(text, 0, 0);
    x.restore();
  }

  Studio.film({
    async init() {
      await Studio.loadFont('DM Serif Display', 'assets/DMSerifDisplay-Italic.woff2', '400');
      [A.cup, A.glass, A.mask, A.lid] = await Promise.all(['assets/cup_hd.png', 'assets/glass_body.png', 'assets/body_mask.png', 'assets/lid.png'].map(Studio.loadImage));
      A.studio = buildStudio(); A.sky = buildSky(); A.fade = buildTableFade(); A.hero = buildHero();
      liq = mk(IMG_W, IMG_H); liqX = liq.getContext('2d');
      layer = mk(IMG_W, IMG_H); layerX = layer.getContext('2d');
    },
    draw(ctx, t) {
      // ---- camera: starts looking up at the sky, tilts down with the falling cup ----
      const tilt = 1650 * (1 - ease.inOutCubic(clamp((t - 0.35) / 1.5)));
      const shakeA = (t >= ev.land ? 22 * Math.exp(-(t - ev.land) * 7) : 0) + (t >= ev.drop ? 26 * Math.exp(-(t - ev.drop) * 6) : 0);
      const push = t >= ev.drop ? 1 + 0.07 * ease.outCubic(clamp((t - ev.drop) / (S.DURATION - ev.drop))) : 1;
      ctx.save();
      ctx.translate(U.noise1(t * 30, 1) * shakeA, U.noise1(t * 30, 2) * shakeA);
      ctx.translate(CX, TABLE - 300); ctx.scale(push, push); ctx.translate(-CX, -(TABLE - 300));

      // ---- world ----
      if (tilt > 1) {
        ctx.drawImage(A.sky, 0, tilt - A.sky.height + 2);
        for (const [cx, cy, s, par] of [[200, 900, 1.3, 1.25], [900, 1250, 1.1, 1.2], [520, 1600, 1.6, 1.35], [80, 1950, 1.2, 1.1], [1000, 2100, 1.4, 1.3]])
          cloud(ctx, cx + Math.sin(t * 0.3 + cx) * 10, cy - 2200 + tilt * par, s, 1);
      }
      ctx.drawImage(A.studio, 0, tilt);
      // bokeh
      for (let i = 0; i < 22; i++) {
        const bx = rr(i, 20) * W + Math.sin(t * 0.4 + i) * 12, by = rr(i, 21) * (TABLE - 250) + tilt + Math.cos(t * 0.3 + i) * 10, bs = 10 + rr(i, 22) * 38, ba = 0.05 + rr(i, 23) * 0.14;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, bs);
        g.addColorStop(0, `rgba(155,232,191,${ba * 1.4})`); g.addColorStop(0.7, `rgba(43,209,126,${ba * 1.5})`); g.addColorStop(0.75, 'rgba(43,209,126,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, bs, 0, 7); ctx.fill();
      }

      // ---- the cup ----
      const st = composeCup(t);
      const landed = t >= ev.land;
      if (!landed && t >= ev.fallStart) {
        const u = clamp((t - ev.fallStart) / (ev.land - ev.fallStart));
        const s = lerp(0.16, 1, ease.inQuad(u)), bottom = lerp(520, TABLE + 24, ease.inQuad(u));
        const rot = Math.pow(1 - u, 2) * Math.PI * 4.2;
        for (let gh = 2; gh >= 0; gh--) { // motion trail
          const du = gh * 0.025 * u, s2 = lerp(0.16, 1, ease.inQuad(u - du)), b2 = lerp(520, TABLE + 24, ease.inQuad(u - du));
          ctx.save(); ctx.globalAlpha = gh ? 0.18 / gh : 1;
          ctx.translate(CX, b2 - CH * s2 / 2); ctx.rotate(rot + gh * 0.08); ctx.scale(s2 * k, s2 * k);
          ctx.drawImage(layer, -IMG_W / 2, -IMG_H / 2);
          ctx.restore();
        }
      } else if (landed) {
        // squash on impact
        const d = t - ev.land, sq = 0.09 * Math.exp(-d * 9) * Math.cos(d * 26);
        // reflection
        ctx.save(); ctx.globalAlpha = 0.28; ctx.translate(CX, TABLE + 24); ctx.scale(k * (1 + sq), -k * (1 - sq)); ctx.drawImage(layer, -IMG_W / 2, -IMG_H); ctx.restore();
        // reflection of the lid while it lands
        ctx.drawImage(A.fade, 0, TABLE);
        // contact shadow
        const g = ctx.createRadialGradient(CX, TABLE + 20, 0, CX, TABLE + 20, 190);
        g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.translate(CX, TABLE + 20); ctx.scale(1, 0.12); ctx.translate(-CX, -(TABLE + 20)); ctx.fillStyle = g; ctx.fillRect(CX - 200, TABLE - 180, 400, 400); ctx.restore();
        // glow behind cup in the hero section
        if (t >= ev.drop) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.1 * Math.exp(-((clock.beatPos(t) % 1)) * 6);
          const hg = ctx.createRadialGradient(CX, TABLE - 380, 0, CX, TABLE - 380, 420); hg.addColorStop(0, 'rgba(43,209,126,0.35)'); hg.addColorStop(1, 'rgba(43,209,126,0)');
          ctx.fillStyle = hg; ctx.fillRect(CX - 420, TABLE - 800, 840, 840); ctx.restore();
        }
        ctx.save(); ctx.translate(CX, TABLE + 24); ctx.scale(k * (1 + sq), k * (1 - sq)); ctx.drawImage(layer, -IMG_W / 2, -IMG_H); ctx.restore();
        // impact ring + dust
        if (d < 0.7) {
          const a = 1 - d / 0.7;
          ctx.save(); ctx.strokeStyle = `rgba(155,232,191,${0.7 * a})`; ctx.lineWidth = 6 * a + 1;
          ctx.beginPath(); ctx.ellipse(CX, TABLE + 22, 200 + d * 900, 18 + d * 70, 0, 0, 7); ctx.stroke(); ctx.restore();
          splash(ctx, t, ev.land, CX, TABLE + 10, { n: 24, seed: 3, col: '155,232,191', spread: 520, up: 380, size: 5 });
        }
      }

      // ---- ice cubes (screen space, relative to the cup) ----
      if (t < ev.drop && t >= ev.ice[0] - 0.45) {
        const ysScreen = CUP_Y + surfY(st ? st.level : 0.5) * k;
        for (const c of S.cubes) {
          const p = cubePos(c, t, ysScreen - CUP_Y);
          if (!p) continue;
          iceCube(ctx, CUP_X + p.x, CUP_Y + p.y, c.size, p.rot, p.a);
          splash(ctx, t, c.t, CUP_X + CW / 2 + c.x, ysScreen, { n: 12, seed: 10 + c.i, col: '245,236,220', spread: 160, up: 520, size: 6, life: 0.5 });
        }
        // glass front over the cubes, so they read as inside
        ctx.save(); ctx.globalAlpha = 0.55; ctx.drawImage(A.glass, CUP_X, CUP_Y, CW, CH); ctx.restore();
      }

      // ---- cream jug ----
      if (win(t, ev.jugIn - 0.3, ev.creamEnd + 0.6)) {
        const inU = ease.outCubic(clamp((t - (ev.jugIn - 0.3)) / 0.45)), outU = ease.inCubic(clamp((t - ev.creamEnd - 0.1) / 0.5));
        const sx = lerp(-260, CX - 40, inU) - outU * 700, sy = lerp(520, 690, inU) - outU * 200;
        const tiltA = 1.0 * sm(clamp((t - ev.creamStart + 0.15) / 0.3)) * (1 - sm(clamp((t - ev.creamEnd + 0.1) / 0.3)));
        const ys = CUP_Y + surfY(liquidState(t).level) * k;
        const bottomY = Math.max(ys, CUP_Y + RIM_Y * k);
        const head = clamp((t - ev.creamStart) / 0.25), tail = clamp((t - ev.creamEnd) / 0.25);
        const y0 = lerp(sy + 4, bottomY, tail), y1 = lerp(sy + 4, Math.max(bottomY, CUP_Y + LIQ_BOT * k), head);
        if (t >= ev.creamStart && t < ev.creamEnd + 0.25) stream(ctx, sx + 6, y0, Math.min(y1, ys + 8), 24, '#efe6d6', '#ffffff', t);
        jug(ctx, sx, sy, tiltA);
      }
      // ---- espresso shot ----
      if (win(t, ev.shotIn - 0.1, ev.espEnd + 0.7)) {
        const inU = ease.outBack(clamp((t - ev.shotIn + 0.1) / 0.4), 1.4), outU = ease.inCubic(clamp((t - ev.espEnd - 0.1) / 0.5));
        const sx = lerp(W + 160, CX + 30, inU) + outU * 600, sy = lerp(520, 700, inU) - outU * 200;
        const tiltA = 1.9 * sm(clamp((t - ev.espStart + 0.2) / 0.35)) * (1 - sm(clamp((t - ev.espEnd) / 0.35)));
        const fill = 1 - clamp((t - ev.espStart) / (ev.espEnd - ev.espStart));
        const ys = CUP_Y + surfY(liquidState(t).level) * k;
        const head = clamp((t - ev.espStart) / 0.22), tail = clamp((t - ev.espEnd) / 0.22);
        if (t >= ev.espStart && t < ev.espEnd + 0.22) stream(ctx, sx + 2, lerp(sy + 4, ys, tail), lerp(sy + 4, ys + 6, head), 15, '#2a170b', '#8a5a2e', t);
        shotGlass(ctx, sx, sy, tiltA, fill);
      }
      // ---- the lid slams on ----
      if (win(t, ev.lidFall, ev.drop)) {
        const u = clamp((t - ev.lidFall) / (ev.drop - ev.lidFall));
        const dy = lerp(-900, 0, ease.inQuad(u));
        ctx.save(); ctx.translate(CX, CUP_Y + dy + 400 * k); ctx.rotate((1 - u) * 0.25); ctx.drawImage(A.lid, -CW / 2, -400 * k, CW, CH); ctx.restore();
      }

      // ---- beans on the table, they jump at the landing and the drop ----
      const jump = (i) => { let j = 0; for (const t0 of [ev.land, ev.drop]) { const d = t - t0 - i * 0.03; if (d > 0 && d < 0.45) j = Math.max(j, Math.sin((d / 0.45) * Math.PI) * (60 + i * 12)); } return j; };
      bean(ctx, CX - 290, TABLE + 70 - jump(0), 70, -0.35 + jump(0) * 0.01);
      bean(ctx, CX - 215, TABLE + 105 - jump(1), 56, 0.6);
      bean(ctx, CX + 270, TABLE + 85 - jump(2), 62, 2.8 - jump(2) * 0.01);

      // ---- hero sparkles on the dome ----
      if (t >= ev.drop) for (const [i, g0] of S.glints.entries()) {
        const d = t - g0; if (d < 0 || d > 0.5) continue;
        sparkle(ctx, CUP_X + CW * (0.28 + rr(i, 30) * 0.4), CUP_Y + CH * (0.06 + rr(i, 31) * 0.18), 26, Math.sin((d / 0.5) * Math.PI));
      }
      ctx.restore();

      // ---- overlays (screen space) ----
      // hook
      if (win(t, 0.12, ev.land - 0.1)) {
        const a = clamp((t - 0.12) / 0.2) * (1 - clamp((t - ev.land + 0.3) / 0.2));
        const dots = '.'.repeat(Math.min(3, Math.floor((t - 0.12) / (BEAT * 0.75))));
        ctx.save(); ctx.globalAlpha = a; ctx.font = '800 96px Inter'; ctx.letterSpacing = '3px'; ctx.textAlign = 'center';
        const s = 1 + 0.04 * Math.sin(t * 9);
        ctx.translate(W / 2, 360); ctx.scale(s, s);
        ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round';
        ctx.strokeText('WAIT FOR IT' + dots, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText('WAIT FOR IT' + dots, 0, 0);
        ctx.font = '700 40px Inter'; ctx.letterSpacing = '8px'; ctx.fillStyle = MINT; ctx.fillText('SOMETHING COLD IS FALLING', 0, 74);
        ctx.restore();
      }
      // steps (lower third, inside the safe area)
      chip(ctx, 'STEP 01', 'COLD CREAM', t, ev.creamStart - 0.1, ev.ice[0] - 0.05, 1470);
      const nIce = S.cubes.filter((c) => t >= c.t).length;
      chip(ctx, 'STEP 02', nIce ? `ICE  x${nIce}` : 'ICE', t, ev.ice[0] - 0.2, ev.shotIn - 0.05, 1470);
      chip(ctx, 'STEP 03', 'ESPRESSO SHOT', t, ev.shotIn - 0.05, ev.lidFall, 1470);
      chip(ctx, 'STEP 04', 'CLOSE IT', t, ev.lidFall, ev.drop + 0.02, 1470);

      // flash on the drop (covers the swap to the real cup)
      if (t >= ev.drop) {
        const f = 0.95 * Math.exp(-(t - ev.drop) * 9);
        if (f > 0.01) { ctx.fillStyle = `rgba(235,255,244,${f})`; ctx.fillRect(0, 0, W, H); }
      }
      // ice: a quick cold flash on every cube landing (picture hit on the beat)
      for (const c of S.cubes) { const d = t - c.t; if (d >= 0 && d < 0.2) { ctx.fillStyle = `rgba(225,255,245,${0.28 * Math.exp(-d * 30)})`; ctx.fillRect(0, 0, W, H); } }
      // price: flash
      if (t >= ev.price && t < ev.price + 0.25) { ctx.fillStyle = `rgba(155,232,191,${0.3 * Math.exp(-(t - ev.price) * 25)})`; ctx.fillRect(0, 0, W, H); }
      // land flash
      if (t >= ev.land && t < ev.land + 0.3) { ctx.fillStyle = `rgba(155,232,191,${0.35 * Math.exp(-(t - ev.land) * 14)})`; ctx.fillRect(0, 0, W, H); }

      // ---- title / price / CTA ----
      if (t >= ev.drop) {
        const u = clamp((t - ev.drop) / 0.3), s = lerp(1.5, 1, ease.outCubic(u));
        ctx.save(); ctx.globalAlpha = u; ctx.translate(W / 2, 440); ctx.scale(s, s); ctx.textAlign = 'center';
        ctx.font = `400 210px ${SERIF}`; ctx.letterSpacing = '-2px'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 10;
        ctx.fillStyle = CREAM; ctx.fillText('Freddo', 0, 0);
        ctx.shadowColor = 'transparent';
        ctx.font = '700 50px Inter'; ctx.letterSpacing = '20px'; ctx.fillStyle = GREEN; ctx.fillText('CAPPUCCINO', 10, 86);
        ctx.restore();
      }
      if (t >= ev.eyebrow) {
        const a = clamp((t - ev.eyebrow) / 0.4);
        ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = '600 28px Inter'; ctx.letterSpacing = '9px'; ctx.fillStyle = MINT;
        ctx.fillText('COMO · ESPRESSO YOURSELF', W / 2 + 4, 250);
        ctx.fillStyle = 'rgba(155,232,191,0.5)'; ctx.fillRect(W / 2 - 400, 240, 50, 2); ctx.fillRect(W / 2 + 350, 240, 50, 2);
        ctx.restore();
      }
      if (t >= ev.price) {
        const d = t - ev.price, p = lerp(0.75, 1, ease.outBack(clamp(d / 0.2), 2.4));
        const px = 838, py = 930;
        ctx.save(); ctx.translate(px, py); ctx.rotate(0.16 - 0.1 * (1 - clamp(d / 0.2))); ctx.scale(p, p);
        const r = 118;
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
        const g = ctx.createRadialGradient(0, -40, 10, 0, 0, r); g.addColorStop(0, '#0f3d25'); g.addColorStop(1, '#020805');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.lineWidth = 5; ctx.strokeStyle = GREEN; ctx.stroke();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(155,232,191,0.4)'; ctx.beginPath(); ctx.arc(0, 0, r - 13, 0, 7); ctx.stroke();
        ctx.textAlign = 'center'; ctx.font = '700 22px Inter'; ctx.letterSpacing = '7px'; ctx.fillStyle = MINT; ctx.fillText('ONLY', 4, -38);
        ctx.font = `400 84px ${SERIF}`; ctx.letterSpacing = '0px'; ctx.fillStyle = CREAM; ctx.fillText('3.00', -14, 40);
        ctx.font = '700 46px Inter'; ctx.fillStyle = GREEN; ctx.fillText('€', 72, 22);
        ctx.restore();
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3, dd = d * 520; sparkle(ctx, px + Math.cos(a) * (140 + dd), py + Math.sin(a) * (140 + dd), 16, clamp(1 - d / 0.5)); }
      }
      if (t >= ev.cta) {
        const d = t - ev.cta, p = ease.outBack(clamp(d / 0.35), 2);
        const beat = Math.exp(-((clock.beatPos(t) % 1)) * 7) * (t < ev.end ? 1 : 0.3);
        ctx.save(); ctx.translate(W / 2, 1420); ctx.scale(p * (1 + 0.035 * beat), p * (1 + 0.035 * beat));
        ctx.shadowColor = 'rgba(43,209,126,0.55)'; ctx.shadowBlur = 50;
        ctx.fillStyle = GREEN; ctx.beginPath(); ctx.roundRect(-230, -56, 460, 112, 56); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#02140a'; ctx.font = '800 42px Inter'; ctx.letterSpacing = '5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('ORDER NOW  →', 6, 2);
        ctx.restore();
      }
    },
    post: { paper: 0, vignette: 0.45, grain: 0.05 },
    fadeOut: 1.0,
  });
})();
