// Tiny Web Audio "plucked string" synth — no samples to download.
let ctx;
let master;

function init() {
  ctx ??= new AudioContext();
  if (!master) {
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function pluck(midi, t, dur) {
  const freq = 440 * 2 ** ((midi - 69) / 12);
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(freq * 10, 12000), t);
  filter.frequency.exponentialRampToValueAtTime(freq * 1.2, t + dur * 0.6);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(filter).connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Play MIDI notes; `gap` seconds between notes (small = strum, large = melody). */
export function play(midis, { gap = 0.03, dur = 1.8 } = {}) {
  if (!midis.length) return;
  init();
  const t0 = ctx.currentTime + 0.02;
  midis.forEach((m, i) => pluck(m, t0 + i * gap, dur));
}
