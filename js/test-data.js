/* ============================================================
   test-data.js — 意地悪テストデータ生成器
   すべてブラウザ内で完結（サーバー送信なし）
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 共通ユーティリティ ---------- */

  // data-esc の \n \t \uXXXX などを実文字に戻す
  function decodeEsc(s) {
    return s.replace(/\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|[ntr\\])/g,
      function (m, body, cpHex, uHex) {
        if (cpHex) return String.fromCodePoint(parseInt(cpHex, 16));
        if (uHex) return String.fromCharCode(parseInt(uHex, 16));
        if (body === 'n') return '\n';
        if (body === 't') return '\t';
        if (body === 'r') return '\r';
        return '\\';
      });
  }

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }
  function pad(n, len) { return String(n).padStart(len, '0'); }
  function cps(str) { return Array.from(str); }

  function copyText(text, btn) {
    var done = function () {
      if (!btn) return;
      var original = btn.dataset.label || btn.textContent;
      btn.dataset.label = original;
      btn.textContent = 'コピーしました';
      btn.classList.add('is-done');
      setTimeout(function () {
        btn.textContent = original;
        btn.classList.remove('is-done');
      }, 1400);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
    } else {
      fallback(text, done);
    }
  }

  function fallback(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* 何もしない */ }
    document.body.removeChild(ta);
  }

  /* ---------- コピーボタン（カタログ・出力欄 共通） ---------- */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.td-copy');
    if (!btn) return;
    var text;
    if (btn.dataset.target) {
      var el = document.getElementById(btn.dataset.target);
      text = el ? el.value : '';
      if (!text) return;
    } else if (btn.dataset.esc !== undefined) {
      text = decodeEsc(btn.dataset.esc);
    } else {
      text = btn.dataset.v || '';
    }
    copyText(text, btn);
  });

  /* ---------- バイト数計算 ---------- */

  function utf8Bytes(str) {
    return new TextEncoder().encode(str).length;
  }

  // Shift_JIS（CP932）換算。ブラウザに変換機能がないため文字幅ルールからの推定
  function sjisBytes(str) {
    var bytes = 0, ng = 0;
    cps(str).forEach(function (ch) {
      var cp = ch.codePointAt(0);
      if (cp > 0xFFFF) { ng++; return; }              // サロゲートペアはCP932に無い
      if (cp < 0x80) { bytes += 1; return; }           // ASCII
      if (cp >= 0xFF61 && cp <= 0xFF9F) { bytes += 1; return; } // 半角カナ
      bytes += 2;
    });
    return { bytes: bytes, ng: ng };
  }

  function graphemes(str) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      var seg = new Intl.Segmenter('ja', { granularity: 'grapheme' });
      return Array.from(seg.segment(str)).length;
    }
    return cps(str).length;
  }

  /* ---------- 1. 長さ・境界値の文字列生成 ---------- */

  var lenInput = document.getElementById('td-len');
  var lenKind = document.getElementById('td-len-kind');
  var lenOut = document.getElementById('td-len-out');
  var lenInfo = document.getElementById('td-len-info');
  var MIX = 'テスト用の文字列です。abc123あいうえおカキクケコ漢字ＡＢＣ１２３、';
  var ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function buildLength(n, kind) {
    if (n <= 0) return '';
    var unit = { a: 'a', ja: 'あ', kanji: '漢', kana: 'ｱ', emoji: '🐛' }[kind];
    if (unit) {
      var out = '';
      for (var i = 0; i < n; i++) out += unit;
      return out;
    }
    if (kind === 'an') {
      var s = '';
      for (var j = 0; j < n; j++) s += ALNUM[rand(ALNUM.length)];
      return s;
    }
    var m = '';
    while (m.length < n) m += MIX;
    return m.slice(0, n);
  }

  function renderLength() {
    if (!lenOut) return;
    var n = Math.max(0, Math.min(100000, parseInt(lenInput.value, 10) || 0));
    var kind = lenKind.value;
    var text = buildLength(n, kind);
    lenOut.value = text;
    var sj = sjisBytes(text);
    lenInfo.textContent =
      'JSのlength ' + text.length + ' ／ コードポイント ' + cps(text).length +
      ' ／ 見た目 ' + graphemes(text) + '文字' +
      ' ／ UTF-8 ' + utf8Bytes(text) + 'バイト' +
      ' ／ Shift_JIS換算 ' + sj.bytes + 'バイト' + (sj.ng ? '（変換不可 ' + sj.ng + '文字）' : '');
  }

  if (lenOut) {
    document.getElementById('td-len-gen').addEventListener('click', renderLength);
    document.querySelectorAll('.td-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        lenInput.value = chip.dataset.len;
        renderLength();
      });
    });
    renderLength();
  }

  /* ---------- 2. 日本向けダミーデータ生成 ---------- */

  var SEI = [
    ['佐藤', 'さとう', 'サトウ', 'sato'], ['鈴木', 'すずき', 'スズキ', 'suzuki'],
    ['高橋', 'たかはし', 'タカハシ', 'takahashi'], ['田中', 'たなか', 'タナカ', 'tanaka'],
    ['伊藤', 'いとう', 'イトウ', 'ito'], ['渡辺', 'わたなべ', 'ワタナベ', 'watanabe'],
    ['山本', 'やまもと', 'ヤマモト', 'yamamoto'], ['中村', 'なかむら', 'ナカムラ', 'nakamura'],
    ['小林', 'こばやし', 'コバヤシ', 'kobayashi'], ['加藤', 'かとう', 'カトウ', 'kato'],
    ['吉田', 'よしだ', 'ヨシダ', 'yoshida'], ['山田', 'やまだ', 'ヤマダ', 'yamada'],
    ['佐々木', 'ささき', 'ササキ', 'sasaki'], ['松本', 'まつもと', 'マツモト', 'matsumoto'],
    ['井上', 'いのうえ', 'イノウエ', 'inoue'], ['木村', 'きむら', 'キムラ', 'kimura'],
    ['清水', 'しみず', 'シミズ', 'shimizu'], ['山崎', 'やまざき', 'ヤマザキ', 'yamazaki']
  ];
  var MEI_M = [
    ['大輔', 'だいすけ', 'ダイスケ', 'daisuke'], ['健太', 'けんた', 'ケンタ', 'kenta'],
    ['翔太', 'しょうた', 'ショウタ', 'shota'], ['拓海', 'たくみ', 'タクミ', 'takumi'],
    ['一郎', 'いちろう', 'イチロウ', 'ichiro'], ['悠真', 'ゆうま', 'ユウマ', 'yuma'],
    ['颯太', 'そうた', 'ソウタ', 'sota'], ['和也', 'かずや', 'カズヤ', 'kazuya']
  ];
  var MEI_F = [
    ['さくら', 'さくら', 'サクラ', 'sakura'], ['美咲', 'みさき', 'ミサキ', 'misaki'],
    ['結衣', 'ゆい', 'ユイ', 'yui'], ['陽菜', 'ひな', 'ヒナ', 'hina'],
    ['愛', 'あい', 'アイ', 'ai'], ['優子', 'ゆうこ', 'ユウコ', 'yuko'],
    ['芽衣', 'めい', 'メイ', 'mei'], ['凛', 'りん', 'リン', 'rin']
  ];
  // 都道府県 / 市区町村 / 郵便番号上3桁 / 市外局番
  var AREA = [
    ['東京都', '渋谷区', '150', '03'], ['東京都', '世田谷区', '154', '03'],
    ['大阪府', '大阪市北区', '530', '06'], ['愛知県', '名古屋市中区', '460', '052'],
    ['北海道', '札幌市中央区', '060', '011'], ['福岡県', '福岡市博多区', '812', '092'],
    ['神奈川県', '横浜市西区', '220', '045'], ['京都府', '京都市中京区', '604', '075'],
    ['宮城県', '仙台市青葉区', '980', '022'], ['広島県', '広島市中区', '730', '082']
  ];
  var TOWN = ['桜町', '中央', '本町', '緑が丘', '旭町', '日之出町', '若葉', '大手町', '港南', '東雲'];
  var BLDG = ['コーポ', 'ハイツ', 'メゾン', 'グランド', 'パークサイド'];
  var CORP_W = ['あけぼの', 'ひまわり', '青空', '大和', '未来', '双葉', '暁', '瀬戸'];
  var CORP_S = ['商事', '工業', 'システム', '物産', '製作所', 'ホールディングス'];
  var NAUGHTY_SEI = [
    ['髙橋', 'たかはし', 'タカハシ', 'takahashi'], ['山﨑', 'やまざき', 'ヤマザキ', 'yamazaki'],
    ['𠮷田', 'よしだ', 'ヨシダ', 'yoshida'], ['濵田', 'はまだ', 'ハマダ', 'hamada'],
    ['渡邉', 'わたなべ', 'ワタナベ', 'watanabe']
  ];

  var HEADERS = ['氏名', 'かな', 'カナ', '性別', '生年月日', '郵便番号', '住所', '電話番号', '携帯番号', 'メール', '会社名'];

  function makeRow(naughty) {
    var isM = Math.random() < 0.5;
    var sei = naughty ? pick(NAUGHTY_SEI) : pick(SEI);
    var mei = pick(isM ? MEI_M : MEI_F);
    var area = pick(AREA);
    var town = pick(TOWN);
    var zip = area[2] + '-' + pad(rand(10000), 4);
    var addr = area[0] + area[1] + town + (rand(9) + 1) + '丁目' + (rand(30) + 1) + '-' + (rand(20) + 1);
    if (Math.random() < 0.4) addr += ' ' + pick(BLDG) + town + (rand(12) + 1) + pad(rand(15) + 1, 2) + '号室';
    var year = 1955 + rand(55);
    var month = rand(12) + 1;
    var day = rand(28) + 1;
    var mail = sei[3] + '.' + mei[3] + (rand(90) + 10) + '@example.com';
    var corp = (Math.random() < 0.8 ? '株式会社' : '有限会社') + pick(CORP_W) + pick(CORP_S);
    var row = [
      sei[0] + ' ' + mei[0],
      sei[1] + ' ' + mei[1],
      sei[2] + ' ' + mei[2],
      isM ? '男' : '女',
      year + '-' + pad(month, 2) + '-' + pad(day, 2),
      zip,
      addr,
      area[3] + '-' + pad(rand(10000), 4) + '-' + pad(rand(10000), 4),
      pick(['090', '080', '070']) + '-' + pad(rand(10000), 4) + '-' + pad(rand(10000), 4),
      mail,
      corp
    ];
    if (naughty) {
      // 末尾スペース・全角数字・絵文字など、現場で実際に混ざるノイズを足す
      var noise = rand(4);
      if (noise === 0) row[0] = row[0] + ' ';
      else if (noise === 1) row[5] = row[5].replace(/[0-9]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) + 0xFEE0); });
      else if (noise === 2) row[10] = row[10] + '🐛';
      else row[6] = row[6] + '　'; // 全角スペース
    }
    return row;
  }

  function toCSV(rows, sep) {
    var esc = function (v) {
      return /["\n\r]|,|\t/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    return [HEADERS.join(sep)].concat(rows.map(function (r) {
      return r.map(esc).join(sep);
    })).join('\r\n');
  }

  function toJSON(rows) {
    var keys = ['name', 'kana', 'katakana', 'gender', 'birthday', 'zip', 'address', 'tel', 'mobile', 'email', 'company'];
    return JSON.stringify(rows.map(function (r) {
      var o = {};
      keys.forEach(function (k, i) { o[k] = r[i]; });
      return o;
    }), null, 2);
  }

  function toMarkdown(rows) {
    var line = function (cells) { return '| ' + cells.join(' | ') + ' |'; };
    return [line(HEADERS), line(HEADERS.map(function () { return '---'; }))]
      .concat(rows.map(function (r) { return line(r); })).join('\n');
  }

  var dummyOut = document.getElementById('td-dummy-out');
  var dummyTable = document.getElementById('td-dummy-table');
  var dummyInfo = document.getElementById('td-dummy-info');
  var lastRows = [];

  function renderDummy() {
    var n = parseInt(document.getElementById('td-rows').value, 10);
    var format = document.getElementById('td-format').value;
    var naughty = document.getElementById('td-naughty').checked;
    lastRows = [];
    for (var i = 0; i < n; i++) {
      lastRows.push(makeRow(naughty && Math.random() < 0.1));
    }
    dummyOut.value = format === 'json' ? toJSON(lastRows)
      : format === 'md' ? toMarkdown(lastRows)
        : toCSV(lastRows, format === 'tsv' ? '\t' : ',');

    // プレビュー表は先頭10件だけ
    var thead = dummyTable.querySelector('thead');
    var tbody = dummyTable.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';
    var head = document.createElement('tr');
    HEADERS.forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h;
      head.appendChild(th);
    });
    thead.appendChild(head);
    lastRows.slice(0, 10).forEach(function (r) {
      var tr = document.createElement('tr');
      r.forEach(function (c) {
        var td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    dummyInfo.textContent = n + '件を生成（表は先頭10件のみ表示）';
  }

  function downloadDummy() {
    if (!dummyOut.value) renderDummy();
    var format = document.getElementById('td-format').value;
    var ext = { csv: 'csv', tsv: 'tsv', json: 'json', md: 'md' }[format];
    var mime = format === 'json' ? 'application/json' : 'text/plain';
    var body = dummyOut.value;
    // Excelで開いたときに文字化けしないようCSV/TSVはBOM付きUTF-8
    var parts = (format === 'csv' || format === 'tsv') ? ['﻿', body] : [body];
    var blob = new Blob(parts, { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'test-data.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  if (dummyOut) {
    document.getElementById('td-dummy-gen').addEventListener('click', renderDummy);
    document.getElementById('td-dummy-dl').addEventListener('click', downloadDummy);
    renderDummy();
  }

  /* ---------- 3. 文字数・バイト数カウンター ---------- */

  // 不可視文字などはソースに直接書くと編集事故を起こすので、コードポイントから組み立てる
  function clsRe(ranges) {
    var body = ranges.map(function (r) {
      return Array.isArray(r)
        ? String.fromCharCode(r[0]) + '-' + String.fromCharCode(r[1])
        : String.fromCharCode(r);
    }).join('');
    return new RegExp('[' + body + ']');
  }

  function hasCls(ranges) {
    var re = clsRe(ranges);
    return function (s) { return re.test(s); };
  }

  function hasRe(re) {
    return function (s) { try { return re.test(s); } catch (e) { return false; } };
  }

  // [判定関数, ラベル, 説明, 危険度]
  var CHECKS = [
    [function (s) { return cps(s).some(function (c) { return c.codePointAt(0) > 0xFFFF; }); },
      'サロゲートペア', 'MySQLのutf8（3バイト）やShift_JISに保存できない可能性', true],
    [hasRe(/\p{Extended_Pictographic}/u), '絵文字', '文字数カウント・途中切り詰めで壊れやすい', false],
    [hasRe(/\p{Mn}/u), '結合文字', '見た目が同じでも別文字列。重複チェック・検索をすり抜ける', true],
    [hasCls([0x00AD, [0x200B, 0x200F], 0x2060, 0xFEFF]),
      '不可視文字', 'ゼロ幅スペース等。trimで消えず「同じに見えるのに一致しない」の原因', true],
    [hasCls([[0x202A, 0x202E], [0x2066, 0x2069]]),
      '双方向制御文字', '表示順が反転する。表示偽装・レイアウト崩れ', true],
    [hasCls([[0x0001, 0x0008], [0x000B, 0x000C], [0x000E, 0x001F], 0x007F]),
      '制御文字', 'ログ・CSV・DBで予期しない挙動', true],
    [hasCls([[0xFF61, 0xFF9F]]), '半角カナ', '全角変換の有無・Shift_JIS経路で崩れやすい', false],
    [hasCls([[0xFF01, 0xFF5E]]), '全角英数記号', '半角への正規化がされているか要確認', false],
    [hasCls([[0x2160, 0x217F], [0x2460, 0x24FF], [0x3220, 0x32FF], [0x3300, 0x33FF]]),
      '機種依存文字', '丸数字・単位記号など。PDF・帳票・メールで化ける', false],
    [hasRe(/^\s|\s$/), '前後の空白', 'trimされているか。全角スペースまで落とせているか', false],
    [hasRe(/\r\n|\r|\n/), '改行', '1行入力欄・CSV・ログ出力で崩れる', false],
    [hasRe(/\t/), 'タブ', 'TSV・ログの区切りとぶつかる', false],
    [hasRe(/[<>&"']/), 'HTML特殊文字', 'エスケープ漏れがあるとタグとして解釈される', false],
    [hasRe(/[,"]/), 'CSV特殊文字', 'カンマ・引用符。エクスポート時にクォート処理が要る', false],
    [hasRe(/^[=+\-@]/), 'Excel数式の開始文字', 'CSV経由でExcelが数式として実行する恐れ', true]
  ];

  var countIn = document.getElementById('td-count-in');

  function setStat(id, value, warn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    el.parentElement.classList.toggle('is-warn', !!warn);
  }

  function renderCount() {
    var s = countIn.value;
    var sj = sjisBytes(s);
    setStat('td-c-len', s.length, false);
    setStat('td-c-cp', cps(s).length, cps(s).length !== s.length);
    setStat('td-c-graph', graphemes(s), false);
    setStat('td-c-utf8', utf8Bytes(s), false);
    setStat('td-c-sjis', sj.ng ? '変換不可' : sj.bytes, sj.ng > 0);
    setStat('td-c-lines', s === '' ? 0 : s.split(/\r\n|\r|\n/).length, false);

    var box = document.getElementById('td-flags');
    box.innerHTML = '';
    if (!s) {
      box.innerHTML = '<span class="td-flag-none">文字列を入力すると、DBやCSVで事故りやすい要素を検出します。</span>';
      return;
    }
    var hits = CHECKS.filter(function (c) {
      return c[0](s);
    });
    // 正規化で変わる文字列（NFC/NFKC）も拾う
    if (s.normalize('NFC') !== s) hits.push([null, '正規化で変わる（NFC）', '保存時に正規化されると別文字列になる', true]);
    if (s.normalize('NFKC') !== s) hits.push([null, '正規化で変わる（NFKC）', '全角→半角・丸数字→数字などに変換される', false]);

    if (!hits.length) {
      box.innerHTML = '<span class="td-flag-none">目立った危険要素はありません。長さの境界値も試してみてください。</span>';
      return;
    }
    hits.forEach(function (c) {
      var el = document.createElement('div');
      el.className = 'td-flag' + (c[3] ? ' is-danger' : '');
      el.innerHTML = '';
      el.appendChild(document.createTextNode(c[1] + ' '));
      var d = document.createElement('span');
      d.textContent = '— ' + c[2];
      el.appendChild(d);
      box.appendChild(el);
    });
  }

  if (countIn) {
    countIn.addEventListener('input', renderCount);
    renderCount();
  }
})();
