// Instruments and tunings. Strings are listed in physical order, starting from the string
// nearest your thumb (the one drawn at the bottom in tab view), e.g. guitar low E first.
// To add an instrument, append an entry here — nothing else needs to change.

export const INSTRUMENTS = [
  {
    id: 'timple', name: 'Timple', frets: 12,
    tunings: [
      { name: 'Standard (G C E A D)', notes: 'G4 C5 E4 A4 D5' },
      { name: 'Lanzarote (A D F♯ B E)', notes: 'A4 D5 F#4 B4 E5' },
    ],
  },
  {
    id: 'guitar', name: 'Guitar', frets: 15,
    tunings: [
      { name: 'Standard (E A D G B E)', notes: 'E2 A2 D3 G3 B3 E4' },
      { name: 'Drop D', notes: 'D2 A2 D3 G3 B3 E4' },
      { name: 'Half step down', notes: 'D#2 G#2 C#3 F#3 A#3 D#4' },
      { name: 'DADGAD', notes: 'D2 A2 D3 G3 A3 D4' },
      { name: 'Open G', notes: 'D2 G2 D3 G3 B3 D4' },
      { name: 'Open D', notes: 'D2 A2 D3 F#3 A3 D4' },
    ],
  },
  {
    id: 'ukulele', name: 'Ukulele', frets: 12,
    tunings: [
      { name: 'Standard (G C E A)', notes: 'G4 C4 E4 A4' },
      { name: 'Low G', notes: 'G3 C4 E4 A4' },
      { name: 'D tuning (A D F♯ B)', notes: 'A4 D4 F#4 B4' },
      { name: 'Baritone (D G B E)', notes: 'D3 G3 B3 E4' },
    ],
  },
  {
    id: 'bass', name: 'Bass', frets: 15,
    tunings: [
      { name: '4-string (E A D G)', notes: 'E1 A1 D2 G2' },
      { name: '5-string (B E A D G)', notes: 'B0 E1 A1 D2 G2' },
      { name: 'Drop D', notes: 'D1 A1 D2 G2' },
    ],
  },
  {
    id: 'mandolin', name: 'Mandolin', frets: 15,
    tunings: [{ name: 'Standard (G D A E)', notes: 'G3 D4 A4 E5' }],
  },
  {
    id: 'bandurria', name: 'Bandurria / Laúd', frets: 12,
    tunings: [
      { name: 'Bandurria (G♯ C♯ F♯ B E A)', notes: 'G#3 C#4 F#4 B4 E5 A5' },
      { name: 'Laúd (G♯ C♯ F♯ B E A)', notes: 'G#2 C#3 F#3 B3 E4 A4' },
    ],
  },
  {
    id: 'cavaquinho', name: 'Cavaquinho', frets: 15,
    tunings: [{ name: 'Standard (D G B D)', notes: 'D4 G4 B4 D5' }],
  },
];

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#4" -> MIDI number (60 = C4). Returns null if it can't be read. */
export function parseNote(text) {
  const m = /^([A-Ga-g])([#♯b♭]?)(-?\d)$/.exec(text.trim());
  if (!m) return null;
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + LETTERS[m[1].toUpperCase()] + acc;
}

/** "E2 A2 D3 ..." -> [40, 45, 50, ...], or null if any note is invalid. */
export function parseTuning(text) {
  const parts = text.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 10) return null;
  const midis = parts.map(parseNote);
  return midis.includes(null) ? null : midis;
}

export const instrumentById = (id) => INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];

/** Re-entrant tunings (ukulele, timple) don't have the lowest note on the first string. */
export const isReentrant = (tuning) => tuning.some((m, i) => i > 0 && m < tuning[i - 1]);
