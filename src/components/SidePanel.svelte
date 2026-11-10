<script>
  import { app, addToSheet } from '../lib/state.svelte.js';
  import { chordDiagram, SCREEN_PALETTE, svgDocument } from '../lib/diagram.js';
  import { chordById, chordName, diatonicChords, noteName, slashName } from '../lib/music/theory.js';
  import { play } from '../lib/audio.js';

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  let name = $derived(chordName(app.prefs.root, app.def, app.prefs.notation));
  let diagrams = $derived(
    app.voicings.map((v) => {
      const d = chordDiagram({ name, frets: v.frets, tuning: app.tuning, tones: app.tones, labels: app.prefs.labels, notation: app.prefs.notation, palette: SCREEN_PALETTE });
      return svgDocument(d.width, d.height, d.body);
    }),
  );
  let diatonic = $derived(app.prefs.mode === 'scale' ? diatonicChords(app.prefs.root, app.def) : []);

  function select(i) {
    app.voicingIndex = app.voicingIndex === i ? null : i;
    play(app.voicings[i].frets.flatMap((f, s) => (f < 0 ? [] : [app.tuning[s] + f])));
  }
  const goto = (m) => m && app.set({ mode: 'chord', root: m.root, chordId: m.chord.id });
</script>

{#if app.prefs.mode === 'chord'}
  <section class="card">
    <h3>Chord shapes <small>{app.voicings.length ? 'tap to hear and highlight' : ''}</small></h3>
    {#if app.voicings.length}
      <div class="shapes">
        {#each diagrams as svg, i}
          <div class="shape" class:active={app.voicingIndex === i}>
            <button class="diagram" onclick={() => select(i)} aria-label="Shape {i + 1}">{@html svg}</button>
            <button class="add" onclick={() => addToSheet(app.voicings[i].frets)} title="Add to song sheet">+ sheet</button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="hint">No playable shape found for this chord on this tuning (it may need more strings than the instrument has).</p>
    {/if}
  </section>
{:else if app.prefs.mode === 'scale'}
  <section class="card">
    <h3>Chords in this scale</h3>
    {#if diatonic.length}
      <div class="degrees">
        {#each diatonic as d, i}
          <div class="degree">
            <span class="roman">{ROMAN[i]}</span>
            <button class="chip" onclick={() => goto(d.triad)} disabled={!d.triad}>{d.triad ? slashName(d.triad, app.prefs.notation) : '—'}</button>
            <button class="chip" onclick={() => goto(d.seventh)} disabled={!d.seventh}>{d.seventh ? slashName(d.seventh, app.prefs.notation) : '—'}</button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="hint">Chord building works for 7-note scales.</p>
    {/if}
  </section>
{:else}
  <section class="card">
    <h3>Possible chords</h3>
    {#if app.matches.length}
      <div class="matches">
        {#each app.matches as m, i}
          <button class="chip" class:active={i === 0} onclick={() => goto(m)}>{slashName(m, app.prefs.notation)}</button>
        {/each}
      </div>
    {:else if app.pickedMidis.length}
      <p class="hint">
        Notes: {[...new Set(app.pickedMidis.map((m) => noteName(m, app.prefs.notation)))].join(' · ')} — no chord name matches yet.
      </p>
    {:else}
      <p class="hint">Nothing selected yet.</p>
    {/if}
  </section>
{/if}

{#if app.recent.length}
  <section class="recent">
    <span class="hint">Recent:</span>
    {#each app.recent as r}
      <button class="chip small" onclick={() => app.set({ mode: 'chord', root: r.root, chordId: r.chordId })}>
        {chordName(r.root, chordById(r.chordId), app.prefs.notation)}
      </button>
    {/each}
  </section>
{/if}

<style>
  h3 { margin: 0 0 12px; font-size: 16px; }
  h3 small { font-weight: 400; color: var(--muted); font-size: 13px; margin-left: 6px; }
  .shapes { display: flex; flex-wrap: wrap; gap: 10px; }
  .shape { display: grid; gap: 4px; justify-items: center; border-radius: 12px; padding: 4px; border: 2px solid transparent; }
  .shape.active { border-color: var(--accent); }
  .diagram { border: 0; padding: 0; background: none; line-height: 0; border-radius: 8px; }
  .diagram:hover { background: var(--hover); }
  .add { font-size: 12px; padding: 3px 10px; }
  .degrees { display: flex; flex-wrap: wrap; gap: 12px; }
  .degree { display: grid; gap: 4px; justify-items: center; }
  .roman { font-weight: 700; color: var(--muted); font-size: 13px; }
  .matches, .recent { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
</style>
