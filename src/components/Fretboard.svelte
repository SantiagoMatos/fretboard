<script>
  import { noteName } from '../lib/music/theory.js';

  /**
   * markers: [{ s, f, label, cls, dim }] — s = string index (0 = thumb side), f = fret
   * onpick(s, f) fires for any click on the board.
   */
  let { tuning, frets = 12, markers = [], lefty = false, flip = false, notation = 'sharp', onpick } = $props();

  const PAD_L = 84, PAD_R = 20, PAD_T = 26, GAP = 40, FW = 58;
  const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
  const DOUBLE = [12, 24];

  let n = $derived(tuning.length);
  let width = $derived(PAD_L + frets * FW + PAD_R);
  let height = $derived(PAD_T * 2 + (n - 1) * GAP + 30);
  let boardBottom = $derived(PAD_T + (n - 1) * GAP);

  const fx = (f) => (f === 0 ? PAD_L - 28 : PAD_L + (f - 0.5) * FW);
  let X = $derived((x) => (lefty ? width - x : x));
  let Y = $derived((s) => PAD_T + (flip ? s : n - 1 - s) * GAP);
  // Lower strings are drawn thicker.
  let thickness = $derived((s) => 1 + Math.max(0, (Math.max(...tuning) - tuning[s]) / 14));
</script>

<svg class="fretboard" viewBox="0 0 {width} {height}" style="min-width: {Math.min(width, 640)}px" role="img" aria-label="Fretboard">
  {#each INLAYS.filter((f) => f <= frets) as f}
    <circle class="inlay" cx={X(fx(f))} cy={PAD_T + boardBottom / 2 - PAD_T / 2} r="7" />
  {/each}
  {#each DOUBLE.filter((f) => f <= frets) as f}
    <circle class="inlay" cx={X(fx(f))} cy={PAD_T + GAP * 0.5} r="7" />
    <circle class="inlay" cx={X(fx(f))} cy={boardBottom - GAP * 0.5} r="7" />
  {/each}

  {#each { length: frets } as _, k}
    <line class="fret" x1={X(PAD_L + (k + 1) * FW)} x2={X(PAD_L + (k + 1) * FW)} y1={PAD_T} y2={boardBottom} />
  {/each}
  <line class="nut" x1={X(PAD_L)} x2={X(PAD_L)} y1={PAD_T - 2} y2={boardBottom + 2} />

  {#each tuning as midi, s}
    <line class="string" x1={X(PAD_L - 44)} x2={X(PAD_L + frets * FW)} y1={Y(s)} y2={Y(s)} stroke-width={thickness(s)} />
    <text class="tuning-label" x={X(14)} y={Y(s) + 4} text-anchor="middle">{noteName(midi, notation)}</text>
  {/each}

  {#each { length: frets + 1 } as _, f}
    <text class="fretnum" x={X(fx(f))} y={height - 8} text-anchor="middle">{f}</text>
  {/each}

  {#each markers as m (m.s + ':' + m.f)}
    <g class="dot {m.cls}" class:dim={m.dim} transform="translate({X(fx(m.f))} {Y(m.s)})">
      <circle r="15" />
      {#if m.label}<text y="4.5" text-anchor="middle" class:small={m.label.length > 2}>{m.label}</text>{/if}
    </g>
  {/each}

  <!-- Invisible hit areas on top, so every position is clickable. -->
  {#each tuning as _, s}
    {#each { length: frets + 1 } as _, f}
      <rect
        class="hit"
        x={X(fx(f)) - FW / 2}
        y={Y(s) - GAP / 2}
        width={FW}
        height={GAP}
        role="button"
        tabindex="-1"
        aria-label="String {s + 1} fret {f}"
        onclick={() => onpick?.(s, f)}
        onkeydown={() => {}}
      />
    {/each}
  {/each}
</svg>

<style>
  .fretboard { width: 100%; height: auto; display: block; user-select: none; }
  .inlay { fill: var(--inlay); }
  .fret { stroke: var(--fret); stroke-width: 2; }
  .nut { stroke: var(--fg); stroke-width: 6; }
  .string { stroke: var(--string); }
  .tuning-label { fill: var(--muted); font-size: 13px; font-weight: 600; }
  .fretnum { fill: var(--muted); font-size: 13px; }
  .dot { pointer-events: none; transition: opacity 0.15s; }
  .dot circle { fill: var(--iv-x); stroke: var(--card); stroke-width: 2; }
  .dot text { fill: #fff; font-size: 13px; font-weight: 700; }
  .dot text.small { font-size: 10px; }
  .dot.iv-root circle { fill: var(--iv-root); }
  .dot.iv-3 circle { fill: var(--iv-3); }
  .dot.iv-5 circle { fill: var(--iv-5); }
  .dot.iv-7 circle { fill: var(--iv-7); }
  .dot.picked circle { fill: var(--accent); }
  .dot.dim { opacity: 0.18; }
  .hit { fill: transparent; cursor: pointer; outline: none; }
  .hit:hover { fill: var(--hover); }
</style>
