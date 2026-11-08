// THE SONG: renders every sound from score.js into out/music.wav.
//   node song.js   (STEMS=1 writes stems, LUFS=-14 masters to a loudness target)
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const U = require('./engine/util');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), fx = bus();
const verb = bus(), dly = bus();
const rnd = U.mulberry32(42);

// ---------- small custom synths ----------
// pitch sweep (sine + a little 2nd harmonic): the falling "incoming" whistle
function sweep(len, f0, f1, { gain = 1, curve = 2 } = {}) {
  const n = Math.round(len * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n, f = f0 * Math.pow(f1 / f0, Math.pow(x, curve));
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, x * 12) * Math.min(1, (1 - x) * 8);
    out[i] = (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) * env * gain * 0.5;
  }
  return out;
}
// liquid pour: band-limited noise with a wobbling cutoff, plus little bubble blips
function pour(len, { lo = 700, hi = 1600, seed = 3, dark = 0 } = {}) {
  const n = Math.round(len * SR), out = new Float32Array(n);
  const r = U.mulberry32(seed);
  let lp = 0, bp = 0, hpPrev = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n, t = i / SR;
    const fc = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * 23 + Math.sin(t * 7) * 2));
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    const w = r() * 2 - 1;
    lp += a * (w - lp); bp += a * (lp - bp);
    const hp = bp - hpPrev; hpPrev = bp;
    const env = Math.min(1, x * 10) * Math.min(1, (1 - x) * 6) * (0.75 + 0.25 * Math.sin(t * 31));
    out[i] = (bp * (1 - dark) + hp * 0.6) * env * 2.2;
  }
  // bubbles
  for (let k = 0; k < len * 16; k++) {
    const t0 = r() * len * 0.95, f = (dark ? 260 : 420) + r() * 520, d = 0.035;
    const s0 = Math.round(t0 * SR);
    for (let i = 0; i < d * SR && s0 + i < n; i++) {
      const tt = i / SR, ff = f * (1 + tt * 18);
      out[s0 + i] += Math.sin(2 * Math.PI * ff * tt) * Math.exp(-tt * 90) * 0.25;
    }
  }
  return out;
}

// ---------- intro: pad + falling sparkle + incoming whistle ----------
for (const n of sc.intro) { const mb = I.musicBox(n.midi); keys.addMono(mb, n.t + 0.15, 0.16); verb.addMono(mb, n.t + 0.15, 0.22); dly.addMono(mb, n.t + 0.15, 0.1); }
fx.addMono(sweep(1.75, 2400, 380, { curve: 1.6 }), ev.fallStart, 0.16);
fx.addMono(I.noiseSweep(0.75, 600, 4200, { q: 0.9, shape: (x) => x * x * x, pink: true }), ev.land - 0.75, 0.45); // the air rushing just before impact

// ---------- the landing ----------
fx.addMono(I.thud(70, 0.12), ev.land, 0.95);
fx.addMono(I.subBoom(0.9, 70, 32), ev.land, 0.55);
fx.addMono(I.glass(5, { size: 1.4 }), ev.land + 0.01, 0.35, 0.1);

// ---------- groove: bars 1-3 light, bars 4-6 full ----------
const K = I.kick({ punch: 1.15, tail: 0.28 }), CL = I.clap({ spread: 0.014 }), SN = I.snare();
const HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14), CR = I.crash(18), SH = I.shaker(1, 15);
const kicks = [];
clock.eachStep(1, 7, 16, (t, b, s) => {
  if (t >= ev.breath - 1e-6 && t < ev.drop) return; // held breath
  const full = b >= 4;
  if (s % 4 === 0) { drums.addMono(K, t, full ? 0.95 : 0.8); kicks.push(t); }
  if (s % 8 === 4 && (b >= 2)) { drums.addMono(CL, t, full ? 0.6 : 0.45); verb.addMono(CL, t, 0.22); }
  if (s % 4 === 2) drums.addMono(full ? HO : HC[0], t, full ? 0.16 : 0.2, 0.25);
  if (full && s % 2 === 1) drums.addMono(HC[s % 4 === 1 ? 0 : 1], t, 0.1, -0.25);
  if (!full && b >= 2 && s % 2 === 1) drums.addMono(SH, t, 0.12, -0.3);
});
// snare roll + riser into the breath
for (let i = 0; i < 12; i++) drums.addMono(SN, T(3, 2) + i * (BEAT * 1.5) / 12, 0.12 + i * 0.025, 0.05);
fx.addMono(I.noiseSweep(ev.breath - T(3, 0), 250, 9000, { q: 0.9, shape: (x) => x * x, pink: true }), T(3, 0), 0.4);
drums.addMono(CR, ev.drop, 0.45, -0.2);
drums.addMono(CR, ev.end, 0.32, 0.2);

// ---------- bass ----------
clock.eachStep(1, 7, 8, (t, b, s) => {
  if (t >= ev.breath - 1e-6 && t < ev.drop) return;
  const c = sc.chordAt(t); if (!c) return;
  const R = c.bass + 12;
  if (b >= 4) { if (s % 2 === 1) bass.addMono(I.bass808(R, BEAT * 0.45, { drive: 1.4, glide: 0 }), t, 0.5); }
  else if (s % 2 === 1) bass.addMono(I.bass(R, BEAT * 0.4, { sub: 0.7 }), t, 0.5);
});
bass.addMono(I.bass808(m('A1') + 12, 1.6, { drive: 1.2, glide: 0 }), ev.end, 0.45);

// ---------- pads + stabs ----------
for (const c of sc.chords) {
  const t1 = c.t1 > ev.breath && c.t0 < ev.breath ? ev.breath : c.t1;
  const opts = c.t0 >= ev.drop ? { cutoff: 2400, attack: 0.04 } : { cutoff: 1100, attack: 0.4, release: 1.2 };
  for (const n of c.notes) { const { L, R } = I.padNote(n, t1 - c.t0, opts); pad.addStereo(L, R, c.t0, 0.085); }
  if (c.t0 >= ev.drop && c.t0 < ev.end) {
    clock.eachStep(c.bar, c.bar + 1, 8, (t, b, s) => {
      if (t < c.t0 || t >= c.t1 || s % 2 === 0) return;
      for (const n of c.notes) keys.addMono(I.supersaw(n + 12, BEAT * 0.3, { detune: 16, cutoff: 3800 }), t, 0.1);
    });
  }
}
// e-piano comping in the build
clock.eachStep(1, 4, 4, (t) => {
  if (t >= ev.breath - 1e-6) return;
  const c = sc.chordAt(t); if (!c) return;
  for (const n of c.notes) { const e = I.epiano(n + 12, BEAT * 0.8); keys.addMono(e, t + BEAT * 0.5, 0.07); verb.addMono(e, t + BEAT * 0.5, 0.05); }
});

// ---------- cream pour ----------
fx.addMono(pour(ev.creamEnd - ev.creamStart, { seed: 7 }), ev.creamStart, 0.35, -0.15);

// ---------- ice: each cube = a clink + an ascending marimba note ----------
for (const c of sc.cubes) {
  fx.addMono(I.glass(20 + c.i, { size: 0.8 }), c.t, 0.55, c.x / 200);
  fx.addMono(I.thud(180, 0.04), c.t, 0.35);
  const x = I.marimba(c.midi, { thock: 0.2 });
  keys.addMono(x, c.t, 0.42, c.x / 200); verb.addMono(x, c.t, 0.18); dly.addMono(x, c.t, 0.08);
}

// ---------- espresso shot ----------
fx.addMono(I.noiseSweep(0.35, 3000, 600, { q: 1, pink: true }), ev.shotIn - 0.05, 0.18, 0.4); // the shot glass swoops in
fx.addMono(pour(ev.espEnd - ev.espStart, { lo: 380, hi: 900, seed: 11, dark: 0.4 }), ev.espStart, 0.35, 0.15);

// ---------- the lid + the drop ----------
fx.addMono(sweep(0.4, 1800, 500, { curve: 1 }), ev.lidFall, 0.12);
fx.addMono(I.thwack(), ev.drop, 0.7);
fx.addMono(I.pop(1300, 3), ev.drop, 0.45);
fx.addMono(I.subBoom(1.8), ev.drop, 0.7);

// ---------- lead hook on the drop ----------
for (const n of sc.lead) {
  const p = I.pluck(n.midi, { decay: 0.3, cutoff: 4200 });
  const x = I.marimba(n.midi, { thock: 0.15 });
  lead.addMono(p, n.t, 0.35, -0.1); lead.addMono(x, n.t, 0.3, 0.1);
  verb.addMono(p, n.t, 0.12); dly.addMono(x, n.t, 0.07);
}

// ---------- price: ka-ching ----------
fx.addMono(I.bell(m('G6') ? 1568 : 1568, 0.5), ev.price, 0.32, 0.3);
fx.addMono(I.bell(2093, 0.7), ev.price + 0.12, 0.3, 0.35);
fx.addMono(I.pop(2200, 9), ev.price, 0.4, 0.3);
verb.addMono(I.bell(2093, 0.7), ev.price + 0.12, 0.15);

drums.addMono(I.clap({ spread: 0.004 }), ev.price, 0.7);
fx.addMono(I.thud(140, 0.05), ev.price, 0.6);
// ---------- CTA pop ----------
fx.addMono(I.pop(1600, 12), ev.cta, 0.45);
fx.addMono(I.marimba(m('A6'), { thock: 0.1 }), ev.cta, 0.25);

// ---------- mix ----------
MIX.sidechain([pad, bass, keys], kicks.filter((t) => t >= ev.drop));
const stems = {
  drums, bass, pad, keys, lead, fx,
  verb: reverb(verb, { room: 0.8, damp: 0.35 }),
  dly: pingpong(dly, BEAT * 0.75, 0.32, 3800),
};
const GAIN = { drums: 0.42, bass: 0.7, pad: 2.4, keys: 0.95, lead: 1.0, fx: 0.85, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 24);
MIX.gate(mix, ev.breath + 0.05, ev.drop - 0.004, 0.04); // the held breath (the lid's whistle starts before it)
MIX.fadeOut(mix, DURATION - 1.3, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -13 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS at drive ${M.drive.toFixed(2)}` : ''})`);
