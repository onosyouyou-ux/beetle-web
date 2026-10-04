/* ============================================================
   class-roster.js — 先生向けツール共通の「名簿」まわり
   席替えメーカー・班分けメーカーが共有する。

   ■ 個人情報の扱い（このファイルの存在理由）
   名簿は児童の氏名そのものなので、**ネットワークには一切出さない**。
   さらに 2026-08-24 に **localStorage への保存もやめた**（CSVファイルに一本化）。
   配慮も前回の席／班もCSVに入れられるようになり、ブラウザ保存は役割が重なったうえ、
   端末ごとに分かれて職員室と自宅で共有できず、
   「名簿は一切保存しません」と言い切れなくなるため。
   つまりこのツール群は、どこにも保存しない。

   持っているのは「CSVの読み取り」と「名前の読み取り」だけ。
   DOMには触らない（idがツールごとに違うため、画面との配線は各ツール側）。
   ============================================================ */
(function (global) {
  'use strict';

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

  /* ============================================================
     先生向けメーカー（席替え・班分け・クラス分け）で共通のCSV（2026-10-04）
     1つのファイルに各メーカーの列を区分けして並べる。
     各メーカーは自分の列だけを読み書きし、ほかのメーカーの列は消さずにそのまま残して保存する
     ============================================================ */
  var SHARED_COLS = ['出席番号', 'なまえ', '性別', '席の配慮', '席', '座席の形', '班の配慮', '班', 'クラスの配慮', '前のクラス', '新しいクラス'];

  /** 読みこんだ1行のうち、そのメーカーが使わなかった列を「見出し → 値」で取っておく */
  function keepExtras(head, row, usedCols) {
    var out = {};
    (head || []).forEach(function (raw, c) {
      var h = String(raw || '').trim();
      if (!h || usedCols.indexOf(c) >= 0 || /^(出席番号|番号|no\.?|#)$/i.test(h)) return;
      var v = String(row[c] == null ? '' : row[c]).trim();
      if (v) out[h] = v;
    });
    return out;
  }

  /**
   * 共通の列順で書き出す表を作る。
   * people: [{ values: {見出し: 値}（そのメーカーの列）, extra: {見出し: 値}（読みこんだほかの列） }]
   * 共通の列にない見出しは右端に足す
   */
  function sharedRows(people) {
    var heads = SHARED_COLS.slice();
    people.forEach(function (p) {
      [p.values, p.extra].forEach(function (o) {
        Object.keys(o || {}).forEach(function (h) { if (heads.indexOf(h) < 0) heads.push(h); });
      });
    });
    var rows = [heads];
    people.forEach(function (p, i) {
      rows.push(heads.map(function (h) {
        if (h === '出席番号') return String(i + 1);
        if (p.values && Object.prototype.hasOwnProperty.call(p.values, h)) return p.values[h];
        return (p.extra && p.extra[h]) || '';
      }));
    });
    return rows;
  }

  /**
   * 見出しが「○○の配慮」の列のうち、どれがこのメーカーのものか。
   * own は「席の配慮」など。以前のCSVの見出し「配慮」は、自分の列がないときだけ自分のものとして読む
   */
  function ruleColumnRole(h, own, head) {
    if (/の配慮$/.test(h)) return h === own ? 'rule' : 'skip';
    if (/^(配慮|はいりょ)$/.test(h)) {
      var hasOwn = (head || []).some(function (x) { return String(x || '').trim() === own; });
      return hasOwn ? 'skip' : 'rule';
    }
    return null;
  }

  global.BeetleRoster = {
    cleanName: cleanName, parseNames: parseNames, looksCrammed: looksCrammed, splitList: splitList,
    decode: decode, detectSep: detectSep, parseDelimited: parseDelimited,
    guessNameCol: guessNameCol, colWidth: colWidth,
    shuffle: shuffle, esc: esc, copyText: copyText,
    SHARED_COLS: SHARED_COLS, keepExtras: keepExtras, sharedRows: sharedRows, ruleColumnRole: ruleColumnRole
  };
})(window);
