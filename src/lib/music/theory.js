// Pure music-theory helpers. No DOM access here, so this module is easy to test or port.

export const NOTATIONS = {
  sharp: { label: 'C C♯ D…', names: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] },
  flat: { label: 'C D♭ D…', names: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] },
  latin: { label: 'Do Re Mi…', names: ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'] },
};

export const mod12 = (n) => ((n % 12) + 12) % 12;
export const noteName = (pc, notation = 'sharp') => NOTATIONS[notation].names[mod12(pc)];

// Interval name -> semitones above the root.
export const INTERVALS = {
  '1': 0, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5, '#4': 6, 'b5': 6, '5': 7, '#5': 8, 'b6': 8,
  '6': 9, 'bb7': 9, 'b7': 10, '7': 11, 'b9': 1, '9': 2, '#9': 3, '11': 5, '#11': 6, 'b13': 8, '13': 9,
};

// Fallback name for each semitone when a note is not part of a formula.
export const CHROMATIC = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

export const intervalLabel = (name) => (name === '1' ? 'T' : name.replace(/b/g, '♭').replace(/#/g, '♯'));

// Colour family for an interval, used by CSS (iv-root, iv-3, iv-5, iv-7, iv-x).
export function intervalClass(semi) {
  if (semi === 0) return 'iv-root';
  if (semi === 3 || semi === 4) return 'iv-3';
  if (semi === 6 || semi === 7 || semi === 8) return 'iv-5';
  if (semi === 9 || semi === 10 || semi === 11) return 'iv-7';
  return 'iv-x';
}

export const CHORDS = [
  { id: 'maj', name: 'Major', symbol: '', formula: ['1', '3', '5'] },
  { id: 'min', name: 'Minor', symbol: 'm', formula: ['1', 'b3', '5'] },
  { id: 'dim', name: 'Diminished', symbol: 'dim', formula: ['1', 'b3', 'b5'] },
  { id: 'aug', name: 'Augmented', symbol: '+', formula: ['1', '3', '#5'] },
  { id: 'sus2', name: 'Sus2', symbol: 'sus2', formula: ['1', '2', '5'] },
  { id: 'sus4', name: 'Sus4', symbol: 'sus4', formula: ['1', '4', '5'] },
  { id: '5', name: 'Power', symbol: '5', formula: ['1', '5'] },
  { id: '6', name: 'Sixth', symbol: '6', formula: ['1', '3', '5', '6'] },
  { id: 'm6', name: 'Minor 6th', symbol: 'm6', formula: ['1', 'b3', '5', '6'] },
  { id: '7', name: 'Dominant 7th', symbol: '7', formula: ['1', '3', '5', 'b7'] },
  { id: 'maj7', name: 'Major 7th', symbol: 'maj7', formula: ['1', '3', '5', '7'] },
  { id: 'm7', name: 'Minor 7th', symbol: 'm7', formula: ['1', 'b3', '5', 'b7'] },
  { id: 'm7b5', name: 'Half-diminished', symbol: 'm7♭5', formula: ['1', 'b3', 'b5', 'b7'] },
  { id: 'dim7', name: 'Diminished 7th', symbol: 'dim7', formula: ['1', 'b3', 'b5', 'bb7'] },
  { id: 'mmaj7', name: 'Minor-major 7th', symbol: 'm(maj7)', formula: ['1', 'b3', '5', '7'] },
  { id: '7sus4', name: '7sus4', symbol: '7sus4', formula: ['1', '4', '5', 'b7'] },
  { id: 'add9', name: 'Add9', symbol: 'add9', formula: ['1', '3', '5', '9'] },
  { id: '9', name: 'Ninth', symbol: '9', formula: ['1', '3', '5', 'b7', '9'] },
  { id: 'm9', name: 'Minor 9th', symbol: 'm9', formula: ['1', 'b3', '5', 'b7', '9'] },
  { id: 'maj9', name: 'Major 9th', symbol: 'maj9', formula: ['1', '3', '5', '7', '9'] },
];

export const SCALES = [
  { id: 'major', name: 'Major (Ionian)', formula: ['1', '2', '3', '4', '5', '6', '7'] },
  { id: 'minor', name: 'Natural minor (Aeolian)', formula: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
  { id: 'harmonic', name: 'Harmonic minor', formula: ['1', '2', 'b3', '4', '5', 'b6', '7'] },
  { id: 'melodic', name: 'Melodic minor', formula: ['1', '2', 'b3', '4', '5', '6', '7'] },
  { id: 'penta', name: 'Major pentatonic', formula: ['1', '2', '3', '5', '6'] },
  { id: 'mpenta', name: 'Minor pentatonic', formula: ['1', 'b3', '4', '5', 'b7'] },
  { id: 'blues', name: 'Blues', formula: ['1', 'b3', '4', 'b5', '5', 'b7'] },
  { id: 'dorian', name: 'Dorian', formula: ['1', '2', 'b3', '4', '5', '6', 'b7'] },
  { id: 'phrygian', name: 'Phrygian', formula: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'] },
  { id: 'phrygdom', name: 'Phrygian dominant', formula: ['1', 'b2', '3', '4', '5', 'b6', 'b7'] },
  { id: 'lydian', name: 'Lydian', formula: ['1', '2', '3', '#4', '5', '6', '7'] },
  { id: 'mixolydian', name: 'Mixolydian', formula: ['1', '2', '3', '4', '5', '6', 'b7'] },
  { id: 'locrian', name: 'Locrian', formula: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'] },
  { id: 'whole', name: 'Whole tone', formula: ['1', '2', '3', '#4', '#5', 'b7'] },
  { id: 'dimhw', name: 'Diminished (H-W)', formula: ['1', 'b2', 'b3', '3', '#4', '5', '6', 'b7'] },
];

export const chordById = (id) => CHORDS.find((c) => c.id === id) ?? CHORDS[0];
export const scaleById = (id) => SCALES.find((s) => s.id === id) ?? SCALES[0];

/** Expand a formula from a root into tones: { name, semi, pc }. */
export function buildTones(root, def) {
  return def.formula.map((name) => ({ name, semi: INTERVALS[name], pc: mod12(root + INTERVALS[name]) }));
}

export const chordName = (root, chord, notation) => noteName(root, notation) + chord.symbol;

/**
 * Name the chords that a set of pitch classes could be.
 * Exact matches rank first, then matches with only the 5th missing; chords rooted on the bass note rank higher.
 */
export function identifyChord(pcs, bassPc = null) {
  const set = new Set(pcs.map(mod12));
  if (set.size < 2) return [];
  const results = [];
  for (const root of set) {
    for (const chord of CHORDS) {
      const tones = buildTones(root, chord);
      const chordSet = new Set(tones.map((t) => t.pc));
      const fifth = tones.find((t) => t.name === '5');
      const allIn = [...set].every((pc) => chordSet.has(pc));
      if (!allIn) continue;
      const missing = [...chordSet].filter((pc) => !set.has(pc));
      let quality;
      if (missing.length === 0) quality = 0;
      else if (missing.length === 1 && fifth && missing[0] === fifth.pc && chordSet.size >= 4) quality = 1;
      else continue;
      const score = quality * 2 + (root === bassPc ? 0 : 1) + chord.formula.length * 0.01;
      results.push({ root, chord, bassPc, score, omit5: quality === 1 });
    }
  }
  return results.sort((a, b) => a.score - b.score);
}

export function slashName(match, notation) {
  const base = chordName(match.root, match.chord, notation) + (match.omit5 ? ' (no 5)' : '');
  return match.bassPc != null && match.bassPc !== match.root ? `${base}/${noteName(match.bassPc, notation)}` : base;
}

/** Triads and 7th chords built on each degree of a 7-note scale. */
export function diatonicChords(root, scale) {
  if (scale.formula.length !== 7) return [];
  const pcs = buildTones(root, scale).map((t) => t.pc);
  const stack = (i, count) => Array.from({ length: count }, (_, k) => pcs[(i + k * 2) % 7]);
  return pcs.map((pc, i) => {
    const pick = (notes) => identifyChord(notes, pc).find((m) => m.root === pc && !m.omit5);
    return { degree: i + 1, triad: pick(stack(i, 3)), seventh: pick(stack(i, 4)) };
  });
}
