<script>
  import { app, sheet, describeItem } from '../lib/state.svelte.js';
  import { chordDiagram, PRINT_PALETTE, svgDocument } from '../lib/diagram.js';
  import { downloadPng, downloadSvg, sheetSvg, slug } from '../lib/export.js';
  import { play } from '../lib/audio.js';

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

<section class="card sheet">
  <div class="head">
    <h3>Song sheet</h3>
    <input class="title" bind:value={sheet.title} placeholder="Song title" aria-label="Song title" />
    <label>Columns
      <select bind:value={sheet.cols}>{#each [2, 3, 4, 5, 6, 8] as c}<option value={c}>{c}</option>{/each}</select>
    </label>
    <label>Labels
      <select bind:value={sheet.labels}>
        <option value="none">None</option><option value="notes">Notes</option><option value="intervals">Intervals</option>
      </select>
    </label>
    <div class="actions">
      <button class="primary" disabled={!sheet.items.length} onclick={() => exportAs('png')}>⬇ PNG</button>
      <button disabled={!sheet.items.length} onclick={() => exportAs('svg')}>⬇ SVG</button>
      <button disabled={!sheet.items.length} onclick={() => window.print()}>Print</button>
      <button disabled={!sheet.items.length} onclick={() => confirm('Remove all chords from the sheet?') && (sheet.items = [])}>Clear</button>
    </div>
  </div>

  {#if sheet.items.length}
    <div class="print-area">
      {#if sheet.title}<h2 class="print-title">{sheet.title}</h2>{/if}
      <div class="grid" style="grid-template-columns: repeat({sheet.cols}, minmax(0, max-content))">
        {#each sheet.items as item, i (item.id)}
          <figure>
            <button class="diagram" onclick={() => hear(item)} aria-label="Play chord">{@html diagrams[i]}</button>
            <figcaption>
              <button onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move left">←</button>
              <button onclick={() => move(i, 1)} disabled={i === sheet.items.length - 1} aria-label="Move right">→</button>
              <button onclick={() => remove(i)} aria-label="Remove">✕</button>
            </figcaption>
          </figure>
        {/each}
      </div>
    </div>
  {:else}
    <p class="hint">Add chord shapes with “+ sheet” to build a chord chart for a song, then export it as an image.</p>
  {/if}
</section>

<style>
  .head { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin-bottom: 14px; }
  h3 { margin: 0 8px 6px 0; font-size: 16px; }
  .title { flex: 1 1 180px; font-size: 16px; font-weight: 600; }
  label { display: grid; gap: 3px; font-size: 12px; color: var(--muted); font-weight: 600; }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .grid { display: grid; gap: 12px; justify-content: start; overflow-x: auto; }
  figure { margin: 0; display: grid; gap: 4px; justify-items: center; }
  .diagram { border: 0; padding: 0; background: none; line-height: 0; border-radius: 8px; box-shadow: var(--shadow); }
  figcaption { display: flex; gap: 2px; }
  figcaption button { padding: 2px 8px; font-size: 12px; }
  .print-title { display: none; }

  @media print {
    .head, figcaption { display: none; }
    .print-title { display: block; text-align: center; color: #000; }
    .diagram { box-shadow: none; }
  }
</style>
