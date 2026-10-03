// 先生向け案内ページのカード・QR・配布用PDFを data/teacher-apps.json から作る（#96）。
//   cd scripts/teacher-kit && npm install   （qrcode。WSL 側で入れてよい）
//   node scripts/teacher-kit/build.mjs      （PDF を出すので Windows の node から。WSL の Chromium は共有ライブラリが足りず起動しない）
// playwright は tests/node_modules のものを使う（なければ NODE_PATH で指す）。ブラウザは Chrome（TEACHER_KIT_BROWSER で変更可）
// アプリを足すときは data/teacher-apps.json に1件足して、これを実行するだけ。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const require = createRequire(resolve(here, 'package.json'));
const QRCode = require('qrcode');

function loadPlaywright() {
  const tries = [resolve(root, 'tests'), resolve(root, '../beetle-web/tests'), here];
  for (const p of tries) {
    try { return createRequire(resolve(p, 'package.json'))('playwright'); } catch (e) { /* 次を試す */ }
  }
  return require('playwright');   // NODE_PATH
}

const data = JSON.parse(await readFile(resolve(root, 'data/teacher-apps.json'), 'utf8'));
const site = data.site;
const apps = data.apps;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const withUtm = (path, source, medium, campaign) =>
  site + path + '?utm_source=' + source + '&utm_medium=' + medium + '&utm_campaign=' + campaign;
// 誤り訂正 M。黒の線と白の地（白黒印刷で読める）
const qrSvg = (url) => QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#000000', light: '#ffffff' } });

// ---- 1. ページ用のQR（電子黒板に映す用） ----
await mkdir(resolve(root, 'assets/images/qr'), { recursive: true });
for (const a of apps) {
  const svg = await qrSvg(withUtm(a.path, 'teacher_page', 'qr', 'for_teachers'));
  await writeFile(resolve(root, 'assets/images/qr', a.id + '.svg'), svg);
}

// ---- 2. ページのカードを差し込む ----
const cards = apps.map((a) => `      <article class="ft-app" id="app-${a.id}">
        <a class="ft-app-thumb" href="${a.path}" target="_blank" rel="noopener"><img src="${a.thumb}" alt="${esc(a.name)}" width="960" height="380" loading="lazy"></a>
        <div class="ft-app-body">
          <h3>${esc(a.name)}</h3>
          <p class="ft-app-grade">対象：${esc(a.grade)}</p>
          <p class="ft-app-desc">${esc(a.teacher)}</p>
          <code class="ft-app-url">${esc(site + a.path)}</code>
          <div class="ft-app-actions">
            <button type="button" class="ft-copy" data-url="${esc(site + a.path)}">リンクをコピー</button>
            <a href="${a.path}" target="_blank" rel="noopener">アプリを開く →</a>
            <a href="/assets/pdf/teacher-kit-${a.id}.pdf" target="_blank" rel="noopener">1枚プリント（PDF）</a>
            <a href="${a.landing}">くわしい説明</a>
          </div>
        </div>
        <figure class="ft-app-qr"><img src="/assets/images/qr/${a.id}.svg" alt="${esc(a.name)}を開くQRコード" width="132" height="132" loading="lazy"><figcaption>カメラで読み取ると<br>アプリが開きます</figcaption></figure>
      </article>`).join('\n');
const pagePath = resolve(root, 'for-teachers.html');
const page = await readFile(pagePath, 'utf8');
const start = page.indexOf('<!-- teacher-apps:start');
const endTag = '<!-- teacher-apps:end -->';
const end = page.indexOf(endTag);
if (start < 0 || end < 0) throw new Error('for-teachers.html に teacher-apps の目印がない');
const startLineEnd = page.indexOf('\n', start) + 1;
await writeFile(pagePath, page.slice(0, startLineEnd) + cards + '\n' + page.slice(end));

// ---- 3. 配布用PDF（A4・白黒） ----
const baseCss = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'BIZ UDPGothic', 'Yu Gothic', 'Meiryo', sans-serif; color: #000; }
  .qr svg { display: block; width: 100%; height: auto; }
  .foot { font-size: 8.5pt; line-height: 1.6; color: #333; border-top: 0.4mm solid #000; padding-top: 3mm; }
`;
const promiseLine = '無料・登録不要・広告なし。子どもの答えや名前は外部に送りません（ページの閲覧数などを Google アナリティクスで計測しています）。';

const printQrs = {};
for (const a of apps) printQrs[a.id] = await qrSvg(withUtm(a.path, 'print', 'qr', 'teacher_pdf'));

const listHtml = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${baseCss}
  h1 { font-size: 20pt; margin: 0 0 2mm; }
  .lead { font-size: 10pt; margin: 0 0 5mm; line-height: 1.6; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 4mm; }
  .cell { display: flex; gap: 3.5mm; border: 0.4mm solid #000; border-radius: 2mm; padding: 3mm; break-inside: avoid; height: 51mm; }
  .cell .qr { flex: 0 0 32mm; }
  .cell h2 { font-size: 12pt; margin: 0 0 1.5mm; letter-spacing: -0.02em; }
  .grade { display: inline-block; font-size: 8.5pt; background: #e6e6e6; padding: 0.6mm 2mm; border-radius: 1mm; margin-bottom: 1.5mm; }
  .desc { font-size: 8.5pt; line-height: 1.55; margin: 0 0 1.5mm; }
  .url { font-size: 7pt; word-break: break-all; color: #333; }
</style></head><body>
  <h1>こども向け 学習アプリ ${apps.length}本</h1>
  <p class="lead">スマートフォンやタブレットのカメラでQRコードを読み取ると、アプリが開きます。ブラウザだけで動き、インストールはいりません。</p>
  <div class="grid">
${apps.map((a) => `    <div class="cell"><div class="qr">${printQrs[a.id]}</div><div>
      <h2>${esc(a.name)}</h2><span class="grade">${esc(a.grade)}</span>
      <p class="desc">${esc(a.teacher)}</p><div class="url">${esc(site + a.path)}</div></div></div>`).join('\n')}
  </div>
  <div class="foot">${promiseLine}<br>先生向けのご案内：${site}/for-teachers.html ／ BEETLE合同会社</div>
</body></html>`;

const singlePage = (a) => `<section class="page">
  <p class="grade">${esc(a.grade)}</p>
  <h1>${esc(a.name)}</h1>
  <p class="kids">${esc(a.kids)}</p>
  <div class="qr">${printQrs[a.id]}</div>
  <p class="how">タブレットや スマートフォンの カメラで よみとってね</p>
  <p class="url">${esc(site + a.path)}</p>
  <div class="foot"><b>おうちのかた・先生へ</b>　${esc(a.teacher)}<br>${promiseLine}</div>
</section>`;
const singleCss = `${baseCss}
  .page { height: 273mm; display: flex; flex-direction: column; align-items: center; text-align: center; break-after: page; }
  .page:last-child { break-after: auto; }
  .grade { font-size: 11pt; border: 0.4mm solid #000; border-radius: 10mm; padding: 1mm 6mm; margin: 6mm 0 6mm; }
  h1 { font-size: 30pt; margin: 0 0 6mm; }
  .kids { font-size: 17pt; margin: 0 0 10mm; }
  .qr { width: 90mm; }
  .how { font-size: 14pt; margin: 6mm 0 2mm; }
  .url { font-size: 9pt; color: #333; margin: 0; }
  .foot { margin-top: auto; text-align: left; width: 100%; }
`;
const singleHtml = (list) => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${singleCss}</style></head><body>${list.map(singlePage).join('\n')}</body></html>`;

const pw = loadPlaywright();
const browser = await pw.chromium.launch({ headless: true, channel: process.env.TEACHER_KIT_BROWSER || 'chrome' });
try {
  const tab = await browser.newPage();
  const pdfDir = resolve(root, 'assets/pdf');
  await mkdir(pdfDir, { recursive: true });
  const toPdf = async (html, name) => {
    await tab.setContent(html, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.pdf({ path: resolve(pdfDir, name), format: 'A4', printBackground: true, preferCSSPageSize: true });
    const pdf = await readFile(resolve(pdfDir, name), 'latin1');
    // Chrome の PDF はページを圧縮しないので「/Type /Page」の数がページ数（/Pages は除く）
    const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log(name, pages, 'ページ');
    return pages;
  };
  // 一覧版は1枚、個別版は1アプリ1枚に収まっていなければ止める
  if (await toPdf(listHtml, 'teacher-kit-list.pdf') !== 1) throw new Error('一覧版が1枚に収まっていない');
  if (await toPdf(singleHtml(apps), 'teacher-kit-single.pdf') !== apps.length) throw new Error('個別版のページ数がアプリの数と合わない');
  for (const a of apps) if (await toPdf(singleHtml([a]), 'teacher-kit-' + a.id + '.pdf') !== 1) throw new Error(a.id + ' が1枚に収まっていない');
} finally {
  await browser.close();
}
console.log('done:', apps.length, 'apps');
