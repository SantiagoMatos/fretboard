<script>
  import Settings from './components/Settings.svelte';
  import Picker from './components/Picker.svelte';
  import Board from './components/Board.svelte';
  import SidePanel from './components/SidePanel.svelte';
  import SongSheet from './components/SongSheet.svelte';
</script>

<main>
  <Settings />
  <Picker />
  <Board />
  <SidePanel />
  <SongSheet />
</main>

<style>
  main { max-width: 1240px; margin: 0 auto; padding: 20px 16px 60px; display: grid; gap: 16px; }
  /* Let wide content (fretboard, sheet) scroll inside its card instead of widening the page. */
  main > :global(*) { min-width: 0; }
</style>
