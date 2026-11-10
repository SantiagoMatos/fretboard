<script>
  import { app, addToSheet } from '../lib/state.svelte.js';
  import { chordDiagram, SCREEN_PALETTE, svgDocument } from '../lib/diagram.js';
  import { chordName, intervalLabel, mod12, noteName } from '../lib/music/theory.js';
  import { play } from '../lib/audio.js';

  const POSITIONS = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open strings', test: (v) => v.opens },
    { id: 'low', label: 'Frets 1–4', test: (v) => !v.opens && v.minF <= 4 },
    { id: 'mid', label: '5–8', test: (v) => !v.opens && v.minF >= 5 && v.minF <= 8 },
    { id: 'high', label: '9+', test: (v) => !v.opens && v.minF >= 9 },
  ];

  let name = $derived(chordName(app.prefs.root, app.def, app.prefs.notation));

  // Facts about each shape used by the filters.
  let shapes = $derived(
    app.voicings.map((v, index) => {
      const sounding = v.frets.flatMap((f, s) => (f < 0 ? [] : [{ f, midi: app.tuning[s] + f }]));
      const fretted = sounding.filter((x) => x.f > 0).map((x) => x.f);
      const bassPc = mod12(Math.min(...sounding.map((x) => x.midi)));
      return { ...v, index, opens: sounding.some((x) => x.f === 0), minF: fretted.length ? Math.min(...fretted) : 0, bass: app.tones.find((t) => t.pc === bassPc)?.name };
    }),
  );

  let visible = $derived(
    shapes.filter((v) => {
      const pos = POSITIONS.find((p) => p.id === app.filters.position);
      return (!pos?.test || pos.test(v)) && (app.filters.bass === 'any' || v.bass === app.filters.bass);
    }),
  );

  let svgs = $derived(
    visible.map((v) => {
      const d = chordDiagram({ name, frets: v.frets, tuning: app.tuning, tones: app.tones, labels: app.prefs.labels, notation: app.prefs.notation, palette: SCREEN_PALETTE });
      return svgDocument(d.width, d.height, d.body);
    }),
  );

  function select(v) {
    app.selectVoicing(v.index);
    play(v.frets.flatMap((f, s) => (f < 0 ? [] : [app.tuning[s] + f])));
  }
  const setFilter = (key, value) => (app.filters[key] = value);
</script>

<section class="card shapes">
  <div class="filters">
    <h3>Chord shapes <small>{visible.length} of {shapes.length}</small></h3>

    <div class="group" aria-label="Strings to use">
      <span class="lbl">Strings</span>
      {#each app.tuning as midi, s}
        <button
          class="chip small string"
          class:active={!app.off.includes(s)}
          title={app.off.includes(s) ? 'Use this string' : "Don't use this string"}
          onclick={() => app.toggleString(s)}
        >{noteName(midi, app.prefs.notation)}</button>
      {/each}
    </div>

    <div class="group" aria-label="Neck position">
      <span class="lbl">Position</span>
      {#each POSITIONS as p}
        <button class="chip small" class:active={app.filters.position === p.id} onclick={() => setFilter('position', p.id)}>{p.label}</button>
      {/each}
    </div>

    <div class="group" aria-label="Bass note">
      <span class="lbl">Bass</span>
      <button class="chip small" class:active={app.filters.bass === 'any'} onclick={() => setFilter('bass', 'any')}>Any</button>
      {#each app.tones as t}
        <button class="chip small" class:active={app.filters.bass === t.name} onclick={() => setFilter('bass', t.name)}>{intervalLabel(t.name)}</button>
      {/each}
    </div>
  </div>

  {#if visible.length}
    <div class="strip">
      {#each visible as v, i (v.frets.join())}
        <div class="shape" class:active={app.voicingIndex === v.index}>
          <button class="diagram" onclick={() => select(v)} aria-label="Shape {i + 1}">{@html svgs[i]}</button>
          <button class="add" onclick={() => { addToSheet(v.frets); app.sheetOpen = true; }} title="Add to song sheet">+ Sheet</button>
        </div>
      {/each}
    </div>
  {:else if shapes.length}
    <p class="hint">No shapes match these filters.</p>
  {:else}
    <p class="hint">No playable shape found with these strings. Try switching more strings on.</p>
  {/if}
</section>

<style>
  .filters { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; margin-bottom: 10px; }
  h3 { margin: 0; font-size: 16px; }
  h3 small { font-weight: 400; color: var(--muted); font-size: 13px; margin-left: 4px; }
  .group { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .lbl { font-size: 12px; font-weight: 600; color: var(--muted); margin-right: 2px; }
  .string:not(.active) { text-decoration: line-through; color: var(--muted); }
  .strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x proximity; }
  .shape { flex: none; display: grid; gap: 4px; justify-items: center; border-radius: 12px; padding: 4px; border: 2px solid transparent; scroll-snap-align: start; }
  .shape.active { border-color: var(--accent); }
  .diagram { border: 0; padding: 0; background: none; line-height: 0; border-radius: 8px; }
  .diagram:hover { background: var(--hover); }
  .add { font-size: 12px; padding: 2px 10px; }
</style>
