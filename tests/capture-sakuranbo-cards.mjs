import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

// npm install in tests/, then: node tests/capture-sakuranbo-cards.mjs
// Capture the app's own renderer; the fixture hook exists only in this browser.
const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'assets/images/sakuranbo/lp');
const previews = resolve(process.env.SAKURANBO_PREVIEW_DIR || resolve(tmpdir(), 'sakuranbo-card-previews'));
const cases = [
  { name: 'pattern-one-back', mode: 'one-ushiro', a: 8, b: 3, side: 'back', target: 10, need: 2, rest: 1 },
  { name: 'pattern-one-front', mode: 'one-mae', a: 4, b: 8, side: 'front', target: 10, need: 2, rest: 2 },
  { name: 'pattern-two-back', mode: 'two-ushiro', a: 28, b: 5, side: 'back', target: 30, need: 2, rest: 3 },
  { name: 'pattern-two-front', mode: 'two-mae', a: 5, b: 28, side: 'front', target: 30, need: 2, rest: 3 },
  { name: 'pattern-two-two', mode: 'hard', a: 38, b: 25, side: 'back', target: 40, need: 2, rest: 23 },
];
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }).end(data);
  } catch { res.writeHead(404).end(); }
});
await mkdir(out, { recursive: true });
await mkdir(previews, { recursive: true });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.SAKURANBO_BROWSER || undefined });
  const page = await browser.newPage({ viewport: { width: 1342, height: 900 }, deviceScaleFactor: 2 });
  await page.route(/googletagmanager|google-analytics/, route => route.abort());
  const source = await readFile(resolve(root, 'js/sansu-app.js'), 'utf8');
  const hook = `
  window.__captureCherry = function (fixture) {
    NkModal.open(app, { onClose: backFromPlay });
    const q = toPairQuestion({ ...fixture, layout: 'cherry', total: fixture.a + fixture.b,
      text: fixture.a + ' + ' + fixture.b,
      prompt: (fixture.side === 'front' ? fixture.a : fixture.b) + ' を 2つに わけよう' });
    session = { mode: MODES.find(m => m.id === fixture.mode), diff: DIFFS[0], style: PLAYSTYLES[0],
      index: 0, correct: 0, locked: false, current: q, marks: [], recent: [], combo: 0, bestCombo: 0, arrivedStage: null };
    renderPlay();
  };
`;
  if (!source.includes('  history.replaceState({ nkStep: 1 }')) throw new Error('Capture hook insertion point changed');
  await page.route('**/js/sansu-app.js*', route => route.fulfill({ contentType: 'application/javascript', body: source.replace('  history.replaceState({ nkStep: 1 }', hook + '  history.replaceState({ nkStep: 1 }') }));
  await page.goto(base + '/tools/sakuranbo/?internal=1');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => typeof window.__captureCherry === 'function');
  for (const item of cases) {
    if (item.need + item.rest !== (item.side === 'front' ? item.a : item.b)) throw new Error('Invalid split');
    if ((item.side === 'front' ? item.b : item.a) + item.need !== item.target) throw new Error('Invalid target');
    await page.evaluate(item => window.__captureCherry(item), item);
    await page.locator('.sa-problem').evaluate(el => {
      el.style.width = '400px';
      el.style.height = '228px';
      el.style.minHeight = '228px';
      el.style.justifySelf = 'center';
    });
    const box = await page.locator('.sa-problem').boundingBox();
    await page.screenshot({ path: resolve(out, item.name + '.png'), clip: { x: box.x - 8, y: box.y - 8, width: 416, height: 244 } });
    console.log(`${item.name}.png: ${item.a} + ${item.b}, split ${item.need}/${item.rest}`);
  }
  await page.goto(base + '/tools/sakuranbo/landing.html?internal=1');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#patterns img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
  const images = await page.locator('#patterns .slp-calc-card img').evaluateAll(imgs => imgs.map(img => ({ src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight })));
  if (images.length !== 5 || images.some(img => !img.width || !img.src.includes('/pattern-'))) throw new Error('Missing card images: ' + JSON.stringify(images));
  await page.locator('#patterns').screenshot({ path: resolve(previews, 'patterns-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile horizontal overflow');
  await page.locator('#patterns').screenshot({ path: resolve(previews, 'patterns-mobile.png') });
  console.log('Verified 5 image loads, desktop layout, and 390px mobile layout.');
} finally {
  await browser?.close();
  server.close();
}