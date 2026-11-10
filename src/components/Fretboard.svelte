<script>
  import { noteName } from '../lib/music/theory.js';

  /**
   * markers: [{ s, f, label, cls, dim }] — s = string index (0 = thumb side), f = fret
   * onpick(s, f) fires for any click on the board.
   * Frets stretch to fill the available width; on narrow screens the neck turns vertical.
   */
  let { tuning, frets = 12, markers = [], lefty = false, flip = false, notation = 'sharp', onpick } = $props();

  const HEAD = 76; // room before the nut: tuning names + open-string dots
  const END = 16;
  const EDGE = 26; // margin outside the outer strings
  const NUMS = 26; // band for fret numbers
  const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
  const DOUBLE = [12, 24];

  let width = $state(800);
  let vertical = $derived(width < 560);
  let n = $derived(tuning.length);
  // Width is 0 for a moment before the first layout, so keep sizes above a sane minimum.
  let gap = $derived(vertical ? Math.max(32, Math.min(60, (width - NUMS - 2 * EDGE) / Math.max(1, n - 1))) : 40);
  let fretLen = $derived(vertical ? 48 : Math.max(40, (width - HEAD - END) / frets));
  let along = $derived(HEAD + frets * fretLen + END); // length of the neck drawing
  let across = $derived(2 * EDGE + (n - 1) * gap); // width of the neck drawing
  let svgW = $derived(vertical ? across + NUMS : along);
  let svgH = $derived(vertical ? along : across + NUMS);

  // Neck coordinates (a = along the neck, c = across the strings) → screen [x, y].
  let P = $derived((a, c) =>
    vertical ? [NUMS + (lefty ? across - c : c), a] : [lefty ? along - a : a, c],
  );
  // Horizontal: low string at the bottom (tab view). Vertical: low string on the left (chord-chart view).
  let cs = $derived((s) => EDGE + (vertical !== flip ? s : n - 1 - s) * gap);
  const fa = (f) => (f === 0 ? HEAD - 26 : HEAD + (f - 0.5) * fretLen);
  let thickness = $derived((s) => 1 + Math.max(0, (Math.max(...tuning) - tuning[s]) / 14));

  let nut = $derived([...P(HEAD, EDGE - 2), ...P(HEAD, across - EDGE + 2)]);
  let mid = $derived(EDGE + ((n - 1) * gap) / 2);
</script>

<div class="wrap" bind:clientWidth={width}>
  <svg class="fretboard" width={svgW} height={svgH} viewBox="0 0 {svgW} {svgH}" role="img" aria-label="Fretboard">
    {#each INLAYS.filter((f) => f <= frets) as f}
      {@const [x, y] = P(fa(f), mid)}
      <circle class="inlay" cx={x} cy={y} r="7" />
    {/each}
    {#each DOUBLE.filter((f) => f <= frets) as f}
      {@const [x1, y1] = P(fa(f), EDGE + gap * 0.5)}
      {@const [x2, y2] = P(fa(f), across - EDGE - gap * 0.5)}
      <circle class="inlay" cx={x1} cy={y1} r="7" />
      <circle class="inlay" cx={x2} cy={y2} r="7" />
    {/each}

    {#each { length: frets } as _, k}
      {@const [x1, y1] = P(HEAD + (k + 1) * fretLen, EDGE)}
      {@const [x2, y2] = P(HEAD + (k + 1) * fretLen, across - EDGE)}
      <line class="fret" {x1} {y1} {x2} {y2} />
    {/each}
    <line class="nut" x1={nut[0]} y1={nut[1]} x2={nut[2]} y2={nut[3]} />

    {#each tuning as midi, s}
      {@const [x1, y1] = P(HEAD - 44, cs(s))}
      {@const [x2, y2] = P(HEAD + frets * fretLen, cs(s))}
      {@const [tx, ty] = P(14, cs(s))}
      <line class="string" {x1} {y1} {x2} {y2} stroke-width={thickness(s)} />
      <text class="tuning-label" x={tx} y={ty + 4} text-anchor="middle">{noteName(midi, notation)}</text>
    {/each}

    {#each { length: frets + 1 } as _, f}
      {@const [x, y] = vertical ? [13, fa(f) + 4] : [P(fa(f), 0)[0], svgH - 8]}
      <text class="fretnum" {x} {y} text-anchor="middle">{f}</text>
    {/each}

    {#each markers as m (m.s + ':' + m.f + ':' + m.cls)}
      {@const [x, y] = P(fa(m.f), cs(m.s))}
      <g class="dot {m.cls}" class:dim={m.dim} transform="translate({x} {y})">
        {#if m.cls === 'muted'}
          <text y="5" text-anchor="middle">×</text>
        {:else}
          <circle r="15" />
          {#if m.label}<text y="4.5" text-anchor="middle" class:small={m.label.length > 2}>{m.label}</text>{/if}
        {/if}
      </g>
    {/each}

    <!-- Invisible hit areas on top, so every position is clickable. -->
    {#each tuning as _, s}
      {#each { length: frets + 1 } as _, f}
        {@const [x, y] = P(fa(f), cs(s))}
        {@const w = vertical ? gap : fretLen}
        {@const h = vertical ? fretLen : gap}
        <rect
          class="hit"
          x={x - w / 2}
          y={y - h / 2}
          width={w}
          height={h}
          role="button"
          tabindex="-1"
          aria-label="String {s + 1} fret {f}"
          onclick={() => onpick?.(s, f)}
          onkeydown={() => {}}
        />
      {/each}
    {/each}
  </svg>
</div>

<style>
  .wrap { width: 100%; overflow-x: auto; }
  .fretboard { display: block; margin: 0 auto; user-select: none; }
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
  .dot.muted text { fill: var(--iv-root); font-size: 22px; }
  .dot.dim { opacity: 0.18; }
  .hit { fill: transparent; cursor: pointer; outline: none; }
  .hit:hover { fill: var(--hover); }
</style>
