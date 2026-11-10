// App state. Components read `app` and `sheet` directly; anything derived updates by itself.
import { instrumentById, parseTuning } from './music/instruments.js';
import { buildTones, chordById, chordName, identifyChord, mod12, noteName, scaleById } from './music/theory.js';
import { findVoicings } from './music/voicings.js';

const PREFS_KEY = 'fretboard:prefs';
const SHEET_KEY = 'fretboard:sheet';
const RECENT_KEY = 'fretboard:recent';

function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode): the app still works, it just won't remember
  }
}

const DEFAULTS = {
  instrument: 'timple', tuningIndex: 0, customTuning: '', mode: 'chord', root: 0, chordId: 'maj', scaleId: 'major',
  labels: 'notes', notation: 'sharp', frets: 12, lefty: false, flip: false,
};

// Shareable part of the state lives in the URL hash: #i=guitar&m=chord&r=0&c=maj
const HASH_KEYS = { i: 'instrument', t: 'tuningIndex', tu: 'customTuning', m: 'mode', r: 'root', c: 'chordId', s: 'scaleId' };
const NUMERIC = new Set(['tuningIndex', 'root']);

function fromHash() {
  const out = {};
  for (const [k, v] of new URLSearchParams(location.hash.slice(1))) {
    const key = HASH_KEYS[k];
    if (key) out[key] = NUMERIC.has(key) ? Number(v) : v;
  }
  return out;
}
function toHash(prefs) {
  const p = new URLSearchParams();
  for (const [k, key] of Object.entries(HASH_KEYS)) {
    if (key === 'customTuning' && prefs.tuningIndex !== -1) continue;
    if (key === 'chordId' && prefs.mode !== 'chord') continue;
    if (key === 'scaleId' && prefs.mode !== 'scale') continue;
    p.set(k, prefs[key]);
  }
  return '#' + p.toString();
}

class AppState {
  prefs = $state({ ...DEFAULTS, ...load(PREFS_KEY, {}), ...fromHash() });
  hidden = $state([]); // interval names switched off
  voicingIndex = $state(null); // shape picked from the list (null once edited)
  shape = $state(null); // frets per string being shown/edited on the board, -1 = muted
  off = $state([]); // string indexes switched off for the shape finder
  filters = $state({ position: 'all', bass: 'any' });
  sheetOpen = $state(false);
  picked = $state([]); // identify mode: fret per string, or null
  recent = $state(load(RECENT_KEY, []));

  instrument = $derived(instrumentById(this.prefs.instrument));
  tuning = $derived(
    (this.prefs.tuningIndex === -1 && parseTuning(this.prefs.customTuning)) ||
      parseTuning((this.instrument.tunings[this.prefs.tuningIndex] ?? this.instrument.tunings[0]).notes),
  );
  def = $derived(this.prefs.mode === 'scale' ? scaleById(this.prefs.scaleId) : chordById(this.prefs.chordId));
  tones = $derived(buildTones(this.prefs.root, this.def));
  voicings = $derived(
    this.prefs.mode === 'chord'
      ? findVoicings(this.tuning, this.tones, { maxFret: this.prefs.frets, enabled: this.tuning.map((_, i) => !this.off.includes(i)) })
      : [],
  );

  shapeMidis = $derived(this.shape ? this.shape.flatMap((f, s) => (f < 0 ? [] : [this.tuning[s] + f])) : []);
  /** What the (possibly edited) shape is: the selected chord if it still fits, else the best guess. */
  shapeMatch = $derived.by(() => {
    if (this.shapeMidis.length < 2) return null;
    const ms = identifyChord(this.shapeMidis, mod12(Math.min(...this.shapeMidis)));
    return ms.find((m) => m.root === this.prefs.root && m.chord.id === this.prefs.chordId) ?? ms[0] ?? null;
  });

  pickedMidis = $derived(this.picked.flatMap((f, s) => (f == null ? [] : [this.tuning[s] + f])));
  matches = $derived.by(() => {
    if (this.prefs.mode !== 'identify' || this.pickedMidis.length < 2) return [];
    const bass = mod12(Math.min(...this.pickedMidis));
    return identifyChord(this.pickedMidis, bass).slice(0, 8);
  });

  title = $derived.by(() => {
    const { mode, root, notation } = this.prefs;
    if (mode === 'chord') return `${chordName(root, this.def, notation)} — ${this.def.name}`;
    if (mode === 'scale') return `${chordName(root, { symbol: '' }, notation)} ${this.def.name}`;
    return 'Identify a chord';
  });

  /** Update preferences and reset whatever depends on what changed. */
  set(patch) {
    const p = this.prefs;
    const changed = (...keys) => keys.some((k) => k in patch && patch[k] !== p[k]);
    if (changed('instrument') && !('tuningIndex' in patch)) patch.tuningIndex = 0;
    if (changed('instrument', 'tuningIndex', 'customTuning')) {
      this.picked = [];
      this.off = [];
    }
    if (changed('instrument', 'tuningIndex', 'customTuning', 'root', 'chordId', 'mode', 'frets')) this.clearShape();
    if (changed('chordId', 'scaleId', 'mode')) {
      this.hidden = [];
      this.filters.bass = 'any'; // the old bass interval may not exist in the new chord
    }
    const chordChanged = changed('root', 'chordId', 'mode');
    Object.assign(p, patch);
    if (chordChanged && p.mode === 'chord') {
      // Only remember chords you stay on, not ones clicked through on the way (A → Am).
      clearTimeout(this.#recentTimer);
      this.#recentTimer = setTimeout(() => this.remember(p.root, p.chordId), 1500);
    }
  }

  #recentTimer;

  remember(root, chordId) {
    const rest = this.recent.filter((r) => !(r.root === root && r.chordId === chordId));
    this.recent = [{ root, chordId }, ...rest].slice(0, 12);
  }

  clearShape() {
    this.voicingIndex = null;
    this.shape = null;
  }

  selectVoicing(i) {
    if (this.voicingIndex === i) return this.clearShape();
    this.voicingIndex = i;
    this.shape = [...this.voicings[i].frets];
  }

  /** Tap on the board while a shape is shown: move that string there, or mute it if tapped again. */
  editShape(s, f) {
    const next = [...this.shape];
    next[s] = next[s] === f ? -1 : f;
    this.shape = next;
    const k = next.join();
    const i = this.voicings.findIndex((v) => v.frets.join() === k);
    this.voicingIndex = i < 0 ? null : i;
  }

  toggleString(s) {
    this.off = this.off.includes(s) ? this.off.filter((i) => i !== s) : [...this.off, s];
    this.clearShape();
  }

  toggleInterval(name) {
    this.hidden = this.hidden.includes(name) ? this.hidden.filter((n) => n !== name) : [...this.hidden, name];
  }

  pick(s, f) {
    const next = Array.from({ length: this.tuning.length }, (_, i) => this.picked[i] ?? null);
    next[s] = next[s] === f ? null : f;
    this.picked = next;
  }
}

export const app = new AppState();

export const sheet = $state(load(SHEET_KEY, { title: 'My song', cols: 4, labels: 'none', items: [] }));

/** `match` comes from identifyChord; without it the selected chord is used. */
export function addToSheet(frets, match = null) {
  const root = match?.root ?? app.prefs.root;
  const chordId = match?.chord.id ?? app.prefs.chordId;
  const bass = match?.bassPc != null && match.bassPc !== root ? match.bassPc : null;
  sheet.items.push({ id: crypto.randomUUID(), root, chordId, bass, frets: [...frets], tuning: [...app.tuning], instrument: app.prefs.instrument });
}

/** Everything a diagram needs for a saved sheet item. */
export function describeItem(item, notation = app.prefs.notation) {
  const chord = chordById(item.chordId);
  const bass = item.bass != null ? '/' + noteName(item.bass, notation) : '';
  return { name: chordName(item.root, chord, notation) + bass, frets: item.frets, tuning: item.tuning, tones: buildTones(item.root, chord) };
}

$effect.root(() => {
  $effect(() => {
    const prefs = $state.snapshot(app.prefs);
    save(PREFS_KEY, prefs);
    history.replaceState(null, '', toHash(prefs));
  });
  $effect(() => save(SHEET_KEY, $state.snapshot(sheet)));
  $effect(() => save(RECENT_KEY, $state.snapshot(app.recent)));
});

window.addEventListener('hashchange', () => app.set(fromHash()));
