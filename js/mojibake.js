/* ============================================================
   mojibake.js — 文字化け再現ビューア
   ブラウザは TextDecoder（読む側）しか各種文字コードを持たないため、
   デコーダを総当たりして逆引き表を作り、それをエンコーダとして使う。
   すべてブラウザ内で完結。サーバー送信は一切しない。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  if (!$('mb-in')) return;

  var PRESETS = {
    address: '東京都渋谷区神南1-2-3 ビートルビル',
    dakuten: 'ソ表能十貼暴予', // Shift_JIS の2バイト目が 0x5C（円記号／バックスラッシュ）になる字
    kana: 'ﾃｽﾄﾃﾞｰﾀ ﾊﾝｶｸｶﾅ ｱｲｳｴｵ',
    emoji: '𠮷野家の🍣と㈱髙﨑①'
  };

  var LABELS = {
    'utf-8': 'UTF-8',
    'shift_jis': 'Shift_JIS',
    'euc-jp': 'EUC-JP',
    'windows-1252': 'Latin-1 / Windows-1252'
  };

  // 「このバイト列を書いた文字コード → こう読んだ文字コード」の組み合わせと、その解説
  var CASES = [
    { from: 'utf-8', to: 'shift_jis', note: 'いちばん多い化け方。UTF-8の日本語は1文字3バイト、Shift_JISは2バイトで区切るため、文字の切れ目そのものがずれる。' },
    { from: 'utf-8', to: 'euc-jp', note: 'Linuxの古いシステムやDBの接続設定がEUC-JPのまま残っているときに出る。' },
    { from: 'utf-8', to: 'windows-1252', note: '海外製ライブラリ・メールヘッダ・古いCSV取り込みの定番。バイトは無事なので読み直せば完全に戻る。' },
    { from: 'shift_jis', to: 'utf-8', note: 'Shift_JISのCSVをUTF-8として開いたとき。UTF-8として不正なバイトなので、置換文字（U+FFFD）だらけになる。' },
    { from: 'shift_jis', to: 'euc-jp', note: 'Windowsで作ったファイルをUNIX系で開いたときの古典。' },
    { from: 'euc-jp', to: 'utf-8', note: 'EUC-JPのデータをUTF-8として読んだとき。こちらも置換文字が並ぶ。' },
    { from: 'euc-jp', to: 'shift_jis', note: '文字コードの異なるシステム間でデータを受け渡したときに出る。' }
  ];

  /* ---------- デコーダから逆引きしてエンコーダを作る ---------- */

  var encCache = {};

  function encoderFor(label) {
    if (encCache[label]) return encCache[label];
    if (label === 'utf-8') { encCache[label] = 'native'; return 'native'; }

    var dec;
    try { dec = new TextDecoder(label); } catch (e) { encCache[label] = null; return null; }
    var map = new Map();

    // 1バイトで表せる文字（ASCII・半角カナ・Latin-1 の上位など）
    var one = new Uint8Array(1);
    for (var b = 0; b < 0x100; b++) {
      one[0] = b;
      var s = dec.decode(one);
      if (s.length === 1 && s !== '�' && !map.has(s)) map.set(s, [b]);
    }
    // 2バイトで表せる文字
    var two = new Uint8Array(2);
    for (var hi = 0x81; hi <= 0xFE; hi++) {
      for (var lo = 0x40; lo <= 0xFE; lo++) {
        two[0] = hi; two[1] = lo;
        var s2 = dec.decode(two);
        if (s2.length === 1 && s2 !== '�' && !map.has(s2)) map.set(s2, [hi, lo]);
      }
    }
    encCache[label] = map;
    return map;
  }

  // 文字列 → バイト列。その文字コードに無い文字は missing に集めて '?' に落とす
  function encode(str, label) {
    if (label === 'utf-8') {
      return { bytes: new TextEncoder().encode(str), missing: [] };
    }
    var map = encoderFor(label);
    if (!map) return { bytes: new Uint8Array(0), missing: [], unsupported: true };
    var out = [], missing = [];
    Array.from(str).forEach(function (ch) {
      var b = map.get(ch);
      if (b) { out.push.apply(out, b); }
      else { out.push(0x3F); if (missing.indexOf(ch) < 0) missing.push(ch); } // 0x3F = '?'
    });
    return { bytes: new Uint8Array(out), missing: missing };
  }

  function decode(bytes, label) {
    try { return new TextDecoder(label).decode(bytes); } catch (e) { return ''; }
  }

  function hex(bytes, limit) {
    var a = [];
    for (var i = 0; i < bytes.length && i < limit; i++) {
      a.push(('0' + bytes[i].toString(16).toUpperCase()).slice(-2));
    }
    return a.join(' ') + (bytes.length > limit ? ' …' : '');
  }

  /* ---------- 日本語らしさの採点（逆引きの並べ替えに使う） ---------- */

  // 漢字は化けたテキストにも大量に出るため加点を弱くし、
  // 「化けたときにだけ増える文字」（半角カナ・ラテン拡張・置換文字）を強く減点する。
  // ここを甘くすると、化けた文字列そのものが正解より高い点を取ってしまう。
  function score(s) {
    if (!s) return -Infinity;
    var pt = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c === 0xFFFD) pt -= 5;                                   // 置換文字
      else if (c >= 0x3041 && c <= 0x309F) pt += 4;                // ひらがな
      else if (c >= 0x30A0 && c <= 0x30FF) pt += 3;                // 全角カタカナ
      else if (c >= 0x4E00 && c <= 0x9FFF) pt += 1;                // 漢字
      else if (c >= 0xFF66 && c <= 0xFF9D) pt -= 2;                // 半角カナ
      else if (c >= 0x20 && c < 0x7F) pt += 1;                     // ASCII
      else if (c < 0x20) pt -= 3;                                  // 制御文字
      else if (c >= 0x80 && c <= 0x24F) pt -= 2;                   // ラテン拡張の羅列
      else if (c >= 0xFF01 && c <= 0xFF5E) pt += 1;                // 全角英数記号
      else pt -= 1;
    }
    return pt;
  }

  /* ---------- 化け方の再現 ---------- */

  function renderForward() {
    var src = $('mb-in').value;
    if (!src) {
      $('mb-results').innerHTML = '<p class="mb-empty">文字列を入れると、文字コードを取り違えたときの見た目が並びます。</p>';
      $('mb-bytes').innerHTML = '';
      $('mb-warn').innerHTML = '';
      return;
    }

    // 変換で失われる文字の警告
    var warns = [];
    ['shift_jis', 'euc-jp'].forEach(function (label) {
      var r = encode(src, label);
      if (r.missing.length) {
        warns.push('<div class="mb-warn-item"><strong>' + LABELS[label] + 'に存在しない文字：</strong>' +
          '<span class="mb-warn-chars">' + esc(r.missing.join(' ')) + '</span>' +
          '<span class="mb-warn-note">変換した時点で失われます（<code>?</code> になる）。あとから元に戻せません。</span></div>');
      }
    });
    $('mb-warn').innerHTML = warns.join('');

    $('mb-results').innerHTML = CASES.map(function (c) {
      var enc = encode(src, c.from);
      var garbled = decode(enc.bytes, c.to);
      var lossy = enc.missing.length > 0;
      return '<div class="mb-case">' +
        '<div class="mb-case-hd">' +
          '<span class="mb-tag">' + esc(LABELS[c.from]) + '</span>' +
          '<span class="mb-arrow">のバイトを</span>' +
          '<span class="mb-tag is-to">' + esc(LABELS[c.to]) + '</span>' +
          '<span class="mb-arrow">として読む</span>' +
        '</div>' +
        '<div class="mb-garbled' + (lossy ? ' is-lossy' : '') + '">' + esc(garbled) + '</div>' +
        '<p class="mb-case-note">' + esc(c.note) +
          (lossy ? '<em>この例では変換時に失われた文字があるため、読み直しても元には戻りません。</em>' : '') + '</p>' +
        '<button type="button" class="mb-copy" data-v="' + esc(garbled) + '">コピー</button>' +
        '</div>';
    }).join('');

    $('mb-bytes').innerHTML = ['utf-8', 'shift_jis', 'euc-jp'].map(function (label) {
      var r = encode(src, label);
      return '<div class="mb-byte-row"><span class="mb-byte-l">' + esc(LABELS[label]) + '</span>' +
        '<code class="mb-byte-v">' + esc(hex(r.bytes, 48)) + '</code>' +
        '<span class="mb-byte-n">' + r.bytes.length + ' バイト</span></div>';
    }).join('');
  }

  /* ---------- 原因の逆引き ---------- */

  function renderReverse() {
    var g = $('mb-rev-in').value;
    if (!g) {
      $('mb-rev-out').innerHTML = '<p class="mb-empty">化けた文字列を貼ると、どの文字コードをどう読み違えた結果かを推定します。</p>';
      return;
    }

    var chars = Array.from(g);
    // 置換文字・□ が混ざっている＝その位置のバイトはすでに捨てられている
    var hasLost = /[�□]/.test(g) || (g.match(/[?？]/g) || []).length / chars.length > 0.3;

    var encs = ['utf-8', 'shift_jis', 'euc-jp', 'windows-1252'];
    var cands = [];
    encs.forEach(function (readAs) {
      // 置換文字は元のバイト列に対応しないので、UTF-8として読んだ結果だとは考えられない
      if (readAs === 'utf-8' && /�/.test(g)) return;
      // 「readAs として読んだ結果が g」だと仮定して、バイト列に戻す。
      // 1文字でも readAs で表せない文字があれば、その読み方だった可能性はない
      var back = encode(g, readAs);
      if (back.unsupported || back.missing.length || !back.bytes.length) return;
      encs.forEach(function (realAs) {
        if (realAs === readAs) return;
        var restored = decode(back.bytes, realAs);
        if (!restored || restored === g) return;
        // 正しい読み直しなら置換文字は出ない。出るなら別の組み合わせなので候補にしない
        // （それらしい漢字が並ぶだけの誤答を「いちばん近い候補」として出さないため）
        if (/�/.test(restored)) return;
        cands.push({ readAs: readAs, realAs: realAs, restored: restored, s: score(restored) });
      });
    });

    cands.sort(function (a, b) { return b.s - a.s; });
    var top = cands.filter(function (c) { return c.s > score(g); }).slice(0, 3);

    if (!top.length) {
      var html;
      if (hasLost) {
        html = '<div class="mb-note is-error">変換の時点で文字が失われています。' +
          '<span><code>?</code>・<code>□</code>・置換文字になった位置は、バイト列そのものが捨てられているため復元できません。' +
          '保存する前の入り口で弾くか、最後までUTF-8で通す必要があります。</span></div>';
      } else if (score(g) / chars.length >= 1) {
        // 1文字あたりの点が高い＝ひらがなや読める語が十分に含まれている
        html = '<div class="mb-note">この文字列は化けていないようです。' +
          '<span>読み違えを疑うより先に、フォントや表示側の設定を確認してください。</span></div>';
      } else {
        html = '<div class="mb-note is-error">元に戻せる組み合わせが見つかりませんでした。' +
          '<span>ここで扱っていない文字コード（JIS・UTF-16など）か、二重に化けている可能性があります。</span></div>';
      }
      $('mb-rev-out').innerHTML = html;
      return;
    }

    $('mb-rev-out').innerHTML = top.map(function (c, i) {
      return '<div class="mb-cand' + (i === 0 ? ' is-best' : '') + '">' +
        (i === 0 ? '<div class="mb-cand-badge">いちばん近い候補</div>' : '') +
        '<div class="mb-cand-restored">' + esc(c.restored) + '</div>' +
        '<div class="mb-cand-why"><strong>' + esc(LABELS[c.realAs]) + '</strong>のバイト列を<strong>' +
          esc(LABELS[c.readAs]) + '</strong>として読んだ結果のようです。読み込み側の文字コード指定を ' +
          esc(LABELS[c.realAs]) + ' に直してください。</div>' +
        '<button type="button" class="mb-copy" data-v="' + esc(c.restored) + '">コピー</button>' +
        '</div>';
    }).join('');
  }

  /* ---------- ちいさな道具 ---------- */

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
      setTimeout(function () { btn.textContent = old; btn.classList.remove('is-done'); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
    } else fallback(text, done);
  }
  function fallback(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* 何もしない */ }
    document.body.removeChild(ta);
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  /* ---------- 配線 ---------- */

  $('mb-in').addEventListener('input', debounce(renderForward, 150));
  $('mb-rev-in').addEventListener('input', debounce(renderReverse, 150));

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.mb-copy');
    if (btn) copyText(btn.dataset.v, btn);
    var pre = e.target.closest && e.target.closest('.mb-preset');
    if (pre) { $('mb-in').value = PRESETS[pre.dataset.preset] || ''; renderForward(); }
  });

  $('mb-in').value = PRESETS.address;
  renderForward();
  renderReverse();
})();
