// Builds a chord-box diagram as an SVG string, so the same drawing is used on screen and in exports.
import { barreOf } from './music/voicings.js';
import { intervalLabel, mod12, noteName } from './music/theory.js';

export const PRINT_PALETTE = { bg: '#ffffff', fg: '#1d1d1f', muted: '#86868b', dot: '#1d1d1f', dotText: '#ffffff', root: '#d9480f' };
export const SCREEN_PALETTE = {
  bg: 'var(--card)', fg: 'var(--fg)', muted: 'var(--muted)', dot: 'var(--fg)', dotText: 'var(--card)', root: 'var(--iv-root)',
};

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
const SS = 22; // string spacing
const FS = 26; // fret spacing
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * @param {object} o
 * @param {string} o.name   chord name shown on top
 * @param {number[]} o.frets one entry per string, -1 muted
 * @param {number[]} o.tuning MIDI notes per string
 * @param {{name:string,pc:number,semi:number}[]} o.tones chord tones (for labels and root colour)
 * @param {'none'|'notes'|'intervals'} [o.labels]
 * @param {string} [o.shape] with a capo: the chord shape the hand makes, shown under the name
 * @returns {{width:number,height:number,body:string}}
 */
export function chordDiagram({ name, shape = null, frets, tuning, tones, labels = 'none', notation = 'sharp', palette = PRINT_PALETTE }) {
  const n = frets.length;
  const fretted = frets.filter((f) => f > 0);
  const maxF = fretted.length ? Math.max(...fretted) : 0;
  const minF = fretted.length ? Math.min(...fretted) : 0;
  const base = maxF <= 5 ? 1 : minF;
  const rows = Math.max(4, maxF - base + 1);
  const gridW = (n - 1) * SS;
  const width = Math.max(gridW + 52, 112);
  const left = (width - gridW) / 2;
  const top = shape ? 62 : 50;
  const height = top + rows * FS + 14;
  const x = (s) => left + s * SS;
  const y = (row) => top + row * FS;
  const rootPc = tones[0]?.pc;
  const p = palette;
  const out = [];

  out.push(`<rect width="${width}" height="${height}" rx="8" style="fill:${p.bg}"/>`);
  out.push(`<text x="${width / 2}" y="22" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="700" style="fill:${p.fg}">${esc(name)}</text>`);
  if (shape) out.push(`<text x="${width / 2}" y="37" text-anchor="middle" font-family="${FONT}" font-size="10.5" style="fill:${p.muted}">${esc(shape)} shape</text>`);

  for (let r = 0; r <= rows; r++) {
    const thick = r === 0 && base === 1;
    out.push(`<line x1="${x(0)}" x2="${x(n - 1)}" y1="${y(r)}" y2="${y(r)}" stroke-width="${thick ? 4 : 1}" style="stroke:${p.fg}"/>`);
  }
  for (let s = 0; s < n; s++) out.push(`<line x1="${x(s)}" x2="${x(s)}" y1="${y(0)}" y2="${y(rows)}" stroke-width="1" style="stroke:${p.fg}"/>`);
  if (base > 1) {
    out.push(`<text x="${x(0) - 8}" y="${y(0) + FS / 2 + 4}" text-anchor="end" font-family="${FONT}" font-size="11" style="fill:${p.muted}">${base}fr</text>`);
  }

  const barre = barreOf(frets);
  if (barre && barre.to - barre.from >= 2) {
    const cy = y(barre.fret - base) + FS / 2;
    out.push(`<rect x="${x(barre.from) - 8}" y="${cy - 8}" width="${x(barre.to) - x(barre.from) + 16}" height="16" rx="8" style="fill:${p.dot}"/>`);
  }

  frets.forEach((f, s) => {
    if (f < 0) {
      out.push(`<text x="${x(s)}" y="${top - 8}" text-anchor="middle" font-family="${FONT}" font-size="13" style="fill:${p.muted}">×</text>`);
      return;
    }
    const pc = mod12(tuning[s] + f);
    const tone = tones.find((t) => t.pc === pc);
    const label = labels === 'notes' ? noteName(pc, notation) : labels === 'intervals' && tone ? intervalLabel(tone.name) : '';
    const fill = pc === rootPc ? p.root : p.dot;
    if (f === 0) {
      out.push(`<circle cx="${x(s)}" cy="${top - 12}" r="5" fill="none" stroke-width="1.5" style="stroke:${pc === rootPc ? p.root : p.fg}"/>`);
      return;
    }
    const cy = y(f - base) + FS / 2;
    out.push(`<circle cx="${x(s)}" cy="${cy}" r="9" style="fill:${fill}"/>`);
    if (label) {
      out.push(`<text x="${x(s)}" y="${cy + 3.5}" text-anchor="middle" font-family="${FONT}" font-size="${label.length > 2 ? 7.5 : 9.5}" font-weight="600" style="fill:${p.dotText}">${esc(label)}</text>`);
    }
  });

  return { width, height, body: out.join('') };
}

export const svgDocument = (width, height, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;

export { esc as escapeXml, FONT };
