<script>
  import { app, sheet, describeItem } from '../lib/state.svelte.js';
  import { chordDiagram, PRINT_PALETTE, svgDocument } from '../lib/diagram.js';
  import { downloadPng, downloadSvg, sheetSvg, slug } from '../lib/export.js';
  import { play } from '../lib/audio.js';

  // Slide-in panel. Diagrams use the print palette so what you see is what gets exported.
  let diagrams = $derived(
    sheet.items.map((item) => {
      const d = chordDiagram({ ...describeItem(item), labels: sheet.labels, notation: app.prefs.notation, palette: PRINT_PALETTE });
      return svgDocument(d.width, d.height, d.body);
    }),
  );

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= sheet.items.length) return;
    [sheet.items[i], sheet.items[j]] = [sheet.items[j], sheet.items[i]];
  }
  const remove = (i) => sheet.items.splice(i, 1);
  const hear = (item) => play(item.frets.flatMap((f, s) => (f < 0 ? [] : [item.tuning[s] + f])));

  function exportAs(kind) {
    const { svg, width, height } = sheetSvg(sheet, (item) => describeItem(item), app.prefs.notation);
    if (kind === 'svg') downloadSvg(svg, `${slug(sheet.title)}.svg`);
    else downloadPng(svg, width, height, `${slug(sheet.title)}.png`);
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (app.sheetOpen = false)} />

<aside class="drawer sheet" class:open={app.sheetOpen} aria-label="Song sheet" aria-hidden={!app.sheetOpen} inert={!app.sheetOpen}>
  <div class="head">
    <input class="title" bind:value={sheet.title} placeholder="Song title" aria-label="Song title" />
    <button class="close" onclick={() => (app.sheetOpen = false)} aria-label="Close song sheet">✕</button>
  </div>

  <div class="options">
    <label>Columns in export
      <select bind:value={sheet.cols}>{#each [2, 3, 4, 5, 6, 8] as c}<option value={c}>{c}</option>{/each}</select>
    </label>
    <label>Dot labels
      <select bind:value={sheet.labels}>
        <option value="none">None</option><option value="notes">Notes</option><option value="intervals">Intervals</option>
      </select>
    </label>
  </div>

  <div class="body">
    {#if sheet.items.length}
      {#if sheet.title}<h2 class="print-title">{sheet.title}</h2>{/if}
      <div class="grid" style="--print-cols: {sheet.cols}">
        {#each sheet.items as item, i (item.id)}
          <figure>
            <button class="diagram" onclick={() => hear(item)} aria-label="Play chord">{@html diagrams[i]}</button>
            <figcaption>
              <button onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">←</button>
              <button onclick={() => move(i, 1)} disabled={i === sheet.items.length - 1} aria-label="Move later">→</button>
              <button onclick={() => remove(i)} aria-label="Remove">✕</button>
            </figcaption>
          </figure>
        {/each}
      </div>
    {:else}
      <p class="hint">Add chord shapes with “+ Sheet” to build the chord chart for a song, then export it as an image.</p>
    {/if}
  </div>

  <div class="foot">
    <button class="primary" disabled={!sheet.items.length} onclick={() => exportAs('png')}>⬇ PNG</button>
    <button disabled={!sheet.items.length} onclick={() => exportAs('svg')}>⬇ SVG</button>
    <button disabled={!sheet.items.length} onclick={() => window.print()}>Print</button>
    <span class="spacer"></span>
    <button disabled={!sheet.items.length} onclick={() => confirm('Remove all chords from the sheet?') && (sheet.items = [])}>Clear</button>
  </div>
</aside>

<style>
  .drawer {
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 40;
    width: var(--drawer-w); max-width: 100vw;
    display: grid; grid-template-rows: auto auto 1fr auto; gap: 12px;
    padding: 16px; background: var(--card); border-left: 1px solid var(--border); box-shadow: var(--shadow-lg);
    transform: translateX(105%); transition: transform 0.25s ease;
  }
  .drawer.open { transform: none; }
  .head { display: flex; gap: 8px; }
  .title { flex: 1; font-size: 17px; font-weight: 700; }
  .close { padding: 4px 11px; }
  .options { display: flex; gap: 12px; }
  .options label { display: grid; gap: 3px; font-size: 12px; color: var(--muted); font-weight: 600; }
  .body { overflow-y: auto; min-height: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
  figure { margin: 0; display: grid; gap: 4px; justify-items: center; }
  .diagram { border: 0; padding: 0; background: none; line-height: 0; border-radius: 8px; box-shadow: var(--shadow); }
  figcaption { display: flex; gap: 2px; }
  figcaption button { padding: 1px 8px; font-size: 12px; }
  .foot { display: flex; gap: 6px; flex-wrap: wrap; }
  .spacer { flex: 1; }
  .print-title { display: none; }

  @media print {
    .drawer { position: static; transform: none; width: auto; box-shadow: none; border: 0; padding: 0; display: block; }
    .head, .options, .foot, figcaption { display: none; }
    .body { overflow: visible; }
    .print-title { display: block; text-align: center; color: #000; }
    .grid { grid-template-columns: repeat(var(--print-cols), max-content); justify-content: center; }
    .diagram { box-shadow: none; }
  }
</style>
