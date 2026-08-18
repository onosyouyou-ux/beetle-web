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

  var DEPT = ['営業部', '総務部', '経理部', '開発部', '品質保証部', 'カスタマーサポート部', '人事部'];

  // 出力できる項目。並び順＝この配列の順。on:true が初期選択
  var FIELDS = [
    { key: 'id', label: '連番ID', on: false },
    { key: 'name', label: '氏名', on: true },
    { key: 'kana', label: 'かな', on: true },
    { key: 'katakana', label: 'カナ', on: true },
    { key: 'gender', label: '性別', on: true },
    { key: 'birthday', label: '生年月日', on: true },
    { key: 'age', label: '年齢', on: false },
    { key: 'zip', label: '郵便番号', on: true },
    { key: 'pref', label: '都道府県', on: false },
    { key: 'city', label: '市区町村', on: false },
    { key: 'street', label: '番地・建物', on: false },
    { key: 'address', label: '住所（都道府県から）', on: true },
    { key: 'tel', label: '電話番号', on: true },
    { key: 'mobile', label: '携帯番号', on: true },
    { key: 'email', label: 'メール', on: true },
    { key: 'company', label: '会社名', on: true },
    { key: 'department', label: '部署', on: false },
    { key: 'created_at', label: '登録日時', on: false }
  ];

  var PRESETS = {
    all: FIELDS.map(function (f) { return f.key; }),
    basic: ['name', 'kana', 'email', 'tel'],
    address: ['name', 'zip', 'pref', 'city', 'street', 'tel'],
    account: ['id', 'name', 'katakana', 'email', 'created_at']
  };

  // 意地悪モードで足すノイズ。選ばれている列にだけ乗せる
  var NOISE = {
    name: function (v) { return v + ' '; },                       // 末尾スペース
    kana: function (v) { return v.replace(/ /, '　'); },           // 全角スペース区切り
    zip: function (v) { return v.replace(/[0-9]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) + 0xFEE0); }); },
    street: function (v) { return v + '　'; },
    address: function (v) { return v + '　'; },
    email: function (v) { return v.replace('@', '+test@'); },      // プラス付きアドレス
    company: function (v) { return v + '🐛'; }
  };

  function toDate(y, m, d) { return y + '-' + pad(m, 2) + '-' + pad(d, 2); }

  function ageOf(birthday) {
    var b = birthday.split('-');
    var now = new Date();
    var a = now.getFullYear() - parseInt(b[0], 10);
    var md = (now.getMonth() + 1) * 100 + now.getDate();
    if (md < parseInt(b[1], 10) * 100 + parseInt(b[2], 10)) a -= 1;
    return String(a);
  }

  function makeRecord(index, naughty) {
    var isM = Math.random() < 0.5;
    var sei = naughty ? pick(NAUGHTY_SEI) : pick(SEI);
    var mei = pick(isM ? MEI_M : MEI_F);
    var area = pick(AREA);
    var town = pick(TOWN);
    var street = town + (rand(9) + 1) + '丁目' + (rand(30) + 1) + '-' + (rand(20) + 1);
    if (Math.random() < 0.4) street += ' ' + pick(BLDG) + town + (rand(12) + 1) + pad(rand(15) + 1, 2) + '号室';
    var birthday = toDate(1955 + rand(55), rand(12) + 1, rand(28) + 1);
    var created = toDate(new Date().getFullYear() - rand(3), rand(12) + 1, rand(28) + 1);
    var rec = {
      id: String(index + 1),
      name: sei[0] + ' ' + mei[0],
      kana: sei[1] + ' ' + mei[1],
      katakana: sei[2] + ' ' + mei[2],
      gender: isM ? '男' : '女',
      birthday: birthday,
      age: ageOf(birthday),
      zip: area[2] + '-' + pad(rand(10000), 4),
      pref: area[0],
      city: area[1],
      street: street,
      address: area[0] + area[1] + street,
      tel: area[3] + '-' + pad(rand(10000), 4) + '-' + pad(rand(10000), 4),
      mobile: pick(['090', '080', '070']) + '-' + pad(rand(10000), 4) + '-' + pad(rand(10000), 4),
      email: sei[3] + '.' + mei[3] + (rand(90) + 10) + '@example.com',
      company: (Math.random() < 0.8 ? '株式会社' : '有限会社') + pick(CORP_W) + pick(CORP_S),
      department: pick(DEPT),
      created_at: created + ' ' + pad(rand(24), 2) + ':' + pad(rand(60), 2) + ':' + pad(rand(60), 2)
    };
    return rec;
  }

  // 選ばれている列のうちノイズを持つものにだけ、1箇所だけ汚す
  function addNoise(rec, cols) {
    var targets = cols.filter(function (f) { return NOISE[f.key]; });
    if (!targets.length) return;
    var k = pick(targets).key;
    rec[k] = NOISE[k](rec[k]);
  }

  function toCSV(records, cols, sep) {
    var esc = function (v) {
      return /["\n\r]|,|\t/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var head = cols.map(function (f) { return f.label; }).join(sep);
    return [head].concat(records.map(function (r) {
      return cols.map(function (f) { return esc(r[f.key]); }).join(sep);
    })).join('\r\n');
  }

  function toJSON(records, cols) {
    return JSON.stringify(records.map(function (r) {
      var o = {};
      cols.forEach(function (f) { o[f.key] = r[f.key]; });
      return o;
    }), null, 2);
  }

  function toMarkdown(records, cols) {
    var line = function (cells) { return '| ' + cells.join(' | ') + ' |'; };
    return [line(cols.map(function (f) { return f.label; })), line(cols.map(function () { return '---'; }))]
      .concat(records.map(function (r) {
        return line(cols.map(function (f) { return r[f.key]; }));
      })).join('\n');
  }

  var dummyOut = document.getElementById('td-dummy-out');
  var dummyTable = document.getElementById('td-dummy-table');
  var dummyInfo = document.getElementById('td-dummy-info');
  var fieldsBox = document.getElementById('td-fields');
  var lastRecords = [];

  function selectedCols() {
    return FIELDS.filter(function (f) {
      var el = document.getElementById('td-f-' + f.key);
      return el && el.checked;
    });
  }

  function buildFieldCheckboxes() {
    FIELDS.forEach(function (f) {
      var label = document.createElement('label');
      label.className = 'td-field';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.id = 'td-f-' + f.key;
      input.value = f.key;
      input.checked = f.on;
      input.addEventListener('change', renderDummy);
      label.appendChild(input);
      label.appendChild(document.createTextNode(f.label));
      fieldsBox.appendChild(label);
    });
  }

  function applyPreset(name) {
    var keys = PRESETS[name] || [];
    FIELDS.forEach(function (f) {
      var el = document.getElementById('td-f-' + f.key);
      if (el) el.checked = keys.indexOf(f.key) !== -1;
    });
    renderDummy();
  }

  // 件数・意地悪の設定を変えたときだけ作り直す（列や形式の変更では同じデータを使い回す）
  function generateDummy() {
    var n = parseInt(document.getElementById('td-rows').value, 10);
    var naughty = document.getElementById('td-naughty').checked;
    var cols = selectedCols();
    lastRecords = [];
    for (var i = 0; i < n; i++) {
      var dirty = naughty && Math.random() < 0.1;
      var rec = makeRecord(i, dirty);
      if (dirty) addNoise(rec, cols);
      lastRecords.push(rec);
    }
    renderDummy();
  }

  function renderDummy() {
    var format = document.getElementById('td-format').value;
    var cols = selectedCols();
    var thead = dummyTable.querySelector('thead');
    var tbody = dummyTable.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!cols.length) {
      dummyOut.value = '';
      dummyInfo.textContent = '項目を1つ以上選んでください';
      return;
    }

    dummyOut.value = format === 'json' ? toJSON(lastRecords, cols)
      : format === 'md' ? toMarkdown(lastRecords, cols)
        : toCSV(lastRecords, cols, format === 'tsv' ? '\t' : ',');

    // プレビュー表は先頭10件だけ
    var head = document.createElement('tr');
    cols.forEach(function (f) {
      var th = document.createElement('th');
      th.textContent = f.label;
      head.appendChild(th);
    });
    thead.appendChild(head);
    lastRecords.slice(0, 10).forEach(function (r) {
      var tr = document.createElement('tr');
      cols.forEach(function (f) {
        var td = document.createElement('td');
        td.textContent = r[f.key];
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    dummyInfo.textContent = lastRecords.length + '件 × ' + cols.length + '項目を生成（表は先頭10件のみ表示）';
  }

  function downloadDummy() {
    if (!dummyOut.value) return;
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

  if (dummyOut && fieldsBox) {
    buildFieldCheckboxes();
    document.getElementById('td-dummy-gen').addEventListener('click', generateDummy);
    document.getElementById('td-dummy-dl').addEventListener('click', downloadDummy);
    document.getElementById('td-rows').addEventListener('change', generateDummy);
    document.getElementById('td-naughty').addEventListener('change', generateDummy);
    document.getElementById('td-format').addEventListener('change', renderDummy);
    Array.prototype.forEach.call(document.querySelectorAll('.td-preset'), function (btn) {
      btn.addEventListener('click', function () { applyPreset(btn.getAttribute('data-preset')); });
    });
    generateDummy();
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
