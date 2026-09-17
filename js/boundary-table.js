/* ============================================================
   boundary-table.js — 境界値・同値分割のテスト表メーカー
   条件（下限・上限と「以上/より大きい」「以下/未満」）から、境界値と同値クラスのテストケースを作る。
   計算はすべてブラウザ内。サーバー送信は一切しない。
   小数は刻みの桁数で整数に直して数える（0.1 + 0.2 のような誤差を出さないため）。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  if (!$('bt-items')) return;

  var TYPES = {
    int: { label: '整数', unit: '' },
    dec: { label: '小数', unit: '' },
    len: { label: '文字数', unit: '文字' },
    date: { label: '日付', unit: '' },
  };

  var PRESETS = [
    { name: '年齢', type: 'int', lo: '18', loInc: true, hi: '65', hiInc: true, step: '1' },
    { name: 'パスワード', type: 'len', lo: '8', loInc: true, hi: '20', hiInc: true, step: '1' },
    { name: '数量', type: 'int', lo: '0', loInc: false, hi: '100', hiInc: false, step: '1' },
    { name: '割引率', type: 'dec', lo: '0', loInc: true, hi: '100', hiInc: true, step: '0.1' },
    { name: '予約日', type: 'date', lo: '2026-04-01', loInc: true, hi: '2027-03-31', hiInc: true, step: '1' },
  ];

  /* ---------- 値の道具 ---------- */

  function decimals(s) { var m = String(s).match(/\.(\d+)$/); return m ? m[1].length : 0; }
  function parseDate(s) {
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  // 日付は「エポックからの日数」の整数で扱う（夏時間のない日本なので素直に割れる）
  function dayNo(d) { return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
  function fromDayNo(n) { var d = new Date(n * 86400000); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
  // 文字数のテスト値：数えやすいように 1234567890 を繰り返す
  function strOf(n) { var s = ''; for (var i = 0; i < n; i++) s += String((i + 1) % 10); return s; }

  /* ---------- 1項目の条件を読む ---------- */

  function readItem(el) {
    var q = function (sel) { return el.querySelector(sel); };
    var type = q('.bt-type').value;
    var it = {
      name: q('.bt-name').value.trim() || '項目',
      type: type,
      loRaw: q('.bt-lo').value.trim(), loInc: q('.bt-lo-inc').value === 'inc',
      hiRaw: q('.bt-hi').value.trim(), hiInc: q('.bt-hi-inc').value === 'inc',
      stepRaw: q('.bt-step').value.trim(),
    };
    var err = [];
    // すべて「整数の目盛り」に直す。scale は小数の桁合わせ
    if (type === 'date') {
      it.scale = 1;
      it.lo = it.loRaw ? (parseDate(it.loRaw) ? dayNo(parseDate(it.loRaw)) : (err.push('下限の日付は YYYY-MM-DD で入れてください'), null)) : null;
      it.hi = it.hiRaw ? (parseDate(it.hiRaw) ? dayNo(parseDate(it.hiRaw)) : (err.push('上限の日付は YYYY-MM-DD で入れてください'), null)) : null;
      it.step = 1;
    } else {
      var step = type === 'dec' ? (it.stepRaw || '0.1') : '1';
      if (type === 'dec' && !(Number(step) > 0)) err.push('刻みは 0.1 や 0.01 のような正の数にしてください');
      var dp = type === 'dec' ? Math.max(decimals(step), decimals(it.loRaw), decimals(it.hiRaw)) : 0;
      it.scale = Math.pow(10, dp);
      var toInt = function (raw, label) {
        if (!raw) return null;
        var n = Number(raw);
        if (!isFinite(n)) { err.push(label + 'は数字で入れてください'); return null; }
        if (type !== 'dec' && !Number.isInteger(n)) { err.push(label + 'は整数で入れてください'); return null; }
        if (type === 'len' && n < 0) { err.push(label + 'は0以上にしてください'); return null; }
        return Math.round(n * it.scale);
      };
      it.lo = toInt(it.loRaw, '下限');
      it.hi = toInt(it.hiRaw, '上限');
      it.step = Math.round(Number(step) * it.scale) || 1;
    }
    if (it.lo === null && it.hi === null && !err.length) err.push('下限か上限のどちらかを入れてください');
    if (it.lo !== null && it.hi !== null && !err.length) {
      var minV = it.loInc ? it.lo : it.lo + it.step, maxV = it.hiInc ? it.hi : it.hi - it.step;
      if (minV > maxV) err.push('有効な値が1つもありません（下限と上限を見直してください）');
    }
    it.errors = err;
    return it;
  }

  function isValid(it, v) {
    if (it.lo !== null && (it.loInc ? v < it.lo : v <= it.lo)) return false;
    if (it.hi !== null && (it.hiInc ? v > it.hi : v >= it.hi)) return false;
    return true;
  }
  // 目盛りの値を、画面に出す文字と入力に使う文字にする
  function show(it, v) {
    if (it.type === 'date') { var s = fmtDate(fromDayNo(v)); return { text: s, input: s }; }
    if (it.type === 'len') {
      if (v < 0) return null;
      var str = strOf(v);
      return { text: v === 0 ? '0文字（空欄）' : v + '文字', input: str };
    }
    var dp = Math.round(Math.log10(it.scale));
    var t = (v / it.scale).toFixed(dp);
    return { text: t, input: t };
  }
  function condText(it) {
    var s = function (v) { return show(it, v).text.replace('（空欄）', ''); };
    var parts = [];
    if (it.lo !== null) parts.push(s(it.lo) + (it.loInc ? ' 以上' : ' より大きい'));
    if (it.hi !== null) parts.push(s(it.hi) + (it.hiInc ? ' 以下' : ' 未満'));
    return parts.join('、');
  }

  /* ---------- テストケースを作る ---------- */

  function cases(it, mode, withOdd) {
    var out = [], seen = {};
    var push = function (kind, v, why) {
      var sh = show(it, v);
      if (!sh || seen[kind + v]) return;
      seen[kind + v] = true;
      out.push({ kind: kind, value: sh.text, input: sh.input, why: why, expect: isValid(it, v) ? '有効' : '無効', sort: v });
    };
    // 境界値
    [['lo', it.lo, '下限'], ['hi', it.hi, '上限']].forEach(function (b) {
      if (b[1] === null) return;
      var B = b[1], s = it.step;
      var pts = [[B - s, b[2] + 'の1つ手前'], [B, b[2] + 'ちょうど'], [B + s, b[2] + 'の1つ先']];
      if (mode === '2') {
        // 有効と無効が入れかわる境目をはさむ2点だけ残す
        pts = pts.filter(function (p, i) {
          var next = pts[i + 1], prev = pts[i - 1];
          return (next && isValid(it, p[0]) !== isValid(it, next[0])) || (prev && isValid(it, p[0]) !== isValid(it, prev[0]));
        });
      }
      pts.forEach(function (p) { push('境界値', p[0], p[1]); });
    });
    // 同値クラスの代表値（境界から離れた値）
    var s10 = it.step * 10;
    if (it.lo !== null && it.hi !== null) {
      var mid = Math.round((it.lo + it.hi) / 2 / it.step) * it.step;
      if (!isValid(it, mid)) mid = it.loInc ? it.lo : it.lo + it.step;
      push('同値クラス', mid, '有効な範囲のまん中');
    } else if (it.lo !== null) push('同値クラス', it.lo + s10, '有効な範囲（下限から離れた値）');
    else push('同値クラス', it.hi - s10, '有効な範囲（上限から離れた値）');
    if (it.lo !== null) push('同値クラス', it.type === 'len' ? Math.max(0, it.lo - s10) : it.lo - s10, '下限より小さい範囲');
    if (it.hi !== null) push('同値クラス', it.hi + s10, '上限より大きい範囲');
    out.sort(function (a, b) { return a.kind === b.kind ? a.sort - b.sort : (a.kind === '境界値' ? -1 : 1); });

    if (withOdd) odd(it).forEach(function (o) { out.push({ kind: '型ちがい', value: o[0], input: o[1], why: o[2], expect: o[3] }); });
    return out;
  }

  // 仕様で決まっていないことが多い値。期待結果を決めつけず「要確認」で出す
  function odd(it) {
    var anyValid = it.lo !== null ? (it.loInc ? it.lo : it.lo + it.step) : it.hi - it.step * 10;
    var v = show(it, anyValid);
    var zen = function (s) { return s.replace(/[0-9.\-]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + 0xFEE0); }); };
    if (it.type === 'int') return [
      ['空欄', '', '必須かどうか', '要確認'],
      ['小数', v.input + '.5', '整数だけ受け付けるか', '無効'],
      ['全角数字', zen(v.input), '全角を半角に直して受け付けるか', '要確認'],
      ['前後に空白', ' ' + v.input + ' ', '空白を取り除くか', '要確認'],
      ['先頭に0', '0' + v.input, '「0' + v.input + '」を ' + v.input + ' として扱うか', '要確認'],
      ['数字でない', 'abc', '数字以外', '無効'],
    ];
    if (it.type === 'dec') {
      var dp = Math.round(Math.log10(it.scale));
      return [
        ['空欄', '', '必須かどうか', '要確認'],
        ['刻みより細かい', (anyValid / it.scale + it.step / it.scale / 10).toFixed(dp + 1), '丸めるか、弾くか', '要確認'],
        ['全角数字', zen(v.input), '全角を半角に直して受け付けるか', '要確認'],
        ['指数表記', '1e2', 'JavaScript の Number() は 100 として通してしまう', '要確認'],
        ['カンマ区切り', v.input.replace('.', ','), '小数点にカンマを使う書き方', '要確認'],
        ['数字でない', 'abc', '数字以外', '無効'],
      ];
    }
    if (it.type === 'len') {
      var n = it.hi !== null ? (it.hiInc ? it.hi : it.hi - 1) : Math.max(it.lo, 1);
      var emoji = ''; for (var i = 0; i < n; i++) emoji += '😀';
      var kana = ''; for (var j = 0; j < n; j++) kana += 'あ';
      return [
        ['絵文字で' + n + '文字', emoji, '絵文字は JavaScript の length では1つで2と数える。UTF-8 では4バイト', '要確認'],
        ['ひらがなで' + n + '文字', kana, 'バイト数で数える実装だと、1文字3バイトで上限を超える', '要確認'],
        ['空白だけ', '   ', '空白だけの入力を空欄とみなすか', '要確認'],
        ['前後に空白', ' ' + strOf(Math.max(n - 2, 1)) + ' ', '空白を数に含めるか、取り除くか', '要確認'],
        ['改行を含む', 'abc\ndef', '1行の入力欄に改行が貼り付けられたとき', '要確認'],
      ];
    }
    if (it.type === 'date') {
      var y = fromDayNo(anyValid).getFullYear();
      return [
        ['空欄', '', '必須かどうか', '要確認'],
        ['存在しない日', y + '-02-30', '2月30日', '無効'],
        ['うるう日', nextLeap(y) + '-02-29', '範囲に入るかどうかも合わせて確認', '要確認'],
        ['区切りがちがう', v.input.replace(/-/g, '/'), 'スラッシュ区切りを受け付けるか', '要確認'],
        ['ゼロ埋めなし', v.input.replace(/-0/g, '-'), '「2026-4-1」の形を受け付けるか', '要確認'],
      ];
    }
    return [];
  }
  function nextLeap(y) { while (!((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) y++; return y; }

  /* ---------- 数直線 ---------- */

  function numberLine(it, list) {
    var pts = list.filter(function (c) { return c.kind !== '型ちがい'; }).slice().sort(function (a, b) { return a.sort - b.sort; });
    var wrap = document.createElement('div');
    wrap.className = 'bt-line';
    pts.forEach(function (c, i) {
      var prev = pts[i - 1];
      if (prev && prev.expect !== c.expect) {
        var edge = document.createElement('span');
        edge.className = 'bt-edge';
        edge.setAttribute('aria-hidden', 'true');
        wrap.appendChild(edge);
      }
      var p = document.createElement('span');
      p.className = 'bt-pt ' + (c.expect === '有効' ? 'is-ok' : 'is-ng') + (c.kind === '境界値' ? ' is-bd' : '');
      p.innerHTML = '<b></b><span></span>';
      p.querySelector('b').textContent = c.value.replace('（空欄）', '');
      p.querySelector('span').textContent = c.expect;
      wrap.appendChild(p);
    });
    return wrap;
  }

  /* ---------- 画面 ---------- */

  function addItem(preset) {
    var tpl = $('bt-item-tpl').content.firstElementChild.cloneNode(true);
    var p = preset || PRESETS[0];
    tpl.querySelector('.bt-name').value = p.name;
    tpl.querySelector('.bt-type').value = p.type;
    tpl.querySelector('.bt-lo').value = p.lo;
    tpl.querySelector('.bt-lo-inc').value = p.loInc ? 'inc' : 'exc';
    tpl.querySelector('.bt-hi').value = p.hi;
    tpl.querySelector('.bt-hi-inc').value = p.hiInc ? 'inc' : 'exc';
    tpl.querySelector('.bt-step').value = p.step;
    tpl.querySelector('.bt-remove').addEventListener('click', function () {
      if ($('bt-items').children.length > 1) { tpl.remove(); render(); }
    });
    tpl.addEventListener('input', render);
    tpl.addEventListener('change', render);
    $('bt-items').appendChild(tpl);
    render();
  }

  function syncItemUi(el, it) {
    var date = it.type === 'date';
    el.querySelectorAll('.bt-lo, .bt-hi').forEach(function (i) {
      i.placeholder = date ? 'YYYY-MM-DD（空欄可）' : '空欄可';
      i.inputMode = date ? 'numeric' : 'decimal';
    });
    el.querySelector('.bt-step-field').hidden = it.type !== 'dec';
    el.querySelector('.bt-unit-lo').textContent = TYPES[it.type].unit;
    el.querySelector('.bt-unit-hi').textContent = TYPES[it.type].unit;
  }

  var lastRows = [];

  function render() {
    var mode = document.querySelector('input[name="bt-mode"]:checked').value;
    var withOdd = $('bt-odd').checked;
    var rows = [], lines = $('bt-lines'), errs = [];
    lines.textContent = '';
    Array.prototype.forEach.call($('bt-items').children, function (el) {
      var it = readItem(el);
      syncItemUi(el, it);
      var msg = el.querySelector('.bt-item-err');
      msg.textContent = it.errors.join(' ／ ');
      msg.hidden = !it.errors.length;
      if (it.errors.length) { errs.push(it.name); return; }
      var list = cases(it, mode, withOdd);
      var box = document.createElement('div');
      box.className = 'bt-line-box';
      var hd = document.createElement('p');
      hd.className = 'bt-line-hd';
      hd.textContent = it.name + '：' + condText(it);
      box.appendChild(hd);
      box.appendChild(numberLine(it, list));
      lines.appendChild(box);
      list.forEach(function (c) { rows.push({ item: it.name, cond: condText(it), kind: c.kind, value: c.value, input: c.input, why: c.why, expect: c.expect }); });
    });
    lastRows = rows;
    drawTable(rows);
    $('bt-out').value = format(rows, $('bt-format').value);
    var ng = rows.filter(function (r) { return r.expect === '無効'; }).length;
    var tbd = rows.filter(function (r) { return r.expect === '要確認'; }).length;
    $('bt-info').textContent = rows.length + '件（有効 ' + (rows.length - ng - tbd) + '・無効 ' + ng + '・要確認 ' + tbd + '）' + (errs.length ? '　※ ' + errs.join('・') + ' は条件を直すと表に入ります' : '');
  }

  function drawTable(rows) {
    var tb = $('bt-rows');
    tb.textContent = '';
    rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      [String(i + 1), r.item, r.kind, r.value, r.why, r.expect].forEach(function (t, k) {
        var td = document.createElement('td');
        td.textContent = t;
        if (k === 3) td.className = 'bt-c-val';
        if (k === 5) td.className = 'bt-c-exp ' + (t === '有効' ? 'is-ok' : t === '無効' ? 'is-ng' : 'is-tbd');
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  }

  // 入力値の列は、文字数が長いと表が読めなくなるので見出し表では「値」を、CSV/TSV には実際の入力文字列を入れる
  var HEAD = ['No', '項目', '条件', '分類', '値', '入力する文字列', '観点', '期待結果'];
  function cells(r, i) { return [String(i + 1), r.item, r.cond, r.kind, r.value, r.input, r.why, r.expect]; }
  function format(rows, f) {
    if (f === 'md') {
      var esc = function (s) { return String(s).replace(/\|/g, '\\|').replace(/\n/g, '\\n'); };
      var md = ['| No | 項目 | 分類 | 値 | 観点 | 期待結果 |', '| --- | --- | --- | --- | --- | --- |'];
      rows.forEach(function (r, i) { md.push('| ' + [i + 1, r.item, r.kind, r.value, r.why, r.expect].map(esc).join(' | ') + ' |'); });
      return md.join('\n');
    }
    if (f === 'tsv') {
      var t = function (s) { return String(s).replace(/[\t\n]/g, ' '); };
      return [HEAD.join('\t')].concat(rows.map(function (r, i) { return cells(r, i).map(t).join('\t'); })).join('\n');
    }
    var c = function (s) { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [HEAD.join(',')].concat(rows.map(function (r, i) { return cells(r, i).map(c).join(','); })).join('\r\n');
  }

  function flash(btn, label) {
    btn.textContent = 'コピーしました'; btn.classList.add('is-done');
    setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 1600);
  }

  /* ---------- 起動 ---------- */

  var presetBox = $('bt-presets');
  PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'bt-preset';
    b.textContent = p.name;
    b.addEventListener('click', function () { addItem(p); });
    presetBox.appendChild(b);
  });
  $('bt-add').addEventListener('click', function () { addItem({ name: '項目' + ($('bt-items').children.length + 1), type: 'int', lo: '1', loInc: true, hi: '10', hiInc: true, step: '1' }); });
  $('bt-clear').addEventListener('click', function () { $('bt-items').textContent = ''; addItem(PRESETS[0]); });
  document.querySelectorAll('input[name="bt-mode"]').forEach(function (r) { r.addEventListener('change', render); });
  $('bt-odd').addEventListener('change', render);
  $('bt-format').addEventListener('change', function () { $('bt-out').value = format(lastRows, $('bt-format').value); });
  $('bt-copy').addEventListener('click', function () {
    var btn = $('bt-copy'), text = $('bt-out').value;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { flash(btn, 'コピー'); });
    else { $('bt-out').select(); document.execCommand('copy'); flash(btn, 'コピー'); }
  });
  $('bt-dl').addEventListener('click', function () {
    // Excel で開けるよう UTF-8 BOM を付ける
    var blob = new Blob(['﻿' + format(lastRows, 'csv')], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'boundary-test-cases.csv'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  });

  addItem(PRESETS[0]);
})();
