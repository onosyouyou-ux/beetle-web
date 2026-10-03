import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

// さくらんぼ算ランディング（#patterns）の3枚のカードに載せる問題画面を、アプリの描画そのもので撮る。
// cd tests && npm install のあと: node tests/capture-sakuranbo-cards.mjs
// 出力は PNG（一時フォルダ）。WebP への変換は Windows 側の Pillow で行う（CLAUDE.md「画像加工に使う道具」）
const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.env.SAKURANBO_SHOT_DIR || resolve(tmpdir(), 'sakuranbo-card-shots'));
const cases = [
  { name: 'card-add', mode: 'add', text: '8 + 3' },
  { name: 'card-sub-front', mode: 'sub-front', text: '13 − 8' },
  { name: 'card-sub-back', mode: 'sub-back', text: '13 − 4' }
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

// 決まった問題（ふつう）を出す口。撮影のブラウザの中だけに差し込む
const hook = `
  window.__shotCherry = function (modeId, text) {
    selection.modeId = modeId; selection.diffId = 'm'; selection.styleId = 'challenge';
    startSession();
    let q;
    for (let i = 0; i < 20000; i++) { q = session.mode.make(session.diff); if (q.text === text) break; }
    if (q.text !== text) throw new Error('no question ' + text);
    session.current = q; session.locked = false;
    renderPlay();
    return q.answer;
  };
`;
const anchor = "  history.replaceState({ nkStep: 1 }, '');";

await mkdir(out, { recursive: true });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  // WSL の Chromium は共有ライブラリが足りず起動しないので、Windows の node から SAKURANBO_BROWSER=chrome で撮る
  browser = await chromium.launch({ headless: true, channel: process.env.SAKURANBO_BROWSER || undefined });
  const page = await browser.newPage({ viewport: { width: Number(process.env.SAKURANBO_VW || 430), height: 900 }, deviceScaleFactor: 2 });
  await page.route(/googletagmanager|google-analytics/, route => route.abort());
  const source = await readFile(resolve(root, 'js/sansu-app.js'), 'utf8');
  if (!source.includes(anchor)) throw new Error('hook の差し込み位置が変わった');
  await page.route('**/js/sansu-app.js*', route => route.fulfill({ contentType: 'application/javascript', body: source.replace(anchor, hook + anchor) }));
  await page.goto(base + '/tools/sakuranbo/?internal=1');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => typeof window.__shotCherry === 'function');
  for (const item of cases) {
    const answer = await page.evaluate(([m, t]) => window.__shotCherry(m, t), [item.mode, item.text]);
    // わけかた に正しく答えて、さくらんぼの中身と「= ?」が出た盤面を撮る
    await page.locator('.sa-opt', { hasText: answer }).first().click();
    await page.waitForTimeout(1400);
    const problem = page.locator('.sa-problem');
    // 枠の幅は いじらない（式の大きさが枠の幅で決まるので、幅を変えると「= ?」が はみ出す）
    const overflow = await problem.evaluate(el => [...el.querySelectorAll('*')].some(c => {
      const r = c.getBoundingClientRect(), b = el.getBoundingClientRect();
      return r.width > 0 && (r.right > b.right + 1 || r.left < b.left - 1);
    }));
    if (overflow) throw new Error(item.name + ': 枠から はみ出している');
    const box = await problem.boundingBox();
    await page.screenshot({ path: resolve(out, item.name + '.png'), clip: { x: box.x - 6, y: box.y - 6, width: box.width + 12, height: box.height + 12 } });
    const cap = await page.locator('.sa-cherry-cap').textContent();
    console.log(`${item.name}.png: ${item.text}（${answer}）／${cap}`);
  }
  console.log('out: ' + out);
} finally {
  await browser?.close();
  server.close();
}
