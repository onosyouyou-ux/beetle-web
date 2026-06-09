let curUnit = 'KB', curRange = 'above';
const sel = new Set(['png']);

document.querySelectorAll('.tog').forEach(b => {
  b.addEventListener('click', () => {
    const v = b.dataset.v;
    if (sel.has(v)) { if (sel.size > 1) { sel.delete(v); b.classList.remove('on'); } }
    else { sel.add(v); b.classList.add('on'); }
    chkMedia();
  });
});

function setUnit(el) { document.querySelectorAll('.ubtn').forEach(x => x.classList.remove('on')); el.classList.add('on'); curUnit = el.dataset.u; }
function setRange(el) { document.querySelectorAll('.rbtn').forEach(x => x.classList.remove('on')); el.classList.add('on'); curRange = el.dataset.r; }
function applyPreset(el) {
  const v = el.value; if (!v) return;
  const [num, unit] = v.split('_');
  document.getElementById('sVal').value = num;
  document.querySelectorAll('.ubtn').forEach(x => x.classList.remove('on'));
  document.querySelector(`.ubtn[data-u="${unit}"]`).classList.add('on');
  curUnit = unit;
}
function chkMedia() {
  const n = document.getElementById('mnote');
  const ha = sel.has('audio'), hv = sel.has('video');
  if (ha && hv) n.innerHTML = '音声・動画（WebM）が含まれます。それぞれ約5秒で録音・録画します。';
  else if (ha) n.innerHTML = '音声（WebM）が含まれます。約5秒で録音します。';
  else if (hv) n.innerHTML = '動画（WebM）が含まれます。約5秒で録画します。';
  n.style.display = (ha || hv) ? 'block' : 'none';
}
function swTab(el) {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('.panel').forEach(x => x.classList.remove('on'));
  document.getElementById('panel-' + el.dataset.tab).classList.add('on');
}

const sampleSizes = [
  { label: '1 KB', bytes: 1024 },
  { label: '10 KB', bytes: 10240 },
  { label: '100 KB', bytes: 102400 },
  { label: '500 KB', bytes: 512000 },
  { label: '1 MB', bytes: 1048576 },
  { label: '5 MB', bytes: 5242880 },
  { label: '10 MB', bytes: 10485760 },
];
const dummyVideoFmts = ['mp4', 'mov', 'avi', 'wmv'];
const dummyAudioFmts = ['mp3', 'wav', 'aac'];

function makeGrid(gridId, fmt, ext, isDummy = false) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  sampleSizes.forEach(({ label, bytes }) => {
    const div = document.createElement('div');
    div.className = 'sc' + (isDummy ? ' dummy-only' : '');
    div.innerHTML = `<div class="sc-ext">${ext}</div><div class="sc-sz">${label}</div>${isDummy ? '<div class="sc-dummy-badge">再生不可</div>' : ''}`;
    div.onclick = () => dlS(div, fmt, 'fixed', bytes);
    grid.appendChild(div);
  });
}

makeGrid('png-grid', 'png', 'png');
makeGrid('jpeg-grid', 'jpeg', 'jpg');
makeGrid('gif-grid', 'gif', 'gif');
makeGrid('xlsx-grid', 'xlsx', 'xlsx');
makeGrid('docx-grid', 'docx', 'docx');
makeGrid('pdf-grid', 'pdf_d', 'pdf');

const mp4g = document.getElementById('mp4-grid');
dummyVideoFmts.forEach(fmt => {
  sampleSizes.forEach(({ label, bytes }) => {
    const div = document.createElement('div');
    div.className = 'sc dummy-only';
    div.innerHTML = `<div class="sc-ext">${fmt}</div><div class="sc-sz">${label}</div><div class="sc-dummy-badge">再生不可</div>`;
    div.onclick = () => dlS(div, fmt, 'fixed', bytes);
    mp4g.appendChild(div);
  });
});

const mp3g = document.getElementById('mp3-grid');
dummyAudioFmts.forEach(fmt => {
  sampleSizes.forEach(({ label, bytes }) => {
    const div = document.createElement('div');
    div.className = 'sc dummy-only';
    div.innerHTML = `<div class="sc-ext">${fmt}</div><div class="sc-sz">${label}</div><div class="sc-dummy-badge">再生不可</div>`;
    div.onclick = () => dlS(div, fmt, 'fixed', bytes);
    mp3g.appendChild(div);
  });
});

function getBytes() {
  const v = parseFloat(document.getElementById('sVal').value) || 1;
  const m = curUnit === 'GB' ? 1073741824 : curUnit === 'MB' ? 1048576 : 1024;
  const base = Math.round(v * m);
  return curRange === 'above' ? Math.round(base * 1.1) : Math.round(base * 0.9);
}
function getSzLabel() { const v = document.getElementById('sVal').value || '?'; return `${v}${curUnit}${curRange === 'above' ? '以上' : '未満'}`; }
function getFT() { return (document.getElementById('fileText').value || 'testdata').replace(/[\\/:*?"<>|]/g, '_'); }
function mkName(ext) { return `${getFT()}_${getSzLabel()}.${ext}`; }
function dl(blob, name) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 5000); }

const stEl = document.getElementById('status');
const gBtn = document.getElementById('genBtn');
function setSt(m, e = false) { stEl.textContent = m; stEl.className = 'status' + (e ? ' err' : ''); }
const tsS = () => new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
const lbl = t => t || 'TEST DATA';

// crypto.getRandomValues の上限 65536 bytes/call を超えないよう分割する
function fillRandom(arr) { for (let i = 0; i < arr.length; i += 65536) crypto.getRandomValues(arr.subarray(i, Math.min(i + 65536, arr.length))); }
function mBin(b) { const a = new Uint8Array(b); fillRandom(a); return new Blob([a], { type: 'application/octet-stream' }); }
function mPdf(b, t) { let s = `%PDF-1.4\n% ${lbl(t)} — BEETLE QA Tool\n1 0 obj\n<</Type/Catalog>>\nendobj\n`; while (s.length < b) s += '% ' + lbl(t) + ' ' + Math.random().toString(36) + '\n'; return new Blob([s.slice(0, b)], { type: 'application/pdf' }); }
function mZip(b) { const a = new Uint8Array(b); a[0] = 0x50; a[1] = 0x4B; a[2] = 0x03; a[3] = 0x04; for (let i = 4; i < b; i++) a[i] = Math.floor(Math.random() * 256); return new Blob([a], { type: 'application/zip' }); }
function mXlsx(b, t) { let s = `id,label,name,email,value,timestamp\n`; let i = 1; while (s.length < b) s += `${i++},${lbl(t)},テストユーザー${i},test${i}@example.com,${(Math.random() * 10000).toFixed(2)},${new Date().toISOString()}\n`; return new Blob([s.slice(0, b)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); }
function mDocx(b, t) { let body = ''; let i = 1; while (body.length < b) body += `<w:p><w:r><w:t>${lbl(t)} 段落${i++}: BEETLE QAツール生成テストデータ。Value: ${Math.random().toFixed(6)}</w:t></w:r></w:p>\n`; const x = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${lbl(t)} — BEETLE QA Tool</w:t></w:r></w:p>${body}</w:body></w:document>`; return new Blob([x], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); }
function mSvg(t) { return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#1c1c2e"/><rect x="20" y="20" width="760" height="560" fill="none" stroke="#C0634C" stroke-width="3"/><text x="400" y="265" text-anchor="middle" font-size="48" font-weight="bold" fill="#C0634C" font-family="sans-serif">${lbl(t)}</text><text x="400" y="318" text-anchor="middle" font-size="20" fill="rgba(255,255,255,0.7)" font-family="sans-serif">BEETLE QA Tool</text><text x="400" y="355" text-anchor="middle" font-size="13" fill="rgba(255,255,255,0.4)" font-family="monospace">${new Date().toISOString()}</text></svg>`], { type: 'image/svg+xml' }); }
function mCanvas(w, h, t) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  // ランダムノイズ背景（圧縮を防いでサイズを目標値に近づける）
  const img = ctx.createImageData(w, h);
  const buf = new Uint8Array(img.data.buffer);
  fillRandom(buf);
  for (let i = 3; i < buf.length; i += 4) buf[i] = 255;
  ctx.putImageData(img, 0, 0);
  const fs = Math.max(12, Math.floor(h / 10));
  ctx.fillStyle = 'rgba(28,28,46,0.72)';
  ctx.fillRect(0, h * 0.32, w, h * 0.36);
  ctx.fillStyle = '#C0634C';
  ctx.font = `bold ${fs}px sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(lbl(t), w / 2, h * 0.5 - fs * 0.3);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `${Math.max(10, Math.floor(fs * 0.55))}px sans-serif`;
  ctx.fillText('BEETLE QA Tool', w / 2, h * 0.5 + fs * 0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `${Math.max(8, Math.floor(fs * 0.35))}px monospace`;
  ctx.fillText(new Date().toISOString(), w / 2, h * 0.5 + fs * 1.1);
  return c;
}
// CRC-32（PNG tEXt チャンクの検証用）
const _ct = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c; } return t; })();
function _crc(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ _ct[(c ^ buf[i]) & 0xFF]; return (c ^ 0xFFFFFFFF) >>> 0; }

// PNG: 小さいcanvasを生成してtEXtチャンクで正確なサイズにパディング
function mPng(b, t) {
  return new Promise(r => {
    const px = Math.min(Math.floor(b * 0.7 / 4), 200 * 150);
    const sc = Math.sqrt(px / (200 * 150));
    const w = Math.max(4, Math.round(200 * sc)), h = Math.max(4, Math.round(150 * sc));
    mCanvas(w, h, t).toBlob(async blob => {
      const src = new Uint8Array(await blob.arrayBuffer());
      if (src.length >= b) { r(new Blob([src], { type: 'image/png' })); return; }
      const needed = b - src.length;
      if (needed < 12) { r(new Blob([src], { type: 'image/png' })); return; }
      const dLen = needed - 12;
      const body = src.slice(0, src.length - 12);
      const iend = src.slice(src.length - 12);
      const ck = new Uint8Array(12 + dLen);
      const dv = new DataView(ck.buffer);
      dv.setUint32(0, dLen, false);
      ck.set([0x74, 0x45, 0x58, 0x74], 4);
      fillRandom(new Uint8Array(ck.buffer, 8, dLen));
      const ci = new Uint8Array(4 + dLen); ci.set(ck.slice(4, 8 + dLen));
      dv.setUint32(8 + dLen, _crc(ci), false);
      r(new Blob([body, ck, iend], { type: 'image/png' }));
    }, 'image/png');
  });
}

// JPEG: 小さいcanvasを生成してCOMマーカーで正確なサイズにパディング
function mJpeg(b, t) {
  return new Promise(r => {
    const px = Math.min(Math.floor(b * 0.5 / 4), 200 * 150);
    const sc = Math.sqrt(px / (200 * 150));
    const w = Math.max(4, Math.round(200 * sc)), h = Math.max(4, Math.round(150 * sc));
    mCanvas(w, h, t).toBlob(async blob => {
      const src = new Uint8Array(await blob.arrayBuffer());
      let needed = b - src.length;
      if (needed <= 0) { r(new Blob([src], { type: 'image/jpeg' })); return; }
      const coms = [];
      while (needed >= 4) {
        const dLen = Math.min(needed - 4, 65533);
        const com = new Uint8Array(4 + dLen);
        com[0] = 0xFF; com[1] = 0xFE;
        const ln = dLen + 2; com[2] = (ln >> 8) & 0xFF; com[3] = ln & 0xFF;
        if (dLen > 0) fillRandom(new Uint8Array(com.buffer, 4, dLen));
        coms.push(com); needed -= (4 + dLen);
      }
      const parts = [src.slice(0, 2), ...coms, src.slice(2)];
      const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
      let off = 0; for (const p of parts) { out.set(p, off); off += p.length; }
      r(new Blob([out], { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.85);
  });
}

// GIF: ブラウザAPIではPNGデータで代用（同じパディング処理）
function mGif(b, t) { return mPng(b, t).then(blob => new Blob([blob], { type: 'image/gif' })); }
function mAudio() { return new Promise((res, rej) => { if (!('speechSynthesis' in window)) { rej(new Error('TTSに対応していません')); return; } const ctx = new (window.AudioContext || window.webkitAudioContext)(); const dest = ctx.createMediaStreamDestination(); const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' }); const chunks = []; rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); }; rec.onstop = () => { ctx.close(); res(new Blob(chunks, { type: 'audio/webm' })); }; rec.start(); const osc = ctx.createOscillator(); osc.frequency.value = 440; osc.connect(dest); osc.start(); const u = new SpeechSynthesisUtterance('これはテストです。本日は晴天なり。これはテストです。'); u.lang = 'ja-JP'; u.rate = 0.9; u.onend = () => { osc.stop(); rec.stop(); }; u.onerror = () => { osc.stop(); rec.stop(); }; setTimeout(() => speechSynthesis.speak(u), 200); }); }
function mVideo() { return new Promise(res => { const w = 640, h = 360; const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); const stream = canvas.captureStream(15); const rec = new MediaRecorder(stream, { mimeType: 'video/webm' }); const chunks = []; rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); }; rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' })); rec.start(); const dur = 5000; const start = Date.now(); const txt = document.getElementById('fileText').value || 'TEST DATA'; function draw() { const el = Date.now() - start; if (el > dur) { rec.stop(); return; } ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(${Math.random() * 60},${Math.random() * 60},${Math.random() * 60},0.7)`; const x = Math.floor(Math.random() * w / 4) * 4; const y = Math.floor(Math.random() * h / 4) * 4; ctx.fillRect(x, y, 4, 4); } ctx.fillStyle = '#C0634C'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, w / 2, h / 2 - 20); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '20px sans-serif'; ctx.fillText('BEETLE QA Tool', w / 2, h / 2 + 18); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '13px monospace'; ctx.fillText(new Date().toISOString(), w / 2, h / 2 + 46); requestAnimationFrame(draw); } draw(); setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, dur + 500); }); }

async function build(fmt, bytes, t) {
  switch (fmt) {
    case 'png': return [await mPng(bytes, t), 'png'];
    case 'jpeg': return [await mJpeg(bytes, t), 'jpg'];
    case 'svg': return [mSvg(t), 'svg'];
    case 'gif': return [await mGif(bytes, t), 'gif'];
    case 'xlsx': return [mXlsx(bytes, t), 'xlsx'];
    case 'docx': return [mDocx(bytes, t), 'docx'];
    case 'pdf_d': return [mPdf(bytes, t), 'pdf'];
    case 'zip_d': return [mZip(bytes), 'zip'];
    case 'bin': return [mBin(bytes), 'bin'];
    case 'audio': return [await mAudio(), 'webm'];
    case 'video': return [await mVideo(), 'webm'];
    default: return [mBin(bytes), fmt];
  }
}

async function generate() {
  gBtn.disabled = true;
  const bytes = getBytes(); const fmts = [...sel]; const t = getFT();
  const hm = fmts.includes('audio') || fmts.includes('video');
  setSt(hm ? '録音/録画を含むため少し時間がかかります…' : '生成中…');
  try {
    if (fmts.length === 1) {
      const [blob, ext] = await build(fmts[0], bytes, t);
      const name = mkName(ext); dl(blob, name);
      const d = blob.size >= 1048576 ? (blob.size / 1048576).toFixed(2) + ' MB' : (blob.size / 1024).toFixed(1) + ' KB';
      setSt(`完了 — ${name}（${d}）`);
    } else {
      const zip = new JSZip();
      for (let i = 0; i < fmts.length; i++) {
        setSt(`生成中… ${i + 1}/${fmts.length} (${fmts[i]})`);
        const [blob, ext] = await build(fmts[i], bytes, t);
        zip.file(`${getFT()}_${getSzLabel()}.${ext}`, blob, { compression: 'STORE' });
      }
      setSt('ZIPを作成中…');
      const zb = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      dl(zb, `${getFT()}_${getSzLabel()}_${tsS()}.zip`);
      setSt(`完了 — ZIP（${(zb.size / 1024).toFixed(1)} KB）`);
    }
  } catch (e) { setSt('エラー: ' + e.message, true); }
  finally { gBtn.disabled = false; }
}

async function dlS(card, fmt, mode, bytes) {
  const sz = card.querySelector('.sc-sz');
  const orig = sz.textContent;
  card.classList.add('loading');
  sz.textContent = mode === 'rec' ? '録音/録画中…' : '生成中…';
  try {
    const [blob, ext] = await build(fmt, bytes, 'TEST DATA');
    const name = `sample_${fmt}_${tsS()}.${ext}`;
    dl(blob, name);
    const d = blob.size >= 1048576 ? (blob.size / 1048576).toFixed(2) + ' MB' : (blob.size / 1024).toFixed(1) + ' KB';
    card.classList.remove('loading'); card.classList.add('done');
    sz.textContent = '✓ ' + d;
    setTimeout(() => { card.classList.remove('done'); sz.textContent = orig; }, 3000);
  } catch (e) { card.classList.remove('loading'); sz.textContent = 'エラー'; setTimeout(() => { sz.textContent = orig; }, 3000); }
}
