/* ============================================================
   sekigae.js — 席替えメーカー（先生向け）
   名簿と配慮から座席表を作る。計算はすべてブラウザ内で完結し、
   名簿はサーバーに送らない（個人情報を預けずに使えることが前提のツール）。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  if (!$('sk-names')) return;

  var ATTEMPTS = 4000;   // ランダム再試行の上限
  var FRONT_DEPTH = 2;   // 「前列」＝前から何列目までか
  var BACK_DEPTH = 2;    // 「後列」＝後ろから何列目までか

  var SAMPLE_NAMES = [
    '1 佐藤 みゆき', '2 鈴木 けんた', '3 高橋 あおい', '4 田中 そうた', '5 伊藤 ひなた',
    '6 渡辺 りく', '7 山本 さくら', '8 中村 はると', '9 小林 ゆい', '10 加藤 だいち',
    '11 吉田 めい', '12 山田 かなた', '13 佐々木 のあ', '14 山口 いつき', '15 松本 ひまり',
    '16 井上 そら', '17 木村 あかり', '18 林 ゆうき', '19 清水 みなと', '20 山崎 ひなの',
    '21 森 かいと', '22 池田 つむぎ', '23 橋本 りひと', '24 石川 えま', '25 前田 あさひ',
    '26 藤田 ことね', '27 後藤 はやと', '28 岡田 みお', '29 長谷川 れん', '30 村上 ゆあ'
  ].join('\n');

  var SAMPLE_RULES = [
    '離す: 田中 そうた, 中村 はると',
    '前列: 小林 ゆい',
    '後列: 長谷川 れん',
    '固定: 佐藤 みゆき = 1れつ 1ばん'
  ].join('\n');

  /* ---------- 入力を読む ---------- */

  // 「1 田中」「1. 田中」のような出席番号つきでも名前だけを取り出す
  function cleanName(line) {
    var s = line.trim();
    if (!s) return '';
    var m = s.match(/^\d+\s*[.．、:：]?\s*(.+)$/);
    if (m && m[1].trim()) return m[1].trim();
    return s;
  }

  function parseNames(text) {
    var raw = text.split('\n').map(cleanName).filter(Boolean);
    // 同姓同名は区別できないので、2人目以降に印をつけて別人として扱う
    var seen = {}, out = [];
    raw.forEach(function (n) {
      seen[n] = (seen[n] || 0) + 1;
      out.push(seen[n] > 1 ? n + '（' + seen[n] + '）' : n);
    });
    return out;
  }

  function splitNames(s) {
    return s.split(/[,、，]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function parseRules(text, names) {
    var rules = { apart: [], front: [], back: [], fixed: [] };
    var errors = [], warns = [];
    var known = {};
    names.forEach(function (n) { known[n] = true; });

    var checkName = function (n, lineNo) {
      if (known[n]) return n;
      // 名簿が「1 田中」形式でも配慮欄に「田中」だけ書けるようにする
      var hit = names.filter(function (x) { return x.indexOf(n) >= 0; });
      if (hit.length === 1) return hit[0];
      if (hit.length > 1) {
        errors.push(lineNo + '行目：「' + n + '」に当てはまる人が' + hit.length + '人います。名簿と同じ書き方にしてください。');
        return null;
      }
      errors.push(lineNo + '行目：「' + n + '」は名簿にありません。');
      return null;
    };

    text.split('\n').forEach(function (raw, i) {
      var line = raw.trim();
      if (!line || line.charAt(0) === '#') return;
      var lineNo = i + 1;
      var m = line.match(/^([^:：]+)[:：](.*)$/);
      if (!m) {
        errors.push(lineNo + '行目：「離す: 田中, 佐藤」のように、種類と名前を「:」で区切って書いてください。');
        return;
      }
      var kind = m[1].trim(), body = m[2].trim();

      if (/^(離す|はなす|離)$/.test(kind)) {
        var group = splitNames(body).map(function (n) { return checkName(n, lineNo); });
        if (group.some(function (x) { return !x; })) return;
        if (group.length < 2) { errors.push(lineNo + '行目：「離す」は2人以上を「,」で並べてください。'); return; }
        rules.apart.push(group);

      } else if (/^(前列|前|まえ)$/.test(kind)) {
        splitNames(body).forEach(function (n) {
          var v = checkName(n, lineNo);
          if (v) rules.front.push(v);
        });

      } else if (/^(後列|後ろ|後|うしろ)$/.test(kind)) {
        splitNames(body).forEach(function (n) {
          var v = checkName(n, lineNo);
          if (v) rules.back.push(v);
        });

      } else if (/^(固定|席|指定)$/.test(kind)) {
        var fm = body.split(/[=＝]/);
        if (fm.length < 2) { errors.push(lineNo + '行目：「固定: 山本 = 2れつ 3ばん」のように席を書いてください。'); return; }
        var v2 = checkName(fm[0].trim(), lineNo);
        if (!v2) return;
        var nums = (fm[1].match(/\d+/g) || []).map(Number);
        if (nums.length < 2) { errors.push(lineNo + '行目：席は「2れつ 3ばん」のように数字を2つ書いてください。'); return; }
        rules.fixed.push({ name: v2, c: nums[0] - 1, r: nums[1] - 1 });

      } else {
        errors.push(lineNo + '行目：「' + kind + '」は使えません。離す・前列・後列・固定 のどれかにしてください。');
      }
    });

    // 同じ人に前列と後列の両方が付いていたら成立しない
    rules.front.forEach(function (n) {
      if (rules.back.indexOf(n) >= 0) errors.push('「' + n + '」に前列と後列の両方が指定されています。');
    });
    return { rules: rules, errors: errors, warns: warns };
  }

  /* ---------- 席を決める ---------- */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function zoneOf(name, rules) {
    if (rules.front.indexOf(name) >= 0) return 'front';
    if (rules.back.indexOf(name) >= 0) return 'back';
    return 'any';
  }

  function seatOk(zone, r, rows) {
    if (zone === 'front') return r < FRONT_DEPTH;
    if (zone === 'back') return r >= rows - BACK_DEPTH;
    return true;
  }

  function solve(names, rows, cols, rules) {
    // 「離す」相手をすぐ引けるようにしておく
    var apartOf = {};
    rules.apart.forEach(function (group) {
      group.forEach(function (a) {
        group.forEach(function (b) {
          if (a === b) return;
          (apartOf[a] = apartOf[a] || {})[b] = true;
        });
      });
    });

    var fixedAt = {};   // "r,c" → name
    var fixedOf = {};   // name → {r,c}
    rules.fixed.forEach(function (f) {
      fixedAt[f.r + ',' + f.c] = f.name;
      fixedOf[f.name] = f;
    });

    var rest = names.filter(function (n) { return !fixedOf[n]; });
    // 席の候補が狭い順（前列・後列 → それ以外）に置くと成功しやすい
    var zoned = rest.filter(function (n) { return zoneOf(n, rules) !== 'any'; });
    var free = rest.filter(function (n) { return zoneOf(n, rules) === 'any'; });

    for (var attempt = 0; attempt < ATTEMPTS; attempt++) {
      var grid = [];
      for (var r = 0; r < rows; r++) { grid.push(new Array(cols).fill(null)); }
      rules.fixed.forEach(function (f) { grid[f.r][f.c] = f.name; });

      var order = shuffle(zoned.slice()).concat(shuffle(free.slice()));
      var ok = true;

      for (var i = 0; i < order.length; i++) {
        var name = order[i];
        var zone = zoneOf(name, rules);
        var spots = [];
        for (var rr = 0; rr < rows; rr++) {
          for (var cc = 0; cc < cols; cc++) {
            if (grid[rr][cc] === null && seatOk(zone, rr, rows)) spots.push([rr, cc]);
          }
        }
        shuffle(spots);
        var placed = false;
        for (var s = 0; s < spots.length; s++) {
          if (!conflicts(grid, spots[s][0], spots[s][1], name, apartOf, rows, cols)) {
            grid[spots[s][0]][spots[s][1]] = name;
            placed = true;
            break;
          }
        }
        if (!placed) { ok = false; break; }
      }
      if (ok) return grid;
    }
    return null;
  }

  // 前後左右の隣に「離す」相手がいないか（斜めは隣として数えない）
  function conflicts(grid, r, c, name, apartOf, rows, cols) {
    var mine = apartOf[name];
    if (!mine) return false;
    var d = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var i = 0; i < d.length; i++) {
      var nr = r + d[i][0], nc = c + d[i][1];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      var other = grid[nr][nc];
      if (other && mine[other]) return true;
    }
    return false;
  }

  /* ---------- 作れない理由を具体的に出す ---------- */

  function diagnose(names, rows, cols, rules) {
    var msgs = [];
    if (names.length > rows * cols) {
      msgs.push({ text: '席が足りません。', sub: '名簿は' + names.length + '人ですが、席は' + rows + '×' + cols + '＝' + (rows * cols) + '席です。', error: true });
    }
    var seen = {};
    rules.fixed.forEach(function (f) {
      var key = f.r + ',' + f.c;
      if (f.c < 0 || f.c >= cols || f.r < 0 || f.r >= rows) {
        msgs.push({ text: '「' + f.name + '」の固定席が席の外にあります。', sub: '指定は ' + (f.c + 1) + 'れつ ' + (f.r + 1) + 'ばん ですが、席は ' + cols + 'れつ × ' + rows + 'ばん です。', error: true });
      } else if (seen[key]) {
        msgs.push({ text: '固定席が重なっています。', sub: (f.c + 1) + 'れつ ' + (f.r + 1) + 'ばん に「' + seen[key] + '」と「' + f.name + '」の2人が指定されています。', error: true });
      } else seen[key] = f.name;

      var z = zoneOf(f.name, rules);
      if (z === 'front' && f.r >= FRONT_DEPTH) msgs.push({ text: '「' + f.name + '」は前列指定と固定席が矛盾しています。', error: true });
      if (z === 'back' && f.r < rows - BACK_DEPTH) msgs.push({ text: '「' + f.name + '」は後列指定と固定席が矛盾しています。', error: true });
    });

    var frontSeats = Math.min(FRONT_DEPTH, rows) * cols;
    var backSeats = Math.min(BACK_DEPTH, rows) * cols;
    if (rules.front.length > frontSeats) {
      msgs.push({ text: '前列に入りきりません。', sub: '前列指定が' + rules.front.length + '人いますが、前から' + FRONT_DEPTH + '列は' + frontSeats + '席しかありません。', error: true });
    }
    if (rules.back.length > backSeats) {
      msgs.push({ text: '後列に入りきりません。', sub: '後列指定が' + rules.back.length + '人いますが、後ろから' + BACK_DEPTH + '列は' + backSeats + '席しかありません。', error: true });
    }
    return msgs;
  }

  /* ---------- 画面に出す ---------- */

  var state = { grid: null, rows: 0, cols: 0, rules: null };

  function showMsgs(list) {
    $('sk-msg').innerHTML = list.map(function (m) {
      return '<div class="sk-note' + (m.error ? ' is-error' : '') + '">' + esc(m.text) +
        (m.sub ? '<span>' + esc(m.sub) + '</span>' : '') + '</div>';
    }).join('');
  }

  function run() {
    var names = parseNames($('sk-names').value);
    if (!names.length) {
      $('sk-result').classList.remove('is-on');
      showMsgs([{ text: '名簿が空です。', sub: '名前を1行に1人ずつ貼り付けるか、「見本を入れる」を押してください。', error: true }]);
      return;
    }

    var rows = parseInt($('sk-rows').value, 10);
    var cols = parseInt($('sk-cols').value, 10);
    var parsed = parseRules($('sk-rules').value, names);
    if (parsed.errors.length) {
      $('sk-result').classList.remove('is-on');
      showMsgs(parsed.errors.map(function (t) { return { text: t, error: true }; }));
      return;
    }

    var problems = diagnose(names, rows, cols, parsed.rules);
    if (problems.length) {
      $('sk-result').classList.remove('is-on');
      showMsgs(problems);
      return;
    }

    var grid = solve(names, rows, cols, parsed.rules);
    if (!grid) {
      $('sk-result').classList.remove('is-on');
      showMsgs([{
        text: '配慮を全部守れる並びが見つかりませんでした。',
        sub: '「離す」の指定が多すぎるか、前列・後列の指定と重なって身動きが取れなくなっている可能性があります。条件を1つ減らすか、席の数を増やして試してください。',
        error: true
      }]);
      return;
    }

    state = { grid: grid, rows: rows, cols: cols, rules: parsed.rules };
    showMsgs([]);
    render();
  }

  function render() {
    var grid = state.grid, rows = state.rows, cols = state.cols, rules = state.rules;
    var board = $('sk-board');
    board.style.gridTemplateColumns = 'repeat(' + cols + ', auto)';

    var html = '';
    var used = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var name = grid[r][c];
        if (name) used++;
        var tag = '';
        var cls = 'sk-seat';
        if (!name) cls += ' is-empty';
        else if (rules.fixed.some(function (f) { return f.name === name; })) { cls += ' is-fixed'; tag = '固定'; }
        else if (rules.front.indexOf(name) >= 0) tag = '前列';
        else if (rules.back.indexOf(name) >= 0) tag = '後列';
        html += '<div class="' + cls + '">' +
          '<span class="sk-seat-pos">' + (c + 1) + 'れつ ' + (r + 1) + 'ばん</span>' +
          '<span>' + esc(name || 'あき') + '</span>' +
          (tag ? '<span class="sk-seat-tag">' + tag + '</span>' : '') +
          '</div>';
      }
    }
    board.innerHTML = html;
    $('sk-result').classList.add('is-on');
    $('sk-info').textContent = used + '人 / ' + (rows * cols) + '席（あき ' + (rows * cols - used) + '席）';

    // Excelに貼れるようタブ区切りで出す
    var lines = [['', ].concat(colLabels(cols)).join('\t')];
    for (var rr = 0; rr < rows; rr++) {
      var row = [(rr + 1) + 'ばん'];
      for (var cc = 0; cc < cols; cc++) row.push(grid[rr][cc] || '');
      lines.push(row.join('\t'));
    }
    $('sk-out').value = 'こくばん\n' + lines.join('\n');
  }

  function colLabels(cols) {
    var a = [];
    for (var i = 0; i < cols; i++) a.push((i + 1) + 'れつ');
    return a;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function updateCount() {
    var n = parseNames($('sk-names').value).length;
    $('sk-count').textContent = n + '人';
    var rows = parseInt($('sk-rows').value, 10);
    var cols = parseInt($('sk-cols').value, 10);
    var seats = rows * cols;
    $('sk-seats').textContent = '席は ' + seats + '（' + cols + '×' + rows + '）' +
      (n ? '・' + (seats >= n ? 'あき ' + (seats - n) + '席' : n - seats + '席たりません') : '');
  }

  function copyText(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'コピーしました';
      btn.classList.add('is-done');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('is-done'); }, 1500);
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

  /* ---------- 配線 ---------- */

  (function fillSelects() {
    var c = $('sk-cols'), r = $('sk-rows');
    for (var i = 2; i <= 10; i++) {
      var o1 = document.createElement('option');
      o1.value = i; o1.textContent = i + 'れつ';
      if (i === 6) o1.selected = true;
      c.appendChild(o1);
      var o2 = document.createElement('option');
      o2.value = i; o2.textContent = i + 'ばんまで';
      if (i === 5) o2.selected = true;
      r.appendChild(o2);
    }
  })();

  $('sk-names').addEventListener('input', updateCount);
  $('sk-cols').addEventListener('change', updateCount);
  $('sk-rows').addEventListener('change', updateCount);
  $('sk-gen').addEventListener('click', run);
  $('sk-again').addEventListener('click', run);
  $('sk-copy').addEventListener('click', function () { copyText($('sk-out').value, this); });
  $('sk-print').addEventListener('click', function () { window.print(); });
  $('sk-sample').addEventListener('click', function () {
    $('sk-names').value = SAMPLE_NAMES;
    $('sk-rules').value = SAMPLE_RULES;
    // 見本は30人ぶん。席の数もそれに合う既定（6×5）へ戻す
    $('sk-cols').value = '6';
    $('sk-rows').value = '5';
    updateCount();
    run();
  });

  updateCount();
})();
