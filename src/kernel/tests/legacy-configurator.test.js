/**
 * CP-01 PASS criterion: "existing configurator remains functional".
 *
 * The pre-existing configurator is a set of classic (non-module) browser
 * scripts. CP-01 must not break it, so this test loads those exact files into
 * a VM with minimal DOM stubs and exercises their real code paths.
 *
 * It lives under src/kernel/tests only so that one `npm test` covers the whole
 * repository; it tests legacy code, not the kernel.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const LEGACY_FILES = [
  'src/config.js',
  'src/pricing.js',
  'src/schema.js',
  'src/urlSerializer.js',
  'src/imageResolver.js',
];

/** Run `code` inside the legacy realm. */
const run = (context, code) => runInContext(code, context);

function loadLegacy() {
  const context = createContext({
    console,
    Intl,
    URLSearchParams,
    encodeURIComponent,
    decodeURIComponent,
    navigator: { clipboard: { writeText: () => {} } },
    location: { origin: 'https://example.test', pathname: '/index.html' },
    history: { replaceState: () => {} },
    document: { title: '' },
  });
  runInContext('var window = globalThis;', context);
  for (const file of LEGACY_FILES) {
    const source = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8');
    runInContext(source, context, { filename: file });
  }
  return context;
}

const legacy = loadLegacy();

test('legacy: product catalogue is present and validates as it does on master', () => {
  const products = run(legacy, 'PRODUCTS');
  assert.ok(Array.isArray(products) && products.length >= 2, 'expected the two shipped products');
  // Cross-realm arrays have a different prototype, so compare by value.
  assert.equal(products.map((p) => p.id).join(','), 'sofa-classic,wardrobe');

  const sofa = run(legacy, "validateProduct(PRODUCTS.find(p => p.id === 'sofa-classic'))");
  assert.equal(sofa.valid, true, `sofa-classic: ${JSON.stringify(sofa.errors)}`);

  // NOTE (pre-existing, NOT introduced by CP-01): the wardrobe product uses
  // `counter` options without a `values` array, which src/schema.js rejects.
  // Verified identical on pristine master (see CP-01-EVIDENCE.md). CP-01 must
  // preserve existing behaviour, so this test pins the current result instead
  // of silently changing it.
  const wardrobe = run(legacy, "validateProduct(PRODUCTS.find(p => p.id === 'wardrobe'))");
  assert.equal(wardrobe.valid, false);
  assert.equal(wardrobe.errors.length, 3);
  assert.equal(
    wardrobe.errors.join(' | '),
    'option "sections" must have at least one value' +
      ' | option "shelves" must have at least one value' +
      ' | option "drawers" must have at least one value',
  );
});

test('legacy: parametric pricing still calculates', () => {
  const price = run(
    legacy,
    "calcParametricPrice('wardrobe', { width: 1200, height: 2400, depth: 600, material: 'ldsp_white', facade: 'mdf', shelves: 3, drawers: 0, sections: 1, fittings: [] })",
  );
  assert.ok(price, 'a price must be produced');
  assert.ok(price.total > 0, `total must be positive, got ${price.total}`);
});

test('legacy: defaults and dimension constraints still resolve', () => {
  const defaults = run(legacy, "getParametricDefaultConfig('wardrobe')");
  assert.equal(defaults.width, 1200);
  assert.equal(defaults.height, 2400);
  assert.equal(defaults.depth, 600);

  const constraints = run(legacy, "getDimensionConstraints('wardrobe')");
  assert.equal(constraints.width.min, 600);
  assert.equal(constraints.width.max, 3000);
});

test('legacy: URL serialisation round-trips', () => {
  const query = run(
    legacy,
    "serializeConfig({ productId: 'sofa-classic', material: 'fabric', color: 'ivory', legs: ['wood'] })",
  );
  assert.equal(typeof query, 'string');
  assert.ok(query.includes('productId=sofa-classic'));

  const restored = run(
    legacy,
    `deserializeConfig(${JSON.stringify(query)}, { productId: 'sofa-classic', material: 'fabric', color: 'ivory', legs: [] })`,
  );
  assert.equal(restored.productId, 'sofa-classic');
  assert.equal(restored.material, 'fabric');
  assert.equal(restored.legs.join(','), 'wood', 'arrays survive the round trip');
});

test('legacy: image resolver still resolves both product kinds', () => {
  // A simple product that ships an exampleImage returns it verbatim.
  const example = run(legacy, "imageResolver({ product: 'sofa-classic' }, 0)");
  assert.equal(example, 'products/sofa-classic/images/Gemini_Generated_Image_23eg9523eg9523eg.png');

  // A parametric product builds the documented WebP naming scheme.
  const webp = run(
    legacy,
    "imageResolver({ product: 'wardrobe', material: 'ldsp_white', facade: 'mdf', width: 1200, height: 2400, depth: 600 }, 3)",
  );
  assert.equal(webp, 'products/wardrobe/images/3-ldsp_white-mdf-1200-2400-600.webp');

  // All eight angles resolve.
  const angles = run(legacy, "resolveAllAngles({ product: 'wardrobe' })");
  assert.equal(angles.length, 8);
});

test('legacy: the kernel did not leak into the classic scripts', () => {
  // The kernel is ESM and isolated; the page still loads classic scripts only.
  const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes('src/kernel/'), 'index.html must not reference the kernel');
  assert.ok(!html.includes('type="module"'), 'the legacy page stays module-free');
  for (const file of LEGACY_FILES) {
    const source = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8');
    assert.ok(!/^\s*(import|export)\s/m.test(source), `${file} must stay a classic script`);
  }
});
