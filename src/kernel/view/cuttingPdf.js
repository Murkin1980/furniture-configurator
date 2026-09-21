/**
 * Cutting-list PDF export (CP-06), dependency-free.
 *
 * Emits a PDF 1.4 document listing every manufacturing part straight from
 * bundle.parts (the same records the BOM aggregates): id, material, L/W/T,
 * grain, edge-banding flags, qty - plus the cutting totals. ASCII only (base-14
 * fonts have no reliable Cyrillic), uncompressed streams, no dates/ids, so the
 * output is byte-deterministic like every other evidence artifact.
 *
 * The PDF is a projection of derived data: no dimensions are re-computed here.
 */

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const LINE_H = 14;
const ROWS_PER_PAGE = 46;

// column x positions
const COLS = [
  ['#', MARGIN],
  ['part', MARGIN + 24],
  ['material', MARGIN + 130],
  ['L', MARGIN + 220],
  ['W', MARGIN + 255],
  ['T', MARGIN + 290],
  ['grain', MARGIN + 315],
  ['edges', MARGIN + 360],
  ['qty', MARGIN + 440],
];

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const edgeCode = (e) => {
  const on = [];
  if (e?.alongLengthStart) on.push('LS');
  if (e?.alongLengthEnd) on.push('LE');
  if (e?.alongWidthStart) on.push('WS');
  if (e?.alongWidthEnd) on.push('WE');
  return on.length ? on.join('+') : '-';
};

function text(x, y, str, { size = 9, bold = false } = {}) {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(str)}) Tj ET\n`;
}

function pageRows(parts, from) {
  return parts.slice(from, from + ROWS_PER_PAGE);
}

/**
 * @param {object} bundle output of buildProject()
 * @param {object} [opts]
 * @param {string} [opts.projectId] label for the header (bundle carries no id)
 * @returns {Uint8Array} PDF 1.4 bytes
 */
export function cuttingPdf(bundle, opts = {}) {
  const parts = bundle.parts;
  const projectId = opts.projectId ?? bundle.id ?? '-';
  const pageCount = Math.max(1, Math.ceil(parts.length / ROWS_PER_PAGE));

  const pageContents = [];
  for (let p = 0; p < pageCount; p++) {
    let y = PAGE_H - MARGIN;
    let out = '';
    out += text(MARGIN, y, 'Furniture kernel - cutting list (derived from BOM parts)', { size: 13, bold: true });
    y -= 18;
    out += text(MARGIN, y, `project: ${projectId}   parts: ${parts.length}   panels: ${bundle.totals.panels}   area: ${bundle.totals.areaM2.toFixed(3)} m2   banding: ${bundle.totals.bandingM.toFixed(2)} m`, { size: 9 });
    y -= 10;
    out += text(MARGIN, y, `page ${p + 1}/${pageCount}`, { size: 8 });
    y -= 20;
    for (const [label, x] of COLS) out += text(x, y, label, { bold: true });
    y -= LINE_H;

    const rows = pageRows(parts, p * ROWS_PER_PAGE);
    rows.forEach((part, i) => {
      const n = p * ROWS_PER_PAGE + i + 1;
      out += text(COLS[0][1], y, String(n));
      out += text(COLS[1][1], y, part.id);
      out += text(COLS[2][1], y, part.material);
      out += text(COLS[3][1], y, String(part.length));
      out += text(COLS[4][1], y, String(part.width));
      out += text(COLS[5][1], y, String(part.thickness));
      out += text(COLS[6][1], y, part.grain);
      out += text(COLS[7][1], y, edgeCode(part.edges));
      out += text(COLS[8][1], y, String(part.count));
      y -= LINE_H;
    });

    if (p === pageCount - 1) {
      y -= 8;
      out += text(MARGIN, y, `totals: ${bundle.totals.panels} panels, ${bundle.totals.areaM2.toFixed(3)} m2, ${bundle.totals.bandingM.toFixed(2)} m banding (lower-bound sheet estimate)`, { size: 9, bold: true });
    }
    pageContents.push(out);
  }

  // ---- PDF assembly -------------------------------------------------------
  const objects = []; // {num, body}
  const pageObjNums = [];
  let next = 5; // 1 catalog, 2 pages, 3 F1, 4 F2
  for (let p = 0; p < pageCount; p++) {
    pageObjNums.push(next);
    next += 2; // page + content
  }

  objects.push({ num: 1, body: `<< /Type /Catalog /Pages 2 0 R >>` });
  objects.push({
    num: 2,
    body: `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>`,
  });
  objects.push({ num: 3, body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>` });
  objects.push({ num: 4, body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>` });

  pageObjNums.forEach((pageNum, p) => {
    const contentNum = pageNum + 1;
    const stream = pageContents[p];
    objects.push({
      num: pageNum,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`,
    });
    objects.push({
      num: contentNum,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    });
  });

  objects.sort((a, b) => a.num - b.num);

  let body = '%PDF-1.4\n';
  const offsets = [];
  for (const o of objects) {
    offsets[o.num] = body.length;
    body += `${o.num} 0 obj\n${o.body}\nendobj\n`;
  }
  const xrefStart = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= objects.length; n++) {
    xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return new TextEncoder().encode(body + xref + trailer);
}
