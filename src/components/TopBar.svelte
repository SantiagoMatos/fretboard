<script>
  import { app, sheet } from '../lib/state.svelte.js';
  import { INSTRUMENTS, parseTuning } from '../lib/music/instruments.js';
  import { NOTATIONS } from '../lib/music/theory.js';

  const MODES = [
    { id: 'chord', label: 'Chords' },
    { id: 'scale', label: 'Scales' },
    { id: 'identify', label: 'Identify' },
  ];

  let settingsOpen = $state(false);
  let customValid = $derived(!!parseTuning(app.prefs.customTuning));

  // Start a custom tuning from the current one, so it only needs small edits.
  function pickTuning(index) {
    const current = app.instrument.tunings[app.prefs.tuningIndex]?.notes;
    app.set(index === -1 && !app.prefs.customTuning ? { tuningIndex: index, customTuning: current } : { tuningIndex: index });
  }

  function closeOutside(e) {
    if (settingsOpen && !e.target.closest('.settings')) settingsOpen = false;
  }
</script>

<svelte:window onclick={closeOutside} onkeydown={(e) => e.key === 'Escape' && (settingsOpen = false)} />

<header class="topbar">
  <h1>Fretboard</h1>

  <select aria-label="Instrument" value={app.prefs.instrument} onchange={(e) => app.set({ instrument: e.currentTarget.value })}>
    {#each INSTRUMENTS as i}<option value={i.id}>{i.name}</option>{/each}
  </select>

  <select aria-label="Tuning" value={app.prefs.tuningIndex} onchange={(e) => pickTuning(Number(e.currentTarget.value))}>
    {#each app.instrument.tunings as t, idx}<option value={idx}>{t.name}</option>{/each}
    <option value={-1}>Custom…</option>
  </select>

  {#if app.prefs.tuningIndex === -1}
    <input
      class="custom"
      class:invalid={!customValid}
      aria-label="Custom tuning, low to high string"
      placeholder="D2 A2 D3 G3 B3 E4"
      value={app.prefs.customTuning}
      oninput={(e) => app.set({ customTuning: e.currentTarget.value })}
    />
  {/if}

  <div class="segmented" role="tablist">
    {#each MODES as m}
      <button role="tab" aria-selected={app.prefs.mode === m.id} class:active={app.prefs.mode === m.id} onclick={() => app.set({ mode: m.id })}>
        {m.label}
      </button>
    {/each}
  </div>

  <span class="spacer"></span>

  <div class="settings">
    <button class="icon" aria-label="Display settings" aria-expanded={settingsOpen} onclick={() => (settingsOpen = !settingsOpen)}>⚙</button>
    {#if settingsOpen}
      <div class="popover">
        <label>Note names
          <select value={app.prefs.notation} onchange={(e) => app.set({ notation: e.currentTarget.value })}>
            {#each Object.entries(NOTATIONS) as [id, n]}<option value={id}>{n.label}</option>{/each}
          </select>
        </label>
        <label>Dot labels
          <select value={app.prefs.labels} onchange={(e) => app.set({ labels: e.currentTarget.value })}>
            <option value="notes">Notes</option><option value="intervals">Intervals</option><option value="none">None</option>
          </select>
        </label>
        <label>Frets
          <select value={app.prefs.frets} onchange={(e) => app.set({ frets: Number(e.currentTarget.value) })}>
            {#each [12, 15, 19, 22] as f}<option value={f}>{f}</option>{/each}
          </select>
        </label>
        <label class="check"><input type="checkbox" checked={app.prefs.lefty} onchange={(e) => app.set({ lefty: e.currentTarget.checked })} /> Left-handed</label>
        <label class="check"><input type="checkbox" checked={app.prefs.flip} onchange={(e) => app.set({ flip: e.currentTarget.checked })} /> Flip strings</label>
      </div>
    {/if}
  </div>

  <button class="sheet-btn" class:primary={app.sheetOpen} onclick={() => (app.sheetOpen = !app.sheetOpen)}>
    ♫ Sheet <span class="count">{sheet.items.length}</span>
  </button>
</header>

<style>
  .topbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  h1 { font-size: 20px; margin: 0 8px 0 0; letter-spacing: -0.02em; }
  .custom { width: 200px; }
  .invalid { border-color: var(--iv-root); }
  .segmented { display: flex; gap: 2px; background: var(--card); padding: 3px; border-radius: 10px; box-shadow: var(--shadow); }
  .segmented button { border: 0; background: none; padding: 5px 12px; border-radius: 7px; font-weight: 600; color: var(--muted); }
  .segmented button.active { background: var(--accent); color: #fff; }
  .spacer { flex: 1; }
  .settings { position: relative; }
  .icon { font-size: 17px; padding: 3px 10px; }
  .popover {
    position: absolute; right: 0; top: calc(100% + 6px); z-index: 30; width: 220px;
    display: grid; gap: 10px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; box-shadow: var(--shadow-lg);
  }
  .popover label { display: grid; gap: 3px; font-size: 12px; color: var(--muted); font-weight: 600; }
  .popover label.check { display: flex; align-items: center; gap: 6px; color: var(--fg); font-weight: 500; font-size: 14px; }
  .sheet-btn { font-weight: 600; }
  .count { display: inline-block; min-width: 20px; padding: 0 6px; border-radius: 999px; background: var(--bg); color: var(--fg); font-size: 12px; text-align: center; }
  .sheet-btn.primary .count { background: rgba(255, 255, 255, 0.25); color: #fff; }
  @media (max-width: 560px) {
    h1 { width: 100%; }
    .segmented { order: 5; width: 100%; }
    .segmented button { flex: 1; }
  }
</style>
