<script>
  import { app, sheet, songs, describeItem, openSong, newSong, duplicateSong, deleteSong, songsFile, importSongs } from '../lib/state.svelte.js';
  import { chordDiagram, PRINT_PALETTE, svgDocument } from '../lib/diagram.js';
  import { downloadJson, downloadPng, downloadSvg, sheetSvg, slug } from '../lib/export.js';
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

  // 'sheet' shows the open song, 'songs' the saved library.
  let view = $state('sheet');
  let fileInput;
  let notice = $state('');

  const sorted = $derived([...songs].sort((a, b) => b.updated - a.updated));
  const when = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  function open(id) {
    openSong(id);
    view = 'sheet';
  }
  function create() {
    newSong();
    view = 'sheet';
  }
  function remove_(song) {
    if (confirm(`Delete “${song.title || 'Untitled'}”? This can’t be undone.`)) deleteSong(song.id);
  }
  const saveFile = () => downloadJson(songsFile([$state.snapshot(sheet)]), `${slug(sheet.title)}.json`);
  const saveAll = () => downloadJson(songsFile($state.snapshot(songs)), `fretboard-songs-${new Date().toISOString().slice(0, 10)}.json`);

  async function importFile(e) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const n = importSongs(await file.text());
      notice = n === 1 ? 'Song imported.' : `${n} songs imported.`;
      view = n === 1 ? 'sheet' : 'songs';
    } catch (err) {
      notice = err.message;
    }
    setTimeout(() => (notice = ''), 4000);
  }

  function exportAs(kind) {
    const { svg, width, height } = sheetSvg(sheet, (item) => describeItem(item), app.prefs.notation);
    if (kind === 'svg') downloadSvg(svg, `${slug(sheet.title)}.svg`);
    else downloadPng(svg, width, height, `${slug(sheet.title)}.png`);
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (app.sheetOpen = false)} />

<aside class="drawer sheet" class:open={app.sheetOpen} aria-label="Song sheet" aria-hidden={!app.sheetOpen} inert={!app.sheetOpen}>
  <div class="head">
    {#if view === 'sheet'}
      <button class="songs-btn" onclick={() => (view = 'songs')} aria-label="All songs">☰ Songs</button>
      <input class="title" bind:value={sheet.title} placeholder="Song title" aria-label="Song title" />
    {:else}
      <button class="songs-btn" onclick={() => (view = 'sheet')} aria-label="Back to the open song">← Back</button>
      <h2 class="list-title">My songs</h2>
    {/if}
    <button class="close" onclick={() => (app.sheetOpen = false)} aria-label="Close song sheet">✕</button>
  </div>

  {#if notice}<p class="notice" role="status">{notice}</p>{/if}

  {#if view === 'songs'}
    <div class="options">
      <button class="primary" onclick={create}>+ New song</button>
      <button onclick={() => fileInput.click()}>Open file…</button>
      <button disabled={!songs.length} onclick={saveAll} title="Download every song as one file (backup)">Back up all</button>
    </div>

    <div class="body">
      {#if sorted.length}
        <ul class="songs">
          {#each sorted as song (song.id)}
            <li class:current={song.id === sheet.id}>
              <button class="song" onclick={() => open(song.id)}>
                <strong>{song.title || 'Untitled'}</strong>
                <span>{song.items.length} {song.items.length === 1 ? 'chord' : 'chords'} · {when(song.updated)}</span>
              </button>
              <button class="icon" onclick={() => duplicateSong(song.id)} aria-label="Duplicate {song.title}" title="Duplicate">⧉</button>
              <button class="icon" onclick={() => remove_(song)} aria-label="Delete {song.title}" title="Delete">🗑</button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="hint">No saved songs yet. Songs are saved automatically as soon as you add a chord.</p>
      {/if}
    </div>

    <p class="hint foot-hint">Songs are kept in this browser. Use “Back up all” or “Save file” to move them to another device or share them.</p>
  {:else}
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
        <p class="hint">Add chord shapes with “+ Sheet” to build the chord chart for a song, then export it as an image. Songs save automatically.</p>
      {/if}
    </div>

    <div class="foot">
      <button class="primary" disabled={!sheet.items.length} onclick={() => exportAs('png')}>⬇ PNG</button>
      <button disabled={!sheet.items.length} onclick={() => exportAs('svg')}>⬇ SVG</button>
      <button disabled={!sheet.items.length} onclick={() => window.print()}>Print</button>
      <button disabled={!sheet.items.length} onclick={saveFile} title="Download this song as a file you can open again later">Save file</button>
      <span class="spacer"></span>
      <button disabled={!sheet.items.length} onclick={() => confirm('Remove all chords from this song?') && (sheet.items = [])}>Clear</button>
    </div>
  {/if}

  <input type="file" accept=".json,application/json" bind:this={fileInput} onchange={importFile} hidden />
</aside>

<style>
  .drawer {
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 40;
    width: var(--drawer-w); max-width: 100vw;
    display: flex; flex-direction: column; gap: 12px;
    padding: 16px; background: var(--card); border-left: 1px solid var(--border); box-shadow: var(--shadow-lg);
    transform: translateX(105%); transition: transform 0.25s ease;
  }
  .drawer.open { transform: none; }
  .head { display: flex; gap: 8px; }
  .title { flex: 1; font-size: 17px; font-weight: 700; }
  .close { padding: 4px 11px; }
  .songs-btn { white-space: nowrap; padding: 4px 10px; }
  .list-title { flex: 1; margin: 0; font-size: 17px; align-self: center; }
  .notice { margin: 0; padding: 6px 10px; border-radius: 8px; background: var(--hover); font-size: 13px; }
  .songs { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .songs li { display: flex; gap: 4px; align-items: stretch; }
  .songs .song { flex: 1; min-width: 0; display: grid; text-align: left; gap: 1px; padding: 8px 12px; }
  .songs .song strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .songs .song span { color: var(--muted); font-size: 12px; }
  .songs li.current .song { border-color: var(--accent); box-shadow: inset 3px 0 0 var(--accent); }
  .icon { padding: 4px 9px; }
  .options { display: flex; gap: 8px 12px; flex-wrap: wrap; align-items: end; }
  .options label { display: grid; gap: 3px; font-size: 12px; color: var(--muted); font-weight: 600; }
  .body { flex: 1; overflow-y: auto; min-height: 0; }
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
    .head, .options, .foot, figcaption, .notice, .foot-hint { display: none; }
    .body { overflow: visible; }
    .print-title { display: block; text-align: center; color: #000; }
    .grid { grid-template-columns: repeat(var(--print-cols), max-content); justify-content: center; }
    .diagram { box-shadow: none; }
  }
</style>
