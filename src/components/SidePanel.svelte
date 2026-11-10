<script>
  import { app } from '../lib/state.svelte.js';
  import { diatonicChords, noteName, slashName } from '../lib/music/theory.js';

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  let diatonic = $derived(app.prefs.mode === 'scale' ? diatonicChords(app.prefs.root, app.def) : []);
  const goto = (m) => m && app.set({ mode: 'chord', root: m.root, chordId: m.chord.id });
</script>

{#if app.prefs.mode === 'scale'}
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
{:else if app.prefs.mode === 'identify'}
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

<style>
  h3 { margin: 0 0 12px; font-size: 16px; }
  .degrees { display: flex; flex-wrap: wrap; gap: 12px; }
  .degree { display: grid; gap: 4px; justify-items: center; }
  .roman { font-weight: 700; color: var(--muted); font-size: 13px; }
  .matches { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
</style>
