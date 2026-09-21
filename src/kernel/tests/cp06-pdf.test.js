/**
 * CP-06 - cutting-list PDF export.
 *
 * Verifies the emitted PDF is structurally sound (xref offsets point at the
 * right objects, page count matches the part list) and that the cutting table
 * actually contains every part id and the totals, all read back out of the
 * bytes. A full pdfjs-dist text round-trip is run out-of-band (evidence).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProject, cuttingPdf } from '../index.js';

const CP01 = JSON.parse(
  readFileSync(new URL('../../../fixtures/kitchen-2500x1500/project.json', import.meta.url), 'utf8'),
);

const bundle = buildProject(CP01);
const pdf = cuttingPdf(bundle);
const text = new TextDecoder('latin1').decode(pdf);

function xrefOffsets() {
  const start = text.lastIndexOf('startxref');
  const xrefAt = parseInt(text.slice(start).match(/startxref\n(\d+)/)[1], 10);
  assert.equal(text.slice(xrefAt, xrefAt + 4), 'xref');
  const lines = text.slice(xrefAt).split('\n');
  const count = parseInt(lines[1].split(' ')[1], 10);
  const offs = [];
  for (let i = 3; i < 2 + count; i++) {
    offs.push(parseInt(lines[i].slice(0, 10), 10));
  }
  return offs; // index 0 => object 1
}

function shownStrings() {
  const out = [];
  const re = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
  let m;
  while ((m = re.exec(text))) {
    out.push(m[1].replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\'));
  }
  return out;
}

test('cp06: pdf container is well-formed', () => {
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
});

test('cp06: xref offsets resolve to their objects', () => {
  const offs = xrefOffsets();
  offs.forEach((off, i) => {
    const n = i + 1;
    assert.equal(text.slice(off, off + `${n} 0 obj`.length), `${n} 0 obj`, `object ${n}`);
  });
});

test('cp06: one page for 30 parts, table carries every part', () => {
  assert.ok(/\/Count 1 >>/.test(text), 'single page');
  const strs = shownStrings();
  const joined = strs.join('\n');
  for (const p of bundle.parts) assert.ok(joined.includes(p.id), `part ${p.id} listed`);
  assert.ok(joined.includes('totals:'), 'totals line');
  assert.ok(joined.includes(String(bundle.totals.panels)), 'panel total');
});

test('cp06: export is deterministic', () => {
  const again = cuttingPdf(buildProject(CP01));
  assert.equal(Buffer.from(again).toString('hex'), Buffer.from(pdf).toString('hex'));
});
