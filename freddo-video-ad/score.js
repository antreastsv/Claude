// THE SCORE: single source of truth for the music AND the picture of the Freddo Cappuccino ad.
// Story: an empty cup falls from the sky -> lands on the downbeat -> cold cream pours -> 4 ice cubes
// (each one a note) -> espresso shot -> held breath -> lid SLAMS on the drop -> real product + price + CTA.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const STYLE = 'flat';
  const clock = makeClock({ bpm: 120, offset: 0 }); // 1 beat = 0.5s, 1 bar = 2s
  const { T, BEAT } = clock;
  const DURATION = T(7) + 1.5; // 15.5s

  const ev = {
    fallStart: 0.15,
    land: T(1), // the cup hits the table on the downbeat where the groove starts
    jugIn: T(1, 0.5),
    creamStart: T(1, 1),
    creamEnd: T(1, 3.6),
    ice: [T(2, 0), T(2, 1), T(2, 2), T(2, 3)], // every cube lands on a beat and plays a note
    shotIn: T(3, 0),
    espStart: T(3, 0.5),
    espEnd: T(3, 2.8),
    lidFall: T(3, 3.15),
    breath: T(3, 3.5), // a held 8th of silence
    drop: T(4), // lid snaps shut -> the real cup, title, full groove
    eyebrow: T(4, 2),
    price: T(5), // 3.00€ stamps in with a ka-ching
    cta: T(6),
    end: T(7),
  };

  const S = {
    intro: [0, ev.land],
    build: [ev.land, ev.breath],
    breath: [ev.breath, ev.drop],
    drop: [ev.drop, ev.end],
    outro: [ev.end, DURATION],
  };

  const { chords, chordAt } = makeChords(clock, {
    Am7: { notes: ['G3', 'C4', 'E4', 'A4'], bass: 'A1' },
    Fmaj7: { notes: ['A3', 'C4', 'E4', 'F4'], bass: 'F1' },
    C: { notes: ['G3', 'C4', 'E4', 'G4'], bass: 'C2' },
    G: { notes: ['G3', 'B3', 'D4', 'G4'], bass: 'G1' },
    Am9: { notes: ['G3', 'B3', 'C4', 'E4'], bass: 'A1' },
  }, [
    [0, 0, 4, 'Am7'], [1, 0, 4, 'Fmaj7'], [2, 0, 4, 'C'], [3, 0, 3.5, 'G'],
    [4, 0, 4, 'Am7'], [5, 0, 4, 'Fmaj7'], [6, 0, 2, 'C'], [6, 2, 2, 'G'],
    [7, 0, 6, 'Am9'],
  ]);

  // ice cubes: ascending notes (A5 C6 E6 A6) and where each one comes to rest (cup-relative, screen px)
  const iceNotes = ['A5', 'C6', 'E6', 'A6'].map(m);
  const cubes = ev.ice.map((t, i) => ({
    t, i, midi: iceNotes[i],
    x: [-78, 62, -8, 88][i], depth: [26, 34, -6, 8][i], rot: [0.35, -0.25, 0.1, 0.55][i], size: [86, 80, 76, 70][i],
  }));

  // the drop hook (8th grid)
  const HOOK = {
    a: [['E5', 0, 1], ['A5', 1, 1], ['C6', 2, 2], ['B5', 4, 1], ['A5', 5, 1], ['G5', 6, 2]],
    f: [['A5', 0, 1], ['C6', 1, 1], ['E6', 2, 2], ['D6', 4, 1], ['C6', 5, 1], ['A5', 6, 2]],
    cg: [['G5', 0, 1], ['C6', 1, 1], ['E6', 2, 2], ['D6', 4, 2], ['B5', 6, 2]],
  };
  const lead = [...placeBar(clock, HOOK.a, 4), ...placeBar(clock, HOOK.f, 5), ...placeBar(clock, HOOK.cg, 6), { t: T(7), dur: 2, midi: m('A5') }];
  // falling music-box sparkle during the intro
  const sparkle = [['E6', 0, 2], ['C6', 2, 2], ['A5', 4, 2], ['E5', 6, 2]];
  const intro = placeBar(clock, sparkle, 0);

  // hero sparkles on the dome on every downbeat of the drop
  const glints = [T(4, 2), T(5, 0), T(5, 2), T(6, 0), T(6, 2), T(7, 0)];

  const markers = {
    land: { t: ev.land, sync: 'av' },
    ice1: { t: ev.ice[0], sync: 'av' },
    breath: ev.breath,
    drop: { t: ev.drop, sync: 'av' },
    price: { t: ev.price, sync: 'av' },
    cta: { t: ev.cta, sync: 'a' },
    end: ev.end,
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, cubes, HOOK, lead, intro, glints, markers };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
