<script>
  import { app } from '../lib/state.svelte.js';
  import { CHORDS, SCALES, intervalClass, intervalLabel, noteName } from '../lib/music/theory.js';

  const MODES = [
    { id: 'chord', label: 'Chords' },
    { id: 'scale', label: 'Scales' },
    { id: 'identify', label: 'Identify' },
  ];
</script>

<section class="card picker">
  <div class="tabs" role="tablist">
    {#each MODES as m}
      <button role="tab" aria-selected={app.prefs.mode === m.id} class:active={app.prefs.mode === m.id} onclick={() => app.set({ mode: m.id })}>
        {m.label}
      </button>
    {/each}
  </div>

  {#if app.prefs.mode === 'identify'}
    <p class="hint">Tap one fret per string on the board (tap again to clear) and the matching chord names appear below.</p>
  {:else}
    <div class="roots">
      {#each { length: 12 } as _, pc}
        <button class="chip root" class:active={app.prefs.root === pc} onclick={() => app.set({ root: pc })}>
          {noteName(pc, app.prefs.notation)}
        </button>
      {/each}
    </div>

    <div class="types">
      {#if app.prefs.mode === 'chord'}
        {#each CHORDS as c}
          <button class="chip" class:active={app.prefs.chordId === c.id} onclick={() => app.set({ chordId: c.id })} title={c.formula.map(intervalLabel).join(' ')}>
            {c.name}
          </button>
        {/each}
      {:else}
        {#each SCALES as s}
          <button class="chip" class:active={app.prefs.scaleId === s.id} onclick={() => app.set({ scaleId: s.id })}>{s.name}</button>
        {/each}
      {/if}
    </div>

    <div class="intervals" aria-label="Show or hide intervals">
      {#each app.tones as t}
        <button class="iv {intervalClass(t.semi)}" class:off={app.hidden.includes(t.name)} onclick={() => app.toggleInterval(t.name)}>
          <b>{intervalLabel(t.name)}</b>
          <span>{noteName(t.pc, app.prefs.notation)}</span>
        </button>
      {/each}
      <span class="hint">tap to show/hide</span>
    </div>
  {/if}
</section>

<style>
  .picker { display: grid; gap: 14px; }
  .tabs { display: flex; gap: 4px; background: var(--bg); padding: 4px; border-radius: 10px; width: fit-content; }
  .tabs button { border: 0; background: none; padding: 7px 16px; border-radius: 7px; font-weight: 600; color: var(--muted); }
  .tabs button.active { background: var(--card); color: var(--fg); box-shadow: var(--shadow); }
  .roots, .types, .intervals { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .root { min-width: 46px; }
  .iv { display: grid; justify-items: center; border: 0; border-radius: 10px; padding: 6px 12px; color: #fff; background: var(--iv-x); line-height: 1.15; }
  .iv span { font-size: 11px; opacity: 0.85; }
  .iv.iv-root { background: var(--iv-root); }
  .iv.iv-3 { background: var(--iv-3); }
  .iv.iv-5 { background: var(--iv-5); }
  .iv.iv-7 { background: var(--iv-7); }
  .iv.off { opacity: 0.25; }
</style>
