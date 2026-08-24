/* ============================================================
   class-roster.js — 先生向けツール共通の「名簿」まわり
   席替えメーカー・班分けメーカーが共有する。

   ■ 個人情報の扱い（このファイルの存在理由）
   名簿は児童の氏名そのものなので、**ネットワークには一切出さない**。
   保存先はこの端末の localStorage だけで、送信処理はここにも呼び出し側にも無い。

   ■ 名簿を1つ保存すれば、席替えでも班分けでも使えるようにしている
   レコードは共通で、ツール固有の結果だけ別フィールドに持つ：
     seating / seatingAt   … 席替えメーカーの前回の座席表
     grouping / groupingAt … 班分けメーカーの前回の班
   DOMには触らない（idがツールごとに違うため、画面との配線は各ツール側）。
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'beetle.rosters.v1';
  var OLD_KEYS = ['beetle.sekigae.rosters.v1'];   // 席替え専用だった頃の保存先

  /* ---------- 保存・よびだし ---------- */

  function readKey(key) {
    try {
      var raw = global.localStorage.getItem(key);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];   // プライベートモードなどで読めないときは「保存なし」として動かす
    }
  }

  /** 保存済みの名簿を全部返す。旧キーに残っていたら1度だけ引き継ぐ */
  function load() {
    var list = readKey(KEY);
    if (list.length) return list;

    for (var i = 0; i < OLD_KEYS.length; i++) {
      var old = readKey(OLD_KEYS[i]);
      if (old.length) {
        save(old);
        return old;
      }
    }
    return [];
  }

  function save(list) {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;   // 容量オーバーやプライベートモード。呼び出し側で「保存できません」と出す
    }
  }

  function find(id) {
    if (!id) return null;
    var hit = load().filter(function (r) { return r.id === id; });
    return hit.length ? hit[0] : null;
  }

  /** 同じidがあれば置き換え、無ければ足す */
  function upsert(rec) {
    var list = load();
    var idx = -1;
    list.forEach(function (r, i) { if (r.id === rec.id) idx = i; });
    if (idx >= 0) list[idx] = rec; else list.push(rec);
    return save(list) ? list : null;
  }

  function remove(id) {
    return save(load().filter(function (r) { return r.id !== id; }));
  }

  function newId() {
    return 'r' + Date.now();
  }

  function today() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ---------- 名前の読み取り ---------- */

  // 「1 田中」「1. 田中」のような出席番号つきでも名前だけを取り出す
  function cleanName(line) {
    var s = String(line).trim();
    if (!s) return '';
    var m = s.match(/^\d+\s*[.．、:：]?\s*(.+)$/);
    if (m && m[1].trim()) return m[1].trim();
    return s;
  }

  // 改行だけでなく、カンマ・読点・タブ・セミコロンでも人を区切る。
  // スペースは「田中 そうた」のように名前の中で使われるので、ふだんは区切りにしない。
  var SEP = /[\n\r\t,、，;；]+/;
  var SEP_WITH_SPACE = /[\n\r\t,、，;；\s　]+/;

  function parseNames(text, splitOnSpace) {
    var raw = String(text || '')
      .split(splitOnSpace ? SEP_WITH_SPACE : SEP)
      .map(cleanName)
      .filter(Boolean);

    // 同姓同名は区別できないので、2人目以降に印をつけて別人として扱う
    var seen = {}, out = [];
    raw.forEach(function (n) {
      seen[n] = (seen[n] || 0) + 1;
      out.push(seen[n] > 1 ? n + '（' + seen[n] + '）' : n);
    });
    return out;
  }

  // 1つの名前に語が3つ以上あると、複数人が1行に詰まっている見込みが高い
  // （「田中 そうた」は2語まで。「田中 佐藤 鈴木」は3語）
  function looksCrammed(names) {
    return names.some(function (n) {
      return n.split(/[\s　]+/).filter(Boolean).length >= 3;
    });
  }

  /** 配慮欄の「田中, 佐藤」を名前の配列にする */
  function splitList(s) {
    return String(s).split(/[,、，]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /* ---------- CSV / Excel の取り込み ---------- */

  /** 学校の名簿CSVは Shift_JIS のことが多いので、化けたら読み直す */
  function decode(buffer) {
    var utf8 = new TextDecoder('utf-8').decode(buffer);
    if (utf8.indexOf('�') < 0) return utf8;
    try {
      return new TextDecoder('shift_jis').decode(buffer);
    } catch (e) {
      return utf8;
    }
  }

  function detectSep(text) {
    var head = text.split('\n')[0] || '';
    return (head.split('\t').length - 1) > (head.split(',').length - 1) ? '\t' : ',';
  }

  /** 引用符つきのセルにも耐えるCSV/TSVパーサ */
  function parseDelimited(text, sep) {
    var rows = [], row = [], cur = '', quoted = false, i = 0;
    text = text.replace(/^﻿/, '');
    while (i < text.length) {
      var ch = text.charAt(i);
      if (quoted) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') { cur += '"'; i += 2; continue; }
          quoted = false; i++; continue;
        }
        cur += ch; i++; continue;
      }
      if (ch === '"') { quoted = true; i++; continue; }
      if (ch === sep) { row.push(cur); cur = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; continue; }
      cur += ch; i++;
    }
    row.push(cur);
    rows.push(row);
    return rows.filter(function (r) {
      return r.some(function (x) { return x.trim(); });
    });
  }

  /** 漢字かなが多い列を「名前の列」と見なして初期選択にする */
  function guessNameCol(rows) {
    var body = rows.slice(1, 11);
    var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var best = -1, bestScore = 0;
    for (var c = 0; c < width; c++) {
      var score = 0;
      body.forEach(function (r) {
        var v = (r[c] || '').trim();
        if (v && /[ぁ-んァ-ヶ一-龠]/.test(v) && !/^\d+$/.test(v)) score++;
      });
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return bestScore ? best : -1;
  }

  function colWidth(rows) {
    return Math.max.apply(null, rows.map(function (r) { return r.length; }));
    }

  /* ---------- 共通の小道具 ---------- */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function copyText(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'コピーしました';
      btn.classList.add('is-done');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('is-done'); }, 1500);
    };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* 何もしない */ }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
  }

  global.BeetleRoster = {
    load: load, save: save, find: find, upsert: upsert, remove: remove,
    newId: newId, today: today,
    cleanName: cleanName, parseNames: parseNames, looksCrammed: looksCrammed, splitList: splitList,
    decode: decode, detectSep: detectSep, parseDelimited: parseDelimited,
    guessNameCol: guessNameCol, colWidth: colWidth,
    shuffle: shuffle, esc: esc, copyText: copyText
  };
})(window);
