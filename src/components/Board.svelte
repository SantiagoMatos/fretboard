<script>
  import Fretboard from './Fretboard.svelte';
  import { app, addToSheet } from '../lib/state.svelte.js';
  import { buildTones, intervalClass, intervalLabel, mod12, noteName } from '../lib/music/theory.js';
  import { play } from '../lib/audio.js';

  const labelFor = (pc, tone) => {
    const { labels, notation } = app.prefs;
    if (labels === 'notes') return noteName(pc, notation);
    if (labels === 'intervals' && tone) return intervalLabel(tone.name);
    return '';
  };

  let markers = $derived.by(() => {
    const out = [];
    if (app.prefs.mode === 'identify') {
      const best = app.matches[0];
      const tones = best ? buildTones(best.root, best.chord) : [];
      app.picked.forEach((f, s) => {
        if (f == null) return;
        const pc = mod12(app.tuning[s] + f);
        const tone = tones.find((t) => t.pc === pc);
        out.push({ s, f, label: labelFor(pc, tone) || noteName(pc, app.prefs.notation), cls: tone ? intervalClass(tone.semi) : 'picked' });
      });
      return out;
    }
    const v = app.voicing;
    app.tuning.forEach((open, s) => {
      for (let f = 0; f <= app.prefs.frets; f++) {
        const pc = mod12(open + f);
        const tone = app.tones.find((t) => t.pc === pc);
        if (!tone || app.hidden.includes(tone.name)) continue;
        out.push({ s, f, label: labelFor(pc, tone), cls: intervalClass(tone.semi), dim: v ? v.frets[s] !== f : false });
      }
    });
    return out;
  });

  let shape = $derived(app.voicing ?? app.voicings[0]);

  function playCurrent() {
    const { mode, root } = app.prefs;
    if (mode === 'chord' && shape) play(shape.frets.flatMap((f, s) => (f < 0 ? [] : [app.tuning[s] + f])));
    else if (mode === 'scale') {
      const low = Math.min(...app.tuning);
      const start = low + mod12(root - low);
      play([...app.tones.map((t) => start + t.semi), start + 12], { gap: 0.28, dur: 0.9 });
    } else play([...app.pickedMidis].sort((a, b) => a - b));
  }

  function addCurrent() {
    if (app.prefs.mode === 'chord' && shape) addToSheet(shape.frets);
    if (app.prefs.mode === 'identify' && app.matches[0]) {
      const frets = app.tuning.map((_, s) => app.picked[s] ?? -1);
      addToSheet(frets, app.matches[0].root, app.matches[0].chord.id);
    }
  }

  let canAdd = $derived((app.prefs.mode === 'chord' && !!shape) || (app.prefs.mode === 'identify' && app.matches.length > 0));
</script>

<section class="card board">
  <div class="head">
    <h2>{app.title}</h2>
    <div class="actions">
      <button onclick={playCurrent}>▶ Play</button>
      {#if app.prefs.mode !== 'scale'}
        <button class="primary" disabled={!canAdd} onclick={addCurrent}>+ Add to sheet</button>
      {/if}
      {#if app.voicing}<button onclick={() => (app.voicingIndex = null)}>Show all notes</button>{/if}
      {#if app.prefs.mode === 'identify' && app.pickedMidis.length}<button onclick={() => (app.picked = [])}>Clear</button>{/if}
    </div>
  </div>
  <div class="scroll">
    <Fretboard
      tuning={app.tuning}
      frets={app.prefs.frets}
      {markers}
      lefty={app.prefs.lefty}
      flip={app.prefs.flip}
      notation={app.prefs.notation}
      onpick={(s, f) => (app.prefs.mode === 'identify' ? app.pick(s, f) : play([app.tuning[s] + f], { dur: 1.2 }))}
    />
  </div>
</section>

<style>
  .head { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  h2 { margin: 0; font-size: 20px; }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .scroll { overflow-x: auto; }
</style>
