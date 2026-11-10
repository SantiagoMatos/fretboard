// Finds playable chord shapes for any tuning. -1 = muted string, 0 = open, n = fret.
import { isReentrant } from './instruments.js';

/** The lowest fretted note held across several strings with one finger, if any. */
export function barreOf(frets) {
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length < 2) return null;
  const fret = Math.min(...fretted);
  const idx = frets.flatMap((f, i) => (f === fret ? [i] : []));
  if (idx.length < 2) return null;
  const from = idx[0];
  const to = idx[idx.length - 1];
  for (let i = from; i <= to; i++) if (frets[i] < fret) return null; // an open or muted string breaks the barre
  return { fret, from, to };
}

export function fingersNeeded(frets) {
  const fretted = frets.filter((f) => f > 0).length;
  const barre = barreOf(frets);
  if (!barre) return fretted;
  return fretted - frets.slice(barre.from, barre.to + 1).filter((f) => f === barre.fret).length + 1;
}

const cache = new Map();

/**
 * Search every 4-fret window for shapes that contain all chord tones (the 5th may be dropped
 * from 4+ note chords), need at most 4 fingers and only mute outer strings. Lower score = easier.
 * `enabled` (one boolean per string) leaves switched-off strings muted and ignores them otherwise.
 */
export function findVoicings(tuning, tones, { maxFret = 12, span = 4, limit = 40, enabled } = {}) {
  const n = tuning.length;
  const on = enabled ?? tuning.map(() => true);
  const key = `${tuning.join()}|${tones.map((t) => t.pc).join()}|${maxFret}|${on.map(Number).join('')}`;
  if (cache.has(key)) return cache.get(key);

  const active = tuning.flatMap((_, i) => (on[i] ? [i] : []));
  if (active.length < 2) return [];
  const chordPcs = new Set(tones.map((t) => t.pc));
  const rootPc = tones[0].pc;
  const fifth = tones.length >= 4 ? tones.find((t) => t.name === '5')?.pc : undefined;
  const required = [...chordPcs].filter((pc) => pc !== fifth);
  const minSounding = Math.min(active.length, 3);
  // On re-entrant instruments the lowest string isn't the bass, so root position matters less.
  // Muting is also unusual there, since every string sits under the strumming hand.
  const reentrant = isReentrant(tuning);
  const rootPenalty = reentrant ? 1 : 4;
  const mutePenalty = reentrant ? 3 : 1.5;
  const found = new Map();
  const frets = new Array(n);

  const evaluate = () => {
    // Muted strings are only allowed at the edges of the strings in use.
    let first = -1, last = -1, sounding = 0;
    for (let k = 0; k < active.length; k++) {
      if (frets[active[k]] < 0) continue;
      if (first < 0) first = k;
      last = k;
      sounding++;
    }
    if (sounding < minSounding || last - first + 1 !== sounding) return;

    const pcs = new Set();
    let bass = Infinity, opens = 0, minF = Infinity, maxF = 0;
    for (let i = 0; i < n; i++) {
      const f = frets[i];
      if (f < 0) continue;
      const midi = tuning[i] + f;
      pcs.add(midi % 12);
      bass = Math.min(bass, midi);
      if (f === 0) opens++;
      else {
        minF = Math.min(minF, f);
        maxF = Math.max(maxF, f);
      }
    }
    if (!required.every((pc) => pcs.has(pc))) return;
    const fingers = fingersNeeded(frets);
    if (fingers > 4) return;
    if (minF === Infinity) minF = maxF = 0;

    const score =
      minF * 0.5 +
      (maxF - minF) * 0.6 +
      (active.length - sounding) * mutePenalty +
      (bass % 12 === rootPc ? 0 : rootPenalty) +
      (fifth !== undefined && !pcs.has(fifth) ? 0.3 : 0) +
      fingers * 0.3 +
      (opens && minF > 4 ? 2 : 0);
    const k = frets.join();
    if (!found.has(k) || found.get(k).score > score) found.set(k, { frets: [...frets], score });
  };

  for (let start = 1; start <= Math.max(1, maxFret - span + 1); start++) {
    const options = tuning.map((open, i) => {
      const o = [-1];
      if (!on[i]) return o;
      if (chordPcs.has(open % 12)) o.push(0);
      for (let f = start; f < start + span && f <= maxFret; f++) if (chordPcs.has((open + f) % 12)) o.push(f);
      return o;
    });
    const walk = (i) => {
      if (i === n) return evaluate();
      for (const f of options[i]) {
        frets[i] = f;
        walk(i + 1);
      }
    };
    walk(0);
  }

  // Drop shapes that are just a better shape with extra strings muted.
  const out = [];
  for (const v of [...found.values()].sort((a, b) => a.score - b.score)) {
    if (out.some((o) => o.frets.every((f, i) => v.frets[i] === f || v.frets[i] === -1))) continue;
    out.push(v);
    if (out.length >= limit) break;
  }
  cache.set(key, out);
  return out;
}
