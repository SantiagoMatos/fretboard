// Turns the song sheet into one SVG, and SVG into a downloadable PNG.
import { chordDiagram, escapeXml, FONT, PRINT_PALETTE, svgDocument } from './diagram.js';

const GAP = 16;
const PAD = 24;

export function sheetSvg(sheet, describe, notation) {
  const boxes = sheet.items.map((item) => chordDiagram({ ...describe(item), labels: sheet.labels, notation, palette: PRINT_PALETTE }));
  const cols = Math.max(1, Math.min(sheet.cols, boxes.length || 1));
  const cellW = Math.max(112, ...boxes.map((b) => b.width));
  const cellH = Math.max(100, ...boxes.map((b) => b.height));
  const titleH = sheet.title ? 48 : 0;
  const rows = Math.ceil(boxes.length / cols) || 1;
  const width = PAD * 2 + cols * cellW + (cols - 1) * GAP;
  const height = PAD * 2 + titleH + rows * cellH + (rows - 1) * GAP;

  const parts = [`<rect width="${width}" height="${height}" fill="#ffffff"/>`];
  if (sheet.title) {
    parts.push(`<text x="${width / 2}" y="${PAD + 26}" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="700" fill="#1d1d1f">${escapeXml(sheet.title)}</text>`);
  }
  boxes.forEach((b, i) => {
    const cx = PAD + (i % cols) * (cellW + GAP) + (cellW - b.width) / 2;
    const cy = PAD + titleH + Math.floor(i / cols) * (cellH + GAP);
    parts.push(`<g transform="translate(${cx} ${cy})">${b.body}</g>`);
  });
  return { width, height, svg: svgDocument(width, height, parts.join('')) };
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadSvg = (svg, filename) => download(new Blob([svg], { type: 'image/svg+xml' }), filename);

export function downloadPng(svg, width, height, filename, scale = 2) {
  const img = new Image();
  img.onload = () => {
    const canvas = Object.assign(document.createElement('canvas'), { width: width * scale, height: height * scale });
    const g = canvas.getContext('2d');
    g.scale(scale, scale);
    g.drawImage(img, 0, 0);
    canvas.toBlob((blob) => download(blob, filename), 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export const slug = (s) => (s || 'chords').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chords';
