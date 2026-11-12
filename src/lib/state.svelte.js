// App state. Components read `app` and `sheet` directly; anything derived updates by itself.
import { untrack } from 'svelte';
import { instrumentById, isReentrant, parseTuning } from './music/instruments.js';
import { buildTones, chordById, chordName, identifyChord, mod12, noteName, scaleById } from './music/theory.js';
import { findVoicings } from './music/voicings.js';
import { setVoice } from './audio.js';

const PREFS_KEY = 'fretboard:prefs';
const SHEET_KEY = 'fretboard:sheet'; // old single sheet, migrated into the song library
const SONGS_KEY = 'fretboard:songs';
const CURRENT_KEY = 'fretboard:current';
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
  labels: 'notes', notation: 'flat', frets: 12, lefty: false, flip: false,
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

// Saved settings from before flats became the default switch to flats once (v2).
function loadPrefs() {
  const saved = load(PREFS_KEY, {});
  if (!saved.v && saved.notation === 'sharp') delete saved.notation;
  return { ...saved, v: 2 };
}

class AppState {
  prefs = $state({ ...DEFAULTS, ...loadPrefs(), ...fromHash() });
  hidden = $state([]); // interval names switched off
  voicingIndex = $state(null); // shape picked from the list (null once edited)
  shape = $state(null); // frets per string being shown/edited on the board, -1 = muted
  off = $state([]); // string indexes switched off for the shape finder
  filters = $state({ position: 'all' });
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
    if (changed('chordId', 'scaleId', 'mode')) this.hidden = [];
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

// ---- Songs ---------------------------------------------------------------
// `songs` is the saved library. `sheet` is the open song: edits to it are copied
// into the library automatically, so there is no Save button to forget.

// Settings every song has. Songs saved before a setting existed get its default when opened.
const SONG_DEFAULTS = { title: 'My song', cols: 4, labels: 'none', capo: 0, bpm: 90, beats: 4, pattern: 'downs', items: [] };
const blankSong = () => ({ ...SONG_DEFAULTS, items: [], id: crypto.randomUUID(), updated: Date.now() });
const withDefaults = (song) => ({ ...SONG_DEFAULTS, ...song });

function initialSongs() {
  const stored = load(SONGS_KEY, null);
  if (Array.isArray(stored)) return stored;
  const old = load(SHEET_KEY, null); // from before the library existed
  return old?.items?.length ? [{ ...blankSong(), ...old, id: crypto.randomUUID() }] : [];
}

export const songs = $state(initialSongs());
const startId = load(CURRENT_KEY, null);
export const sheet = $state(withDefaults(structuredClone($state.snapshot(songs.find((s) => s.id === startId) ?? songs[0] ?? blankSong()))));

/** Songs worth keeping: anything with chords or a title of its own. */
const worthSaving = (s) => s.items.length > 0 || (s.title.trim() && s.title !== 'My song');

export function openSong(id) {
  const song = songs.find((s) => s.id === id);
  if (song) Object.assign(sheet, withDefaults(structuredClone($state.snapshot(song))));
}

export function newSong() {
  Object.assign(sheet, blankSong());
}

export function duplicateSong(id) {
  const song = songs.find((s) => s.id === id);
  if (!song) return;
  const copy = { ...structuredClone($state.snapshot(song)), id: crypto.randomUUID(), title: song.title + ' (copy)', updated: Date.now() };
  songs.unshift(copy);
  openSong(copy.id);
}

export function deleteSong(id) {
  const i = songs.findIndex((s) => s.id === id);
  if (i >= 0) songs.splice(i, 1);
  if (sheet.id !== id) return;
  const latest = songs.reduce((a, b) => (b.updated > (a?.updated ?? -1) ? b : a), null);
  latest ? openSong(latest.id) : newSong();
}

// ---- Song files -----------------------------------------------------------
// A .json file holding one or more songs: for backups, moving to another device, or sharing.

const FILE_FORMAT = 'fretboard-songs';

export function songsFile(list) {
  const clean = list.map(({ id, updated, ...song }) => song);
  return JSON.stringify({ format: FILE_FORMAT, version: 1, songs: clean }, null, 1);
}

const isInt = (v) => Number.isInteger(v);

function cleanItem(item) {
  if (!item || !Array.isArray(item.frets) || !Array.isArray(item.tuning)) return null;
  if (item.frets.length !== item.tuning.length || item.frets.length < 1 || item.frets.length > 12) return null;
  if (!item.frets.every((f) => isInt(f) && f >= -1 && f <= 24) || !item.tuning.every((m) => isInt(m) && m >= 0 && m <= 127)) return null;
  if (!isInt(item.root)) return null;
  return {
    id: crypto.randomUUID(),
    root: mod12(item.root),
    chordId: chordById(item.chordId).id,
    bass: isInt(item.bass) ? mod12(item.bass) : null,
    frets: item.frets,
    tuning: item.tuning,
    instrument: instrumentById(item.instrument).id,
  };
}

/** Reads a songs file, adds its songs to the library and opens the first one. Returns how many were added. */
export function importSongs(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file isn’t a song file (it isn’t valid JSON).');
  }
  if (data?.format !== FILE_FORMAT || !Array.isArray(data.songs)) throw new Error('This file isn’t a Fretboard song file.');
  const now = Date.now();
  const added = data.songs.map((s, i) => ({
    ...blankSong(),
    updated: now - i, // keeps the file's order in the newest-first list
    title: typeof s?.title === 'string' ? s.title.slice(0, 200) : 'Imported song',
    cols: [2, 3, 4, 5, 6, 8].includes(s?.cols) ? s.cols : 4,
    labels: ['none', 'notes', 'intervals'].includes(s?.labels) ? s.labels : 'none',
    capo: isInt(s?.capo) && s.capo >= 0 && s.capo <= 11 ? s.capo : 0,
    bpm: isInt(s?.bpm) && s.bpm >= 30 && s.bpm <= 300 ? s.bpm : 90,
    beats: [1, 2, 3, 4, 6, 8].includes(s?.beats) ? s.beats : 4,
    pattern: typeof s?.pattern === 'string' ? s.pattern : 'downs',
    items: (Array.isArray(s?.items) ? s.items : []).map(cleanItem).filter(Boolean),
  }));
  if (!added.length) throw new Error('No songs found in this file.');
  songs.unshift(...added);
  openSong(added[0].id);
  return added.length;
}

/** `match` comes from identifyChord; without it the selected chord is used. */
export function addToSheet(frets, match = null) {
  const root = match?.root ?? app.prefs.root;
  const chordId = match?.chord.id ?? app.prefs.chordId;
  const bass = match?.bassPc != null && match.bassPc !== root ? match.bassPc : null;
  const item = { id: crypto.randomUUID(), root, chordId, bass, frets: [...frets], tuning: [...app.tuning], instrument: app.prefs.instrument };
  // With a capo the board's shape would sound higher, so find the same chord again above the capo.
  if (sheet.capo) item.frets = refit(item, root, bass, shapePosition(frets) - sheet.capo, sheet.capo) ?? item.frets;
  sheet.items.push(item);
}

/** Everything a diagram needs for a saved sheet item. Frets are counted from the capo. */
export function describeItem(item, notation = app.prefs.notation, capo = sheet.capo) {
  const chord = chordById(item.chordId);
  const slash = (pc) => (pc != null ? '/' + noteName(pc, notation) : '');
  const name = chordName(item.root, chord, notation) + slash(item.bass);
  // With a capo, also name the shape the hand makes (e.g. B♭ played as an A shape on capo 1).
  const shape = capo ? chordName(mod12(item.root - capo), chord, notation) + slash(item.bass == null ? null : mod12(item.bass - capo)) : null;
  return { name, shape, frets: item.frets, tuning: item.tuning.map((m) => m + capo), tones: buildTones(item.root, chord) };
}

/** Sounding notes of an item, in string order. */
export const itemMidis = (item, capo = sheet.capo) => item.frets.flatMap((f, s) => (f < 0 ? [] : [item.tuning[s] + capo + f]));

// ---- Transpose and capo ------------------------------------------------------

/** Average fret of the sounding strings: roughly where on the neck the hand sits. */
function shapePosition(frets) {
  const used = frets.filter((f) => f >= 0);
  return used.length ? used.reduce((a, b) => a + b, 0) / used.length : 0;
}

/**
 * Finds a shape for `root` (with optional slash `bass`) near fret `target`, counted from `capo`.
 * Prefers easy shapes, the same strings as before, and the right bass note. Returns frets or null.
 */
function refit(item, root, bass, target, capo) {
  const chord = chordById(item.chordId);
  const tuning = item.tuning.map((m) => m + capo);
  const options = findVoicings(tuning, buildTones(root, chord), { maxFret: Math.max(5, 15 - capo) });
  if (!options.length) return null;
  const goal = Math.min(Math.max(target, 0), 9);
  const sameStrings = (f) => f.every((x, s) => (x < 0) === (item.frets[s] < 0));
  const lowestPc = (f) => {
    const notes = f.flatMap((x, s) => (x < 0 ? [] : [tuning[s] + x]));
    return mod12(Math.min(...notes));
  };
  // The lowest note should be the slash bass if there is one, otherwise the root (except on
  // re-entrant tunings like timple and ukulele, where the lowest note isn't on the bass side anyway).
  const wantBass = bass ?? (isReentrant(tuning) ? null : root);
  let best = null;
  const easiest = options[0].score;
  options.forEach((v) => {
    const score =
      (v.score - easiest) +
      Math.abs(shapePosition(v.frets) - goal) * 0.2 +
      (sameStrings(v.frets) ? 0 : 0.3) +
      (wantBass != null && lowestPc(v.frets) !== wantBass ? 3 : 0);
    if (!best || score < best.score) best = { score, frets: v.frets };
  });
  return [...best.frets];
}

/** Moves every chord in the open song up (+) or down (−) by semitones. */
export function transposeSong(semis) {
  for (const item of sheet.items) {
    const root = mod12(item.root + semis);
    const bass = item.bass == null ? null : mod12(item.bass + semis);
    const frets = refit(item, root, bass, shapePosition(item.frets) + semis, sheet.capo);
    if (!frets) continue; // no shape for it on this tuning: leave the chord as it was
    Object.assign(item, { root, bass, frets });
  }
}

/** Puts the capo on another fret. Chords keep sounding the same; shapes change to match. */
export function setCapo(capo) {
  const delta = capo - sheet.capo;
  if (!delta) return;
  for (const item of sheet.items) {
    // Moving the capo up lets the hand move down; taking it off shouldn't push shapes up the neck.
    const pos = shapePosition(item.frets);
    const frets = refit(item, item.root, item.bass, Math.min(pos, pos - delta), capo);
    if (frets) item.frets = frets;
  }
  sheet.capo = capo;
}

$effect.root(() => {
  $effect(() => {
    const prefs = $state.snapshot(app.prefs);
    save(PREFS_KEY, prefs);
    history.replaceState(null, '', toHash(prefs));
  });
  // Copy the open song into the library whenever it changes.
  $effect(() => {
    const snap = $state.snapshot(sheet);
    save(CURRENT_KEY, snap.id);
    untrack(() => {
      const i = songs.findIndex((s) => s.id === snap.id);
      if (i < 0) {
        if (worthSaving(snap)) songs.unshift({ ...snap, updated: Date.now() });
      } else if (JSON.stringify({ ...songs[i], updated: 0 }) !== JSON.stringify({ ...snap, updated: 0 })) {
        songs[i] = { ...snap, updated: Date.now() };
      }
    });
  });
  $effect(() => save(SONGS_KEY, $state.snapshot(songs)));
  $effect(() => save(RECENT_KEY, $state.snapshot(app.recent)));
  $effect(() => setVoice(app.prefs.instrument)); // the board plays with the chosen instrument's sound
});

window.addEventListener('hashchange', () => app.set(fromHash()));
