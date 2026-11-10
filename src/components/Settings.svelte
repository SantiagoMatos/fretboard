<script>
  import { app } from '../lib/state.svelte.js';
  import { INSTRUMENTS, parseTuning } from '../lib/music/instruments.js';
  import { NOTATIONS } from '../lib/music/theory.js';

  // Start a custom tuning from the current one, so it only needs small edits.
  function pickTuning(index) {
    const current = app.instrument.tunings[app.prefs.tuningIndex]?.notes;
    app.set(index === -1 && !app.prefs.customTuning ? { tuningIndex: index, customTuning: current } : { tuningIndex: index });
  }

  let customValid = $derived(!!parseTuning(app.prefs.customTuning));
</script>

<header class="settings">
  <h1>Fretboard</h1>

  <label>
    Instrument
    <select value={app.prefs.instrument} onchange={(e) => app.set({ instrument: e.currentTarget.value })}>
      {#each INSTRUMENTS as i}<option value={i.id}>{i.name}</option>{/each}
    </select>
  </label>

  <label>
    Tuning
    <select value={app.prefs.tuningIndex} onchange={(e) => pickTuning(Number(e.currentTarget.value))}>
      {#each app.instrument.tunings as t, idx}<option value={idx}>{t.name}</option>{/each}
      <option value={-1}>Custom…</option>
    </select>
  </label>

  {#if app.prefs.tuningIndex === -1}
    <label>
      Notes (low → high string)
      <input
        class:invalid={!customValid}
        placeholder="e.g. D2 A2 D3 G3 B3 E4"
        value={app.prefs.customTuning}
        oninput={(e) => app.set({ customTuning: e.currentTarget.value })}
      />
    </label>
  {/if}

  <label>
    Names
    <select value={app.prefs.notation} onchange={(e) => app.set({ notation: e.currentTarget.value })}>
      {#each Object.entries(NOTATIONS) as [id, n]}<option value={id}>{n.label}</option>{/each}
    </select>
  </label>

  <label>
    Labels
    <select value={app.prefs.labels} onchange={(e) => app.set({ labels: e.currentTarget.value })}>
      <option value="notes">Notes</option>
      <option value="intervals">Intervals</option>
      <option value="none">None</option>
    </select>
  </label>

  <label>
    Frets
    <select value={app.prefs.frets} onchange={(e) => app.set({ frets: Number(e.currentTarget.value) })}>
      {#each [12, 15, 19, 22] as f}<option value={f}>{f}</option>{/each}
    </select>
  </label>

  <label class="check"><input type="checkbox" checked={app.prefs.lefty} onchange={(e) => app.set({ lefty: e.currentTarget.checked })} /> Left-handed</label>
  <label class="check"><input type="checkbox" checked={app.prefs.flip} onchange={(e) => app.set({ flip: e.currentTarget.checked })} /> Flip strings</label>
</header>

<style>
  .settings { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: end; }
  h1 { font-size: 22px; margin: 0 12px 2px 0; letter-spacing: -0.02em; }
  label { display: grid; gap: 3px; font-size: 12px; color: var(--muted); font-weight: 600; }
  label.check { display: flex; align-items: center; gap: 6px; color: var(--fg); font-weight: 500; font-size: 14px; padding-bottom: 7px; }
  input:not([type]) { width: 210px; }
  .invalid { border-color: var(--iv-root); }
</style>
