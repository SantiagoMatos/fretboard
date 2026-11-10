<script>
  import { app } from '../lib/state.svelte.js';
  import { chordById, chordName, noteName, scaleById } from '../lib/music/theory.js';

  // Chords grouped by family, scales by kind. Each group becomes one column.
  const CHORD_GROUPS = [
    { label: 'Major', ids: ['maj', '6', 'maj7', 'add9', 'maj9'] },
    { label: 'Minor', ids: ['min', 'm6', 'm7', 'mmaj7', 'm9'] },
    { label: 'Dominant', ids: ['7', '9', '7sus4'] },
    { label: 'Diminished · aug', ids: ['dim', 'dim7', 'm7b5', 'aug'] },
    { label: 'Sus · power', ids: ['sus2', 'sus4', '5'] },
  ];
  const SCALE_GROUPS = [
    { label: 'Major · minor', ids: ['major', 'minor', 'harmonic', 'melodic'] },
    { label: 'Pentatonic · blues', ids: ['penta', 'mpenta', 'blues'] },
    { label: 'Modes', ids: ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'] },
    { label: 'Other', ids: ['phrygdom', 'whole', 'dimhw'] },
  ];
  // Shorter scale names for the buttons (the full name is in the tooltip).
  const SCALE_SHORT = { major: 'Major', minor: 'Natural minor', penta: 'Major penta', mpenta: 'Minor penta', dimhw: 'Diminished H-W' };

  // Piano layout for roots: naturals on the bottom row, sharps/flats above, between them.
  const NATURALS = [0, 2, 4, 5, 7, 9, 11];
  const ACCIDENTALS = [1, 3, null, 6, 8, 10]; // null = gap between E and F

  let isChord = $derived(app.prefs.mode === 'chord');
  let groups = $derived(isChord ? CHORD_GROUPS : SCALE_GROUPS);
  let current = $derived(isChord ? app.prefs.chordId : app.prefs.scaleId);
  const choose = (id) => app.set(isChord ? { chordId: id } : { scaleId: id });

  function buttonText(id) {
    if (isChord) return chordName(app.prefs.root, chordById(id), app.prefs.notation);
    return SCALE_SHORT[id] ?? scaleById(id).name;
  }
  const tooltip = (id) => (isChord ? chordById(id).name : scaleById(id).name);

  // Phones show one group at a time behind tabs; it follows the selected type unless a tab is tapped.
  let tabPick = $state(null);
  let tab = $derived(tabPick ?? Math.max(0, groups.findIndex((g) => g.ids.includes(current))));
  $effect(() => {
    void app.prefs.mode;
    void current;
    tabPick = null;
  });
</script>

<section class="picker card">
  {#if app.prefs.mode === 'identify'}
    <p class="hint">Tap one fret per string on the board (tap again to clear) and the chord name appears below it.</p>
  {:else}
    <div class="cols">
      <div class="col root-col">
        <h3>Root</h3>
        <div class="piano" role="group" aria-label="Root note">
          <div class="keys sharps">
            {#each ACCIDENTALS as pc}
              {#if pc === null}
                <span class="gap"></span>
              {:else}
                <button class="key" class:active={app.prefs.root === pc} onclick={() => app.set({ root: pc })}>{noteName(pc, app.prefs.notation)}</button>
              {/if}
            {/each}
          </div>
          <div class="keys naturals">
            {#each NATURALS as pc}
              <button class="key" class:active={app.prefs.root === pc} onclick={() => app.set({ root: pc })}>{noteName(pc, app.prefs.notation)}</button>
            {/each}
          </div>
        </div>
        {#if isChord && app.recent.length}
          <div class="recent">
            <h3>Recent</h3>
            <div class="recent-list">
              {#each app.recent.slice(0, 6) as r}
                <button class="chip small" onclick={() => app.set({ root: r.root, chordId: r.chordId })}>{chordName(r.root, chordById(r.chordId), app.prefs.notation)}</button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      {#each groups as g}
        <div class="col group">
          <h3>{g.label}</h3>
          <div class="types">
            {#each g.ids as id}
              <button class="type" class:active={current === id} title={tooltip(id)} onclick={() => choose(id)}>{buttonText(id)}</button>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="tabbed">
      <div class="tabs" role="tablist">
        {#each groups as g, i}
          <button role="tab" aria-selected={tab === i} class:active={tab === i} class:has-current={g.ids.includes(current)} onclick={() => (tabPick = i)}>{g.label}</button>
        {/each}
      </div>
      <div class="tab-types">
        {#each groups[tab].ids as id}
          <button class="type" class:active={current === id} title={tooltip(id)} onclick={() => choose(id)}>{buttonText(id)}</button>
        {/each}
      </div>
    </div>

  {/if}
</section>

<style>
  .picker { display: grid; gap: 14px; padding: 14px 16px; }
  /* Columns are as wide as their buttons and wrap to a new line when they run out of room. */
  .cols { display: flex; flex-wrap: wrap; gap: 16px 28px; }
  .col { display: grid; align-content: start; gap: 8px; }
  h3 { margin: 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); white-space: nowrap; }

  .piano { display: grid; gap: 4px; }
  .keys { display: flex; gap: 4px; }
  /* sharps row is offset by half a key, so sharps sit between naturals */
  .sharps { padding-left: 23px; }
  .key, .gap { width: 42px; flex: none; }
  .key { padding: 7px 0; font-weight: 600; font-size: 16px; }
  .sharps .key { background: var(--bg); font-size: 15px; }
  .key.active, .type.active { background: var(--accent); border-color: var(--accent); color: #fff; }

  .recent { display: grid; gap: 4px; margin-top: 6px; }
  .recent-list { display: flex; flex-wrap: wrap; gap: 4px; max-width: 310px; }

  .types { display: grid; gap: 4px; }
  .types { gap: 5px; }
  .type { text-align: left; padding: 7px 14px; min-width: 96px; font-size: 16px; font-weight: 600; white-space: nowrap; }


  /* Medium screens: root on its own row, then the groups side by side. */
  @media (max-width: 1000px) {
    .root-col { flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: end; gap: 8px 24px; }
    .root-col > h3 { flex-basis: 100%; }
    .recent { margin-top: 0; }
    .recent-list { max-width: none; }
  }
  .tabbed { display: none; }

  /* Phones: piano keys stretch to the width; chord groups go behind tabs. */
  @media (max-width: 560px) {
    .cols { display: block; }
    .group { display: none; }
    .root-col { display: grid; gap: 6px; }
    .recent-list { flex-wrap: nowrap; overflow-x: auto; }
    .piano { width: 100%; }
    .key, .gap { width: auto; flex: 1; min-width: 0; }
    .tabbed { display: grid; gap: 8px; }
    .tabs { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
    .tabs button { flex: none; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 999px; color: var(--muted); }
    .tabs button.has-current { color: var(--accent); border-color: var(--accent); }
    .tabs button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .tab-types { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
    .tab-types .type { text-align: center; min-width: 0; font-size: 15px; padding: 7px 4px; }
    .sharps { padding-left: calc((100% - 24px) / 14); padding-right: calc((100% - 24px) / 14 + 4px); }
  }
</style>
