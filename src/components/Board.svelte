<script>
  import Fretboard from './Fretboard.svelte';
  import { app, addToSheet } from '../lib/state.svelte.js';
  import { buildTones, intervalClass, intervalLabel, mod12, noteName, slashName } from '../lib/music/theory.js';
  import { play } from '../lib/audio.js';

  const labelFor = (pc, tone) => {
    const { labels, notation } = app.prefs;
    if (labels === 'notes') return noteName(pc, notation);
    if (labels === 'intervals' && tone) return intervalLabel(tone.name);
    return '';
  };

  // Dots for a hand-picked set of frets (identify mode, or an edited shape).
  function shapeMarkers(fretsByString, tones, isMuted) {
    const out = [];
    fretsByString.forEach((f, s) => {
      if (isMuted(f)) {
        if (app.prefs.mode === 'chord') out.push({ s, f: 0, label: '', cls: 'muted' });
        return;
      }
      const pc = mod12(app.tuning[s] + f);
      const tone = tones.find((t) => t.pc === pc);
      out.push({ s, f, label: labelFor(pc, tone) || noteName(pc, app.prefs.notation), cls: tone ? intervalClass(tone.semi) : 'picked' });
    });
    return out;
  }

  let markers = $derived.by(() => {
    if (app.prefs.mode === 'identify') {
      const best = app.matches[0];
      return shapeMarkers(app.picked, best ? buildTones(best.root, best.chord) : [], (f) => f == null);
    }
    const out = [];
    const shape = app.shape;
    app.tuning.forEach((open, s) => {
      for (let f = 0; f <= app.prefs.frets; f++) {
        if (shape && (shape[s] === f || (f === 0 && shape[s] < 0))) continue; // drawn below
        const pc = mod12(open + f);
        const tone = app.tones.find((t) => t.pc === pc);
        if (!tone || app.hidden.includes(tone.name)) continue;
        out.push({ s, f, label: labelFor(pc, tone), cls: intervalClass(tone.semi), dim: !!shape });
      }
    });
    if (shape) out.push(...shapeMarkers(shape, app.tones, (f) => f < 0));
    return out;
  });

  let chordMode = $derived(app.prefs.mode === 'chord');
  let edited = $derived(chordMode && app.shape && app.voicingIndex == null);
  let shapeName = $derived(app.shapeMatch ? slashName(app.shapeMatch, app.prefs.notation) : '?');
  let playable = $derived(app.shape ?? app.voicings[0]?.frets);

  const toMidis = (frets) => frets.flatMap((f, s) => (f < 0 ? [] : [app.tuning[s] + f]));

  function playCurrent() {
    const { mode, root } = app.prefs;
    if (mode === 'chord' && playable) play(toMidis(playable));
    else if (mode === 'scale') {
      const low = Math.min(...app.tuning);
      const start = low + mod12(root - low);
      play([...app.tones.map((t) => start + t.semi), start + 12], { gap: 0.28, dur: 0.9 });
    } else play([...app.pickedMidis].sort((a, b) => a - b));
  }

  function addCurrent() {
    if (chordMode && app.shape) addToSheet(app.shape, app.shapeMatch);
    else if (chordMode && playable) addToSheet(playable);
    else if (app.prefs.mode === 'identify' && app.matches[0]) {
      addToSheet(app.tuning.map((_, s) => app.picked[s] ?? -1), app.matches[0]);
    }
    app.sheetOpen = true;
  }

  function onpick(s, f) {
    if (app.prefs.mode === 'identify') return app.pick(s, f);
    if (chordMode && app.shape) {
      app.editShape(s, f);
      if (app.shape[s] >= 0) play([app.tuning[s] + f], { dur: 1.2 });
      return;
    }
    play([app.tuning[s] + f], { dur: 1.2 });
  }

  let canAdd = $derived(
    (chordMode && (app.shape ? !!app.shapeMatch : !!playable)) || (app.prefs.mode === 'identify' && app.matches.length > 0),
  );
</script>

<section class="card board">
  <div class="head">
    <h2>{app.title}</h2>
    {#if app.prefs.mode !== 'identify'}
      <div class="intervals" role="group" aria-label="Show or hide notes">
        {#each app.tones as t}
          <button
            class="iv {intervalClass(t.semi)}"
            class:off={app.hidden.includes(t.name)}
            title="{app.hidden.includes(t.name) ? 'Show' : 'Hide'} {intervalLabel(t.name)} on the board"
            onclick={() => app.toggleInterval(t.name)}
          >
            <b>{intervalLabel(t.name)}</b><span>{noteName(t.pc, app.prefs.notation)}</span>
          </button>
        {/each}
      </div>
    {/if}
    {#if edited}<span class="tag" title="Your edited shape">Edited · {shapeName}</span>{/if}
    {#if chordMode && app.shape}<span class="hint">Tap the board to move a string, tap again to mute it</span>{/if}
    <span class="spacer"></span>
    <div class="actions">
      <button onclick={playCurrent}>▶ Play</button>
      {#if app.prefs.mode !== 'scale'}
        <button class="primary" disabled={!canAdd} onclick={addCurrent}>+ Add to sheet</button>
      {/if}
      {#if chordMode && app.shape}<button onclick={() => app.clearShape()}>Show all notes</button>{/if}
      {#if app.prefs.mode === 'identify' && app.pickedMidis.length}<button onclick={() => (app.picked = [])}>Clear</button>{/if}
    </div>
  </div>
  <Fretboard
    tuning={app.tuning}
    frets={app.prefs.frets}
    {markers}
    lefty={app.prefs.lefty}
    flip={app.prefs.flip}
    notation={app.prefs.notation}
    {onpick}
  />
</section>

<style>
  .head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 6px; }
  h2 { margin: 0; font-size: 19px; }
  .intervals { display: flex; gap: 4px; flex-wrap: wrap; }
  .iv { display: grid; justify-items: center; border: 0; border-radius: 8px; padding: 3px 9px; color: #fff; background: var(--iv-x); line-height: 1.1; }
  .iv b { font-size: 13px; }
  .iv span { font-size: 10px; opacity: 0.85; }
  .iv.iv-root { background: var(--iv-root); }
  .iv.iv-3 { background: var(--iv-3); }
  .iv.iv-5 { background: var(--iv-5); }
  .iv.iv-7 { background: var(--iv-7); }
  .iv.off { opacity: 0.25; }
  .tag { background: var(--hover); color: var(--accent); border-radius: 999px; padding: 2px 10px; font-size: 13px; font-weight: 600; }
  .spacer { flex: 1; }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  /* Keep the board in view while scrolling through shapes, when there's room for it. */
  @media (min-width: 700px) and (min-height: 700px) {
    .board { position: sticky; top: 8px; z-index: 10; }
  }
</style>
