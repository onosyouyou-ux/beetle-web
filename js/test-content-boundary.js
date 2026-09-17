// 境界値セット（2026-09-17追加）
// アップロード制限の値を1つ入れると「1つ少ない・ちょうど・1つ多い」のファイルをまとめて作る。
// 生成の部品は test-content.js の build() / dl() / tsS() / _crc() / fitZip() などを使うので、このファイルは後に読み込む。

const $bd = id => document.getElementById(id);
const fmtN = n => n.toLocaleString('ja-JP');
const TRIO = [[-1, '1つ少ない'], [0, 'ちょうど'], [1, '1つ多い']];
const EXT = { png: 'png', jpeg: 'jpg', svg: 'svg', gif: 'gif', xlsx: 'xlsx', docx: 'docx', pdf_d: 'pdf', txt: 'txt', csv: 'csv', zip_d: 'zip', bin: 'bin' };
const extOf = f => EXT[f] || f;

// これより大きい合計はZIPにまとめるとメモリが足りなくなるので、1つずつダウンロードする
const BD_ZIP_LIMIT = 512 * 1024 * 1024;
// ブラウザのcanvasで作れる大きさ（Chrome・Firefox）。Safariはもっと小さいところで失敗する
const CANVAS_SIDE_MAX = 16384;
const CANVAS_AREA_MAX = 268402689;

/* ---------- 画面の部品 ---------- */

let bdMode = 'size';
document.querySelectorAll('.bd-tab').forEach(t => t.addEventListener('click', () => {
  bdMode = t.dataset.bd;
  document.querySelectorAll('.bd-tab').forEach(x => x.classList.toggle('on', x === t));
  document.querySelectorAll('.bd-panel').forEach(p => p.classList.toggle('on', p.id === 'bd-' + bdMode));
  bdStatus('');
  bdPreview();
}));

// data-multi のグループは複数選択（最低1つは残す）、それ以外は1つだけ選ぶ
document.querySelectorAll('.bd-group').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if ('multi' in g.dataset) {
    if (b.classList.contains('on') && g.querySelectorAll('button.on').length === 1) return;
    b.classList.toggle('on');
  } else {
    g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  }
  bdPreview();
}));
const picked = id => [...$bd(id).querySelectorAll('button.on')].map(b => b.dataset.f);
const pick1 = id => picked(id)[0];

document.querySelectorAll('.bd-preset').forEach(b => b.addEventListener('click', () => {
  $bd('bdImgW').value = b.dataset.w;
  $bd('bdImgH').value = b.dataset.h;
  bdPreview();
}));
document.querySelectorAll('#bdBoundary input').forEach(i => i.addEventListener('input', bdPreview));

const bdStEl = $bd('bdStatus');
function bdStatus(m, err = false) { bdStEl.textContent = m; bdStEl.className = 'status' + (err ? ' err' : ''); }

// 空欄なら null、数字でなければエラー
function numField(id, label, { min = 1, max = Infinity, int = true } = {}) {
  const raw = $bd(id).value.trim();
  if (raw === '') return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || (int && !Number.isInteger(v))) throw new Error(`${label}は${int ? '整数' : '数字'}で入れてください`);
  if (v < min) throw new Error(`${label}は${fmtN(min)}以上にしてください`);
  if (v > max) throw new Error(`${label}は${fmtN(max)}までです`);
  return v;
}

/* ---------- 作る部品 ---------- */

const toBlobP = (c, type, q) => new Promise((res, rej) => c.toBlob(
  b => b ? res(b) : rej(new Error(`${c.width}×${c.height}px はこのブラウザでは作れませんでした（端末かブラウザの上限です）`)), type, q));

// 画像：端がどこか分かるように枠を描き、真ん中に大きさを書く
function sizedCanvas(w, h, sub) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error(`${w}×${h}px はこのブラウザでは作れませんでした`);
  ctx.fillStyle = '#1c1c2e';
  ctx.fillRect(0, 0, w, h);
  const lw = Math.max(1, Math.round(Math.min(w, h) / 80));
  if (w > lw * 2 && h > lw * 2) {
    ctx.strokeStyle = '#C0634C'; ctx.lineWidth = lw;
    ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
  }
  const fs = Math.floor(Math.min(w / 11, h / 4));
  if (fs >= 8) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = `bold ${fs}px sans-serif`;
    ctx.fillText(`${w} × ${h} px`, w / 2, h / 2 - (sub ? fs * 0.35 : 0));
    if (sub) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `${Math.floor(fs * 0.5)}px sans-serif`;
      ctx.fillText(sub, w / 2, h / 2 + fs * 0.55);
    }
  }
  return c;
}

function pngChunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, _crc(out.subarray(4, 8 + data.length)));
  return out;
}
// PNG の dpi は pHYs チャンク（1メートルあたりのピクセル数）。IHDR の直後に入れる
function pngWithDpi(u, dpi) {
  const ppm = Math.round(dpi / 0.0254);
  const phys = new Uint8Array(9);
  const dv = new DataView(phys.buffer);
  dv.setUint32(0, ppm); dv.setUint32(4, ppm); phys[8] = 1;
  const parts = [u.subarray(0, 8)];
  let p = 8;
  while (p + 12 <= u.length) {
    const len = new DataView(u.buffer, u.byteOffset + p, 4).getUint32(0);
    const type = String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]);
    const end = p + 12 + len;
    if (type !== 'pHYs') parts.push(u.subarray(p, end));
    if (type === 'IHDR') parts.push(pngChunk('pHYs', phys));
    p = end;
  }
  return parts;
}
// JPEG の dpi は JFIF（APP0）の密度欄。無ければ SOI の直後に足す
function jpegWithDpi(u, dpi) {
  const hasJfif = u[2] === 0xFF && u[3] === 0xE0 && String.fromCharCode(u[6], u[7], u[8], u[9]) === 'JFIF';
  if (hasJfif) {
    const c = u.slice();
    c[13] = 1; c[14] = dpi >> 8; c[15] = dpi & 255; c[16] = dpi >> 8; c[17] = dpi & 255;
    return [c];
  }
  const app0 = new Uint8Array([0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 1, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0]);
  return [u.subarray(0, 2), app0, u.subarray(2)];
}
async function mSizedImage(fmt, w, h, dpi) {
  if (w > CANVAS_SIDE_MAX || h > CANVAS_SIDE_MAX) throw new Error(`1辺${fmtN(CANVAS_SIDE_MAX)}pxを超える画像はブラウザでは作れません（${w}×${h}px）`);
  if (w * h > CANVAS_AREA_MAX) throw new Error(`${w}×${h}px は画素数が多すぎてブラウザでは作れません`);
  const c = sizedCanvas(w, h, dpi ? `${dpi} dpi` : 'BEETLE QA Tool');
  const type = fmt === 'png' ? 'image/png' : 'image/jpeg';
  const blob = await toBlobP(c, type, 0.9);
  c.width = c.height = 0; // 大きいcanvasのメモリを早めに返す
  if (!dpi) return blob;
  const u = new Uint8Array(await blob.arrayBuffer());
  return new Blob(fmt === 'png' ? pngWithDpi(u, dpi) : jpegWithDpi(u, dpi), { type });
}

// PDF：ページごとに「Page i / N」と書く
function mPdfPages(n) {
  const objs = ['<</Type /Catalog /Pages 2 0 R>>', '', '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>'];
  const kids = [];
  for (let i = 1; i <= n; i++) {
    const pageNo = objs.length + 1;
    kids.push(`${pageNo} 0 R`);
    const s = `BT /F1 48 Tf 72 700 Td (Page ${i} / ${n}) Tj /F1 14 Tf 0 -40 Td (BEETLE QA Tool) Tj ET`;
    objs.push(`<</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${pageNo + 1} 0 R /Resources <</Font <</F1 3 0 R>>>>>>`);
    objs.push(`<</Length ${s.length}>>\nstream\n${s}\nendstream`);
  }
  objs[1] = `<</Type /Pages /Kids [${kids.join(' ')}] /Count ${n}>>`;
  const parts = ['%PDF-1.4\n'];
  let pos = parts[0].length;
  const offs = [];
  objs.forEach((o, k) => { const s = `${k + 1} 0 obj\n${o}\nendobj\n`; offs.push(pos); parts.push(s); pos += s.length; });
  parts.push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<</Size ${objs.length + 1} /Root 1 0 R>>\nstartxref\n${pos}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

// CSV：rows はファイルの行数（ヘッダーを数えるかどうかは呼ぶ側で決める）
function mCsvRows(dataRows, withHeader) {
  const parts = withHeader ? ['id,name,value\n'] : [];
  for (let i = 1; i <= dataRows; i++) parts.push(`${i},row${i},${(i * 7919) % 10000}\n`);
  return new Blob(parts, { type: 'text/csv' });
}
async function mXlsxRows(dataRows, withHeader) {
  const P = 'http://schemas.openxmlformats.org/package/2006', O = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', X = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const rows = [];
  let r = 1;
  const cell = (ref, v) => typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`;
  if (withHeader) rows.push(`<row r="1">${cell('A1', 'id')}${cell('B1', 'name')}${cell('C1', 'value')}</row>`), r++;
  for (let i = 1; i <= dataRows; i++, r++) rows.push(`<row r="${r}">${cell('A' + r, i)}${cell('B' + r, 'row' + i)}${cell('C' + r, (i * 7919) % 10000)}</row>`);
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `${head}<Types xmlns="${P}/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
  zip.file('_rels/.rels', `${head}<Relationships xmlns="${P}/relationships"><Relationship Id="rId1" Type="${O}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `${head}<workbook xmlns="${X}" xmlns:r="${O}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `${head}<Relationships xmlns="${P}/relationships"><Relationship Id="rId1" Type="${O}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  zip.file('xl/worksheets/sheet1.xml', `${head}<worksheet xmlns="${X}"><sheetData>${rows.join('')}</sheetData></worksheet>`);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(b => new Blob([b], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

// WAV：本当に再生できる。1秒ごとに「ピッ」と鳴るので長さを耳でも数えられる
function mWav(sec) {
  const rate = 8000, n = Math.round(sec * rate);
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    if (t % 1 < 0.15) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * 880 * t) * 6000), true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// 枚数テスト用の小さい画像（番号入り）
async function mNumberedPng(i) {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 100;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1c1c2e'; ctx.fillRect(0, 0, 160, 100);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(i), 80, 50);
  return toBlobP(c, 'image/png');
}

/* ---------- ファイル名の組み立て ---------- */

const NAME_CHARS = {
  ascii: [...'1234567890'],
  kana: [...'あいうえおかきくけこ'],
  emoji: [...'😀🐞🍣🚀🎉'],
};
const u8len = s => new TextEncoder().encode(s).length;
const cpLen = s => [...s].length;
// 数え方に合わせて、ちょうど k の長さの名前（拡張子の前）を作る。バイト数で端数が出たら半角の a で埋める
function stemOfLength(k, kind, unit) {
  const chars = NAME_CHARS[kind];
  let s = '', i = 0;
  const len = unit === 'bytes' ? u8len : cpLen;
  while (true) {
    const next = s + chars[i % chars.length];
    if (len(next) > k) break;
    s = next; i++;
  }
  while (len(s) < k) s += 'a';
  return s;
}

/* ---------- タブごとの作るものリスト ---------- */
// どのタブも { title, tasks: [{ path, est?, make: async () => Blob, expect? }] , notes? } を返す

function planSize() {
  const v = numField('bdSizeVal', '上限の値', { min: 0, int: false });
  if (v === null) throw new Error('上限の値を入れてください');
  const unit = pick1('bdSizeUnit'), base = +pick1('bdSizeBase');
  const n = Math.round(v * unitBytes(unit, base));
  if (n < 1) throw new Error('上限は1バイト以上にしてください');
  const fmts = picked('bdSizeFmt');
  const tasks = [];
  for (const f of fmts) {
    const ext = extOf(f);
    if ($bd('bdSizeZero').checked) tasks.push({ path: `0_空っぽ_0B.${ext}`, est: 0, expect: 0, make: async () => new Blob([]) });
    TRIO.forEach(([d, label], k) => {
      const b = n + d;
      if (b < 1) return;
      tasks.push({ path: `${k + 1}_${label}_${b}B.${ext}`, est: b, expect: b, make: async () => (await build(f, b, `${v}${unit} ${label}`))[0], fmt: f });
    });
  }
  return {
    title: `容量_${v}${unit}`, tasks,
    preview: `${TRIO.map(([d]) => n + d).filter(b => b >= 1).map(b => fmtN(b) + ' B').join(' ／ ')}　× ${fmts.length}形式`,
  };
}

function planImage() {
  const W = numField('bdImgW', '幅', { max: 100000 });
  const H = numField('bdImgH', '高さ', { max: 100000 });
  const D = numField('bdImgDpi', 'dpi', { max: 65534 });
  if (W === null && H === null && D === null) throw new Error('幅・高さ・dpi のどれかを入れてください');
  const w0 = W ?? H ?? 800, h0 = H ?? W ?? 600;
  const variants = [], seen = new Set();
  const add = (w, h, dpi, label) => {
    if (w < 1 || h < 1 || (dpi !== null && dpi < 1)) return;
    const key = `${w}x${h}@${dpi}`;
    if (seen.has(key)) return;
    seen.add(key);
    variants.push({ w, h, dpi, label });
  };
  if (W !== null) TRIO.forEach(([d, l]) => add(W + d, h0, D, `幅が${l}`));
  if (H !== null) TRIO.forEach(([d, l]) => add(w0, H + d, D, `高さが${l}`));
  if (D !== null) TRIO.forEach(([d, l]) => add(w0, h0, D + d, `dpiが${l}`));
  // ブラウザで作れない大きさは、全体を止めずにそれだけ外す
  const tooBig = variants.filter(x => x.w > CANVAS_SIDE_MAX || x.h > CANVAS_SIDE_MAX || x.w * x.h > CANVAS_AREA_MAX);
  const ok = variants.filter(x => !tooBig.includes(x));
  const fmts = picked('bdImgFmt');
  const tasks = [];
  for (const f of fmts) ok.forEach((x, k) => tasks.push({
    path: `${k + 1}_${x.label}_${x.w}x${x.h}px${x.dpi ? `_${x.dpi}dpi` : ''}.${extOf(f)}`,
    make: () => mSizedImage(f, x.w, x.h, x.dpi),
  }));
  const big = ok.some(x => x.w * x.h > 16777216);
  const warns = [];
  if (tooBig.length) warns.push(`${tooBig.map(x => `${x.w}×${x.h}px`).join('、')} はブラウザで作れる大きさ（1辺${fmtN(CANVAS_SIDE_MAX)}px）を超えるので外します。`);
  if (big) warns.push('1,677万画素（4096×4096）を超える画像は、Safari と iPhone では作れないことがあります。');
  return {
    title: `画像_${[W && `幅${W}`, H && `高さ${H}`, D && `${D}dpi`].filter(Boolean).join('_')}`, tasks,
    preview: `${ok.map(x => `${x.w}×${x.h}${x.dpi ? `・${x.dpi}dpi` : ''}`).join(' ／ ')}　× ${fmts.length}形式`,
    warn: warns.join(' '),
  };
}

const TRICKY_NAMES = e => [
  ['二重拡張子（手前がphp）', `test.php.${e}`],
  ['二重拡張子（末尾がphp）', `test.${e}.php`],
  ['拡張子が大文字', `TEST.${e.toUpperCase()}`],
  ['拡張子なし', 'test'],
  ['ドットが2つ続く', `test..${e}`],
  ['先頭がドット', `.test.${e}`],
  ['半角スペース入り', `test file.${e}`],
  ['先頭が半角スペース', ` test.${e}`],
  ['全角スペース入り', `テスト　画像.${e}`],
  ['記号入り', `test#&%+;=@!~.${e}`],
  ['括弧入り', `test[1](2){3}.${e}`],
  ['クォート入り（画面表示のエスケープ確認）', `x' onmouseover='alert(1).${e}`],
  ['URLエンコード風', `..%2F..%2Ftest.${e}`],
  ['日本語', `テスト画像.${e}`],
  ['半角カナ', `ﾃｽﾄｶﾞｿﾞｳ.${e}`],
  ['機種依存文字', `①㈱髙﨑.${e}`],
  ['絵文字', `🐞テスト.${e}`],
  ['濁点が分かれた文字（Macで付けた名前と同じ形）', `がぎぐ.${e}`.normalize('NFD')],
];

function planName() {
  const N = numField('bdNameLen', '長さの上限', { max: 1000 });
  const tricky = $bd('bdNameTricky').checked;
  if (N === null && !tricky) throw new Error('長さの上限を入れるか、「意地悪な名前・拡張子」にチェックを入れてください');
  const f = pick1('bdNameFmt'), e = extOf(f);
  const unit = pick1('bdNameUnit'), kind = pick1('bdNameKind'), incl = pick1('bdNameExt') === 'in';
  const unitLabel = unit === 'bytes' ? 'バイト' : '文字';
  let content;
  const body = async () => content ??= (await build(f, 2048, 'TEST DATA'))[0];
  const tasks = [], list = [];
  if (N !== null) {
    const extLen = (unit === 'bytes' ? u8len : cpLen)('.' + e);
    TRIO.forEach(([d, label], k) => {
      const n = N + d, stemLen = incl ? n - extLen : n;
      if (stemLen < 1) return;
      const name = `${stemOfLength(stemLen, kind, unit)}.${e}`;
      const dir = `長さ/${k + 1}_${label}_${n}${unitLabel}`;
      tasks.push({ path: `${dir}/${name}`, make: body });
      list.push(`${dir}/ … 名前が${n}${unitLabel}（拡張子を${incl ? '含む' : '含まない'}）`);
    });
  }
  if (tricky) {
    TRICKY_NAMES(e).forEach(([label, name]) => {
      tasks.push({ path: `意地悪な名前/${name}`, make: body });
      list.push(`意地悪な名前/${name}  … ${label}`);
    });
    const mis = [
      ['PNGの中身なのに拡張子がjpg', 'pngの中身.jpg', async () => (await build('png', 2048, 'PNG'))[0]],
      ['JPEGの中身なのに拡張子がpng', 'jpegの中身.png', async () => (await build('jpeg', 2048, 'JPEG'))[0]],
      ['PDFの中身なのに拡張子がpng', 'pdfの中身.png', async () => (await build('pdf_d', 2048, 'PDF'))[0]],
      ['テキストの中身なのに拡張子がpng', 'テキストの中身.png', async () => new Blob(['This is not an image.\n'])],
      ['HTMLの中身なのに拡張子がpng（中身で判定しているかの確認）', 'htmlの中身.png', async () => new Blob(['<!doctype html><html><body><script>alert("BEETLE QA Tool")</script></body></html>\n'])],
      ['先頭だけPNGで残りが壊れている', '壊れた画像.png', async () => { const a = new Uint8Array(2048); fillRandom(a); a.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); return new Blob([a]); }],
      ['0バイト', '空っぽ.png', async () => new Blob([])],
    ];
    mis.forEach(([label, name, make]) => {
      tasks.push({ path: `中身と拡張子が違う/${name}`, make });
      list.push(`中身と拡張子が違う/${name}  … ${label}`);
    });
  }
  tasks.push({ path: '一覧.txt', make: async () => new Blob(['﻿' + ['ダミーファイル生成ツール（BEETLE）で作ったファイル名のテストセットです。', '', ...list, '',
    '※ Windowsで展開するときは、展開先のフォルダ名を短くしてください（パス全体が260文字を超えると展開できません）。',
    '※ 濁点が分かれた文字は、展開するソフトによって1文字にまとめ直されることがあります。'].join('\r\n')], { type: 'text/plain' }) });
  return {
    title: `ファイル名${N !== null ? `_${N}${unitLabel}` : ''}`, tasks,
    preview: [N !== null && `${TRIO.map(([d]) => N + d).join(' ／ ')} ${unitLabel}`, tricky && `意地悪な名前 ${TRICKY_NAMES(e).length}個＋中身違い 7個`].filter(Boolean).join('　＋　'),
    warn: N !== null && N > 200 ? 'Windowsはファイル名255文字（絵文字は1つで2文字ぶん）が上限です。展開先のフォルダ名も短くしてください。' : '',
  };
}

const LEN_KIND = {
  count: { unit: '枚', max: 1000 },
  pages: { unit: 'ページ', max: 5000 },
  rows: { unit: '行', max: 1000000 },
  secs: { unit: '秒', max: 3600 },
};
function planLength() {
  const kind = pick1('bdLenKind');
  const { unit, max } = LEN_KIND[kind];
  const step = kind === 'secs' ? +pick1('bdSecStep') : 1;
  const N = numField('bdLenVal', '上限の値', { max, int: kind !== 'secs', min: kind === 'secs' ? step : 1 });
  if (N === null) throw new Error('上限の値を入れてください');
  const round = x => Math.round(x * 10) / 10;
  const trio = TRIO.map(([d, l], k) => [round(N + d * step), l, k + 1]).filter(([n]) => n >= (kind === 'rows' ? 0 : kind === 'secs' ? 0.1 : 1));
  const tasks = [];
  if (kind === 'count') {
    const cache = [];
    const img = i => cache[i] ??= mNumberedPng(i);
    for (const [n, l, k] of trio) {
      const w = String(N + 1).length;
      for (let i = 1; i <= n; i++) tasks.push({ path: `${k}_${l}_${n}枚/${String(i).padStart(w, '0')}.png`, make: () => img(i) });
    }
  } else if (kind === 'pages') {
    for (const [n, l, k] of trio) tasks.push({ path: `${k}_${l}_${n}ページ.pdf`, make: async () => mPdfPages(n) });
  } else if (kind === 'rows') {
    const header = pick1('bdRowHeader') === 'in';
    for (const f of picked('bdRowFmt')) for (const [n, l, k] of trio) {
      // ヘッダーを行数に含めるなら、データ行はそのぶん1つ減らす
      const dataRows = header ? n - 1 : n;
      if (dataRows < 0) continue;
      tasks.push({ path: `${k}_${l}_${n}行.${f}`, make: async () => f === 'csv' ? mCsvRows(dataRows, true) : mXlsxRows(dataRows, true) });
    }
  } else {
    for (const [n, l, k] of trio) tasks.push({ path: `${k}_${l}_${n}秒.wav`, make: async () => mWav(n) });
  }
  return {
    title: `${{ count: '枚数', pages: 'ページ数', rows: '行数', secs: '長さ' }[kind]}_${N}${unit}`, tasks,
    preview: `${trio.map(([n]) => fmtN(n) + unit).join(' ／ ')}`,
  };
}

const PLANS = { size: planSize, image: planImage, name: planName, length: planLength };

/* ---------- 表示とダウンロード ---------- */

function bdPreview() {
  // 長さ・件数タブは種類で見せる入力が変わる
  const kind = pick1('bdLenKind');
  $bd('bdLenUnit').textContent = LEN_KIND[kind].unit;
  document.querySelectorAll('[data-len-only]').forEach(el => { el.hidden = el.dataset.lenOnly !== kind; });
  const pv = $bd('bdPreview'), wn = $bd('bdWarn');
  try {
    const p = PLANS[bdMode]();
    pv.textContent = `${p.preview}　→ ${fmtN(p.tasks.length)}ファイル`;
    wn.textContent = p.warn || '';
  } catch (e) {
    pv.textContent = e.message;
    wn.textContent = '';
  }
  wn.hidden = !wn.textContent;
}

$bd('bdGen').addEventListener('click', async () => {
  const btn = $bd('bdGen');
  let plan;
  try { plan = PLANS[bdMode](); } catch (e) { bdStatus(e.message, true); return; }
  if (!plan.tasks.length) { bdStatus('作れるファイルがありません。上限の値を見直してください', true); return; }
  btn.disabled = true;
  const off = [];
  try {
    const est = plan.tasks.reduce((s, t) => s + (t.est || 0), 0);
    const zipName = `境界値_${plan.title}_${tsS()}.zip`;
    // 大きすぎるものはZIPにまとめず、1つ作っては1つ保存する
    if (est > BD_ZIP_LIMIT) {
      for (let i = 0; i < plan.tasks.length; i++) {
        const t = plan.tasks[i];
        bdStatus(`作成中… ${i + 1}/${plan.tasks.length}（大きいので1つずつ保存します。複数ダウンロードの許可を求められたら許可してください）`);
        const blob = await t.make();
        if (t.expect != null && blob.size !== t.expect) off.push(`${t.path}（実際は${fmtN(blob.size)}B）`);
        dl(blob, t.path.replace(/\//g, '_'));
        await new Promise(r => setTimeout(r, 800));
      }
    } else {
      const zip = new JSZip();
      for (let i = 0; i < plan.tasks.length; i++) {
        const t = plan.tasks[i];
        if (i % 20 === 0 || plan.tasks.length < 50) bdStatus(`作成中… ${i + 1}/${plan.tasks.length}`);
        const blob = await t.make();
        if (t.expect != null && blob.size !== t.expect) off.push(`${t.path}（実際は${fmtN(blob.size)}B）`);
        zip.file(t.path, blob, { binary: true });
      }
      bdStatus('ZIPにまとめています…');
      dl(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), zipName);
    }
    bdStatus(off.length
      ? `完了。ただし次のファイルは形式の最小サイズより小さいため、指定どおりのバイト数にできませんでした：${off.join('、')}`
      : `完了 — ${fmtN(plan.tasks.length)}ファイル`, off.length > 0);
  } catch (e) {
    bdStatus('エラー: ' + e.message, true);
  } finally {
    btn.disabled = false;
  }
});

bdPreview();
