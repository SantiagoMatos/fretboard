<script>
  import { app } from '../lib/state.svelte.js';
  import { CHORDS, SCALES, chordById, chordName, intervalClass, intervalLabel, noteName } from '../lib/music/theory.js';

  const CHORD_GROUPS = [
    { label: 'Triads', ids: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', '5'] },
    { label: 'Sixths and sevenths', ids: ['6', 'm6', '7', 'maj7', 'm7', 'm7b5', 'dim7', 'mmaj7', '7sus4'] },
    { label: 'Extended', ids: ['add9', '9', 'm9', 'maj9'] },
  ];
  const QUICK_CHORDS = ['maj', 'min', '7', 'maj7', 'm7'];
  const QUICK_SCALES = ['major', 'minor', 'penta', 'mpenta', 'blues'];
  const short = { maj: 'Major', min: 'Minor', penta: 'Penta', mpenta: 'Minor penta', major: 'Major', minor: 'Minor', blues: 'Blues' };

  let isChord = $derived(app.prefs.mode === 'chord');
  let current = $derived(isChord ? app.prefs.chordId : app.prefs.scaleId);
  const choose = (id) => app.set(isChord ? { chordId: id } : { scaleId: id });
  const label = (id) => short[id] ?? chordById(id).symbol;
</script>

<section class="picker">
  {#if app.prefs.mode === 'identify'}
    <p class="hint">Tap one fret per string on the board (tap again to clear) and the chord name appears below it.</p>
  {:else}
    <div class="row">
      <div class="roots">
        {#each { length: 12 } as _, pc}
          <button class="chip root" class:active={app.prefs.root === pc} onclick={() => app.set({ root: pc })}>
            {noteName(pc, app.prefs.notation)}
          </button>
        {/each}
      </div>
      {#if isChord && app.recent.length}
        <select class="recent" aria-label="Recent chords" value="" onchange={(e) => { const r = app.recent[e.currentTarget.value]; app.set({ root: r.root, chordId: r.chordId }); }}>
          <option value="" disabled>Recent…</option>
          {#each app.recent as r, i}<option value={i}>{chordName(r.root, chordById(r.chordId), app.prefs.notation)}</option>{/each}
        </select>
      {/if}
    </div>

    <div class="row">
      <select class="type" aria-label={isChord ? 'Chord type' : 'Scale'} value={current} onchange={(e) => choose(e.currentTarget.value)}>
        {#if isChord}
          {#each CHORD_GROUPS as g}
            <optgroup label={g.label}>
              {#each g.ids.map(chordById) as c}<option value={c.id}>{c.name}{c.symbol ? ` (${c.symbol})` : ''}</option>{/each}
            </optgroup>
          {/each}
        {:else}
          {#each SCALES as s}<option value={s.id}>{s.name}</option>{/each}
        {/if}
      </select>
      {#each isChord ? QUICK_CHORDS : QUICK_SCALES as id}
        <button class="chip small" class:active={current === id} onclick={() => choose(id)}>{label(id)}</button>
      {/each}

      <span class="spacer"></span>

      <div class="intervals" aria-label="Show or hide intervals">
        {#each app.tones as t}
          <button
            class="iv {intervalClass(t.semi)}"
            class:off={app.hidden.includes(t.name)}
            title="{app.hidden.includes(t.name) ? 'Show' : 'Hide'} {intervalLabel(t.name)}"
            onclick={() => app.toggleInterval(t.name)}
          >
            <b>{intervalLabel(t.name)}</b><span>{noteName(t.pc, app.prefs.notation)}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .picker { display: grid; gap: 8px; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .roots { display: flex; flex-wrap: wrap; gap: 4px; }
  .root { min-width: 42px; padding: 4px 8px; }
  .recent { margin-left: auto; }
  .type { min-width: 200px; font-weight: 600; }
  .spacer { flex: 1; }
  .intervals { display: flex; gap: 4px; flex-wrap: wrap; }
  .iv { display: grid; justify-items: center; border: 0; border-radius: 8px; padding: 3px 9px; color: #fff; background: var(--iv-x); line-height: 1.1; }
  .iv b { font-size: 13px; }
  .iv span { font-size: 10px; opacity: 0.85; }
  .iv.iv-root { background: var(--iv-root); }
  .iv.iv-3 { background: var(--iv-3); }
  .iv.iv-5 { background: var(--iv-5); }
  .iv.iv-7 { background: var(--iv-7); }
  .iv.off { opacity: 0.25; }
  @media (max-width: 560px) {
    .roots { display: grid; grid-template-columns: repeat(6, 1fr); width: 100%; }
    .root { min-width: 0; }
    .type { flex: 1 1 100%; }
  }
</style>
