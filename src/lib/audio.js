// Plucked-string synth with no samples to download.
//
// Each note is a Karplus-Strong string: a short burst of noise runs round a delay line one
// period long, losing a little treble every lap, which sounds like a real plucked string.
// The notes are rendered once into buffers and cached, then played through a body
// resonance and a small room reverb.

let ctx;
let master; // everything ends here
let dry; // instruments → body EQ → master (+ reverb send)

// ---- Voices ---------------------------------------------------------------------
// bright: how much treble the pluck has (0–1). sustain: ring time multiplier.
// pos: where along the string it's plucked (0.5 = middle, small = near the bridge = brighter).
// course: doubled strings (mandolin, bandurria), detuned a few cents for the chorus shimmer.
// body: [frequency, gain dB] of the main body resonance.
const VOICES = {
  guitar: { bright: 0.55, sustain: 1, pos: 0.14, body: [110, 4] },
  timple: { bright: 0.62, sustain: 0.9, pos: 0.16, body: [240, 4] },
  ukulele: { bright: 0.45, sustain: 0.85, pos: 0.2, body: [220, 3] },
  bass: { bright: 0.35, sustain: 1.6, pos: 0.18, body: [70, 3] },
  mandolin: { bright: 0.78, sustain: 0.8, pos: 0.1, body: [300, 3], course: 4 },
  bandurria: { bright: 0.75, sustain: 0.85, pos: 0.1, body: [260, 3], course: 4 },
  cavaquinho: { bright: 0.7, sustain: 0.85, pos: 0.12, body: [280, 3] },
};
let currentVoice = 'guitar';

/** Sets the voice used when play() / playSong() aren't told one. */
export function setVoice(id) {
  if (VOICES[id]) currentVoice = id;
}

// ---- Audio graph ------------------------------------------------------------------

function init() {
  ctx ??= new AudioContext();
  if (!master) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);

    // Gentle top-end roll-off, like hearing the instrument from a couple of metres away.
    const air = ctx.createBiquadFilter();
    air.type = 'lowpass';
    air.frequency.value = 7500;
    air.Q.value = 0.5;
    air.connect(master);

    const reverb = ctx.createConvolver();
    reverb.buffer = roomImpulse(1.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.16;
    reverb.connect(wet).connect(master);

    dry = ctx.createGain();
    dry.connect(air);
    dry.connect(reverb);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

/** Stereo decaying noise: a cheap but convincing small-room reverb. */
function roomImpulse(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += 0.35 * (Math.random() * 2 - 1 - lp); // darker tail
      d[i] = lp * Math.pow(1 - t, 3) * (i < 200 ? i / 200 : 1);
    }
  }
  return buf;
}

// One body EQ per voice, shared by all its notes.
const bodies = {};
function bodyFor(id) {
  if (!bodies[id]) {
    const [freq, gain] = VOICES[id].body;
    const peak = ctx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = freq;
    peak.Q.value = 1.2;
    peak.gain.value = gain;
    const cut = ctx.createBiquadFilter(); // remove rumble below the instrument's range
    cut.type = 'highpass';
    cut.frequency.value = id === 'bass' ? 30 : 60;
    peak.connect(cut).connect(dry);
    bodies[id] = peak;
  }
  return bodies[id];
}

// ---- Karplus-Strong string ---------------------------------------------------------

const cache = new Map();

/** Seconds for a note to fade by 60 dB: low strings ring longer than high ones. */
const ringTime = (freq, voice) => Math.min(7, Math.max(1.2, 3.6 * Math.pow(110 / freq, 0.45) * voice.sustain));

function stringBuffer(midi, voiceId, cents = 0) {
  const key = `${voiceId}|${midi}|${cents}`;
  if (cache.has(key)) return cache.get(key);

  const v = VOICES[voiceId];
  const sr = ctx.sampleRate;
  const freq = 440 * 2 ** ((midi - 69 + cents / 100) / 12);
  const t60 = ringTime(freq, v);
  const len = Math.floor(sr * Math.min(t60, 6));
  const out = new Float32Array(len);

  // Loop filter: y = (1-s)·x[n] + s·x[n-1]. Smaller s keeps more treble; it adds s samples of delay.
  const s = 0.5 - 0.35 * v.bright * Math.min(1, 220 / freq + 0.3);
  // The total loop delay must be one period. A first-order allpass supplies the fractional part.
  const period = sr / freq - s;
  const n = Math.max(2, Math.floor(period - 0.1));
  const frac = period - n;
  const ap = (1 - frac) / (1 + frac);
  // Per-lap loss so the note dies away in about t60 seconds.
  const loss = Math.pow(0.001, 1 / (freq * t60));

  // Excitation: noise, softened for darker voices, then a comb for the pluck position.
  const line = new Float32Array(n);
  let lp = 0;
  const soft = 0.25 + 0.7 * v.bright;
  for (let i = 0; i < n; i++) {
    lp += soft * (Math.random() * 2 - 1 - lp);
    line[i] = lp;
  }
  const comb = Math.max(1, Math.round(v.pos * n));
  const plucked = line.map((x, i) => x - (i >= comb ? line[i - comb] : 0) * 0.9);
  let mean = 0;
  for (const x of plucked) mean += x / n;
  for (let i = 0; i < n; i++) line[i] = plucked[i] - mean; // no DC thump

  let idx = 0, prev = 0, apIn = 0, apOut = 0;
  for (let i = 0; i < len; i++) {
    const x = line[idx];
    out[i] = x;
    const avg = loss * ((1 - s) * x + s * prev);
    prev = x;
    const y = ap * avg + apIn - ap * apOut;
    apIn = avg;
    apOut = y;
    line[idx] = y;
    idx = idx + 1 === n ? 0 : idx + 1;
  }
  // Normalise so every note has the same starting level, and fade the tail to silence.
  let peak = 0;
  for (let i = 0; i < Math.min(len, 2000); i++) peak = Math.max(peak, Math.abs(out[i]));
  const fade = Math.floor(sr * 0.05);
  for (let i = 0; i < len; i++) {
    out[i] /= peak || 1;
    if (i > len - fade) out[i] *= (len - i) / fade;
  }

  const buf = ctx.createBuffer(1, len, sr);
  buf.copyToChannel(out, 0);
  cache.set(key, buf);
  return buf;
}

/**
 * Plays one string. `string` (0 = thumb side) places it slightly left/right in stereo.
 * Returns a function that damps it (used when the same string is struck again).
 */
function pluck(midi, t, { dur = 2, vol = 0.3, voice = currentVoice, string = 2, strings = 6, dest } = {}) {
  const v = VOICES[voice] ?? VOICES.guitar;
  const pan = ctx.createStereoPanner();
  pan.pan.value = strings > 1 ? ((string / (strings - 1)) * 2 - 1) * 0.25 : 0;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  gain.connect(pan).connect(dest ?? bodyFor(voice));

  const sources = (v.course ? [-v.course / 2, v.course / 2] : [0]).map((cents) => {
    const src = ctx.createBufferSource();
    src.buffer = stringBuffer(midi, voice, cents);
    src.connect(gain);
    src.start(t);
    return src;
  });
  if (v.course) gain.gain.value = vol * 0.7;

  const ring = sources[0].buffer.duration;
  const end = Math.min(t + dur, t + ring);
  // A short release instead of a hard cut, like lifting the finger.
  gain.gain.setValueAtTime(gain.gain.value, end);
  gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);
  sources.forEach((src) => src.stop(end + 0.15));

  return (at) => {
    if (at >= end) return;
    gain.gain.cancelScheduledValues(at);
    gain.gain.setValueAtTime(gain.gain.value, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
    sources.forEach((src) => src.stop(at + 0.05));
  };
}

// A little human looseness, so strums don't sound like a machine.
const jitter = (amount) => (Math.random() * 2 - 1) * amount;

/**
 * Play MIDI notes in string order; `gap` seconds between notes (small = strum, large = melody).
 * `voice` is an instrument id (defaults to the one set with setVoice).
 */
export function play(midis, { gap = 0.03, dur = 2.4, voice = currentVoice } = {}) {
  if (!midis.length) return;
  init();
  const t0 = ctx.currentTime + 0.02;
  midis.forEach((m, i) => pluck(m, t0 + i * gap + jitter(0.003), { dur, vol: 0.32 + jitter(0.03), voice, string: i, strings: midis.length }));
}

// ---- Song player -----------------------------------------------------------
// Strum patterns, written as eighth notes: D = down strum, U = up strum, A = one string (arpeggio),
// '.' = rest, W = one long strum that rings for the whole chord. Patterns repeat over the chord's beats.
export const PATTERNS = [
  { id: 'whole', label: 'One strum per chord', slots: 'W' },
  { id: 'downs', label: 'Down on every beat', slots: 'D.' },
  { id: 'downup', label: 'Down-up eighths', slots: 'DU' },
  { id: 'folk', label: 'Folk (D · D U · U D U)', slots: 'D.DU.UDU' },
  { id: 'arp', label: 'Arpeggio (fingerpicked)', slots: 'A' },
];

/**
 * Plays a list of chords in time. `getChords()` returns one array per chord with a MIDI note per string
 * (null = muted), thumb side first, and is read again at the start of each loop so edits apply.
 * Returns a stop() function.
 */
export function playSong(getChords, { bpm = 90, beats = 4, pattern = 'downs', loop = false, voice = currentVoice, onChord, onEnd } = {}) {
  init();
  const bus = ctx.createGain();
  bus.connect(bodyFor(voice));
  const timers = [];
  const eighth = 30 / bpm;
  const slots = (PATTERNS.find((p) => p.id === pattern) ?? PATTERNS[0]).slots;
  const ringing = new Map(); // string index → damp() of the note still sounding on it
  let stopped = false;
  let strings = 6; // strings on the instrument, for stereo placement

  function hit(midi, t, s, strings, opts) {
    ringing.get(s)?.(t); // a string can only sound one note at a time
    ringing.set(s, pluck(midi, t, { ...opts, voice, string: s, strings, dest: bus }));
  }

  function strum(chord, t, dir, dur) {
    // Up strums are lighter and catch only the top strings; downs hit everything.
    const order = dir === 'U' ? chord.slice(-Math.min(4, chord.length)).reverse() : chord;
    const speed = dir === 'U' ? 0.009 : 0.013;
    const vol = (dir === 'U' ? 0.17 : 0.26) + jitter(0.025);
    const t0 = t + jitter(0.004);
    order.forEach((note, i) => hit(note.midi, t0 + i * speed, note.s, strings, { dur, vol }));
  }

  function schedulePass(t0) {
    const chords = getChords();
    if (!chords.length) return finish();
    const chordLen = beats * 2; // in eighths
    chords.forEach((midis, c) => {
      const start = t0 + c * chordLen * eighth;
      strings = midis.length;
      at(start, () => onChord?.(c));
      const chord = midis.map((midi, s) => ({ midi, s })).filter((n) => n.midi != null);
      if (!chord.length) return;
      // Arpeggio order: lowest-pitched string first, then up and back down through the others.
      const byPitch = [...chord].sort((a, b) => a.midi - b.midi);
      const arp = byPitch.length > 2 ? [...byPitch, ...byPitch.slice(1, -1).reverse()] : byPitch;
      for (let e = 0; e < chordLen; e++) {
        const slot = slots[e % slots.length];
        const t = start + e * eighth;
        if (slot === 'W') {
          if (e === 0) strum(chord, t, 'D', chordLen * eighth + 0.6);
        } else if (slot === 'D' || slot === 'U') strum(chord, t, slot, chordLen * eighth);
        else if (slot === 'A') {
          const note = arp[e % arp.length];
          hit(note.midi, t + jitter(0.004), note.s, strings, { dur: chordLen * eighth, vol: 0.3 + jitter(0.03) });
        }
      }
    });
    const end = t0 + chords.length * chordLen * eighth;
    if (loop) at(end - 0.25, () => schedulePass(end));
    else at(end, finish);
  }

  function at(time, fn) {
    timers.push(setTimeout(() => !stopped && fn(), Math.max(0, (time - ctx.currentTime) * 1000)));
  }

  function finish() {
    if (stopped) return;
    stopped = true;
    timers.forEach(clearTimeout);
    onEnd?.();
  }

  function stop() {
    if (stopped) return;
    finish();
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    setTimeout(() => bus.disconnect(), 400);
  }

  schedulePass(ctx.currentTime + 0.08);
  return stop;
}
