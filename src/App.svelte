<script>
  import TopBar from './components/TopBar.svelte';
  import Picker from './components/Picker.svelte';
  import Board from './components/Board.svelte';
  import Shapes from './components/Shapes.svelte';
  import SidePanel from './components/SidePanel.svelte';
  import SongSheet from './components/SongSheet.svelte';
  import { app } from './lib/state.svelte.js';
</script>

<main class:with-drawer={app.sheetOpen}>
  <TopBar />
  <Picker />
  <Board />
  {#if app.prefs.mode === 'chord'}
    <Shapes />
  {:else}
    <SidePanel />
  {/if}
</main>
<SongSheet />

<style>
  main { max-width: 1600px; margin: 0 auto; padding: 14px 16px 60px; display: grid; gap: 12px; transition: margin 0.25s ease; }
  /* Let wide content (fretboard, shape strip) scroll inside its card instead of widening the page. */
  main > :global(*) { min-width: 0; }
  /* On wide screens the open sheet sits beside the board instead of covering it. */
  @media (min-width: 1100px) {
    main.with-drawer { margin-right: var(--drawer-w); }
  }
</style>
