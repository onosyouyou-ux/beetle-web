/* ============================================================
   sekigae.js — 席替えメーカー（先生向け）
   名簿と配慮から座席表を作る。計算はすべてブラウザ内で完結し、
   名簿はサーバーに送らない（個人情報を預けずに使えることが前提のツール）。
   ============================================================ */
(function () {
  'use strict';

  // 名簿まわり（保存・CSV取り込み・名前の読み取り）は班分けメーカーと共有する
  var R = window.BeetleRoster;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sk-names') || !R) return;

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

  // 「スペースでも区切る」を押されたときだけ立てる
  var splitOnSpace = false;

  function parseNames(text) { return R.parseNames(text, splitOnSpace); }
  function looksCrammed(names) { return R.looksCrammed(names); }
  function splitNames(s) { return R.splitList(s); }

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

  function shuffle(a) { return R.shuffle(a); }

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

  // prev は「前回の席」を避けるための任意条件。
  // { seatOf:{name:'r,c'}, nbOf:{name:{other:true}}, avoidSeat:bool, avoidNb:bool }
  function solve(names, rows, cols, rules, prev) {
    var avoidSeat = !!(prev && prev.avoidSeat && prev.seatOf);
    var avoidNb = !!(prev && prev.avoidNb && prev.nbOf);

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
            if (grid[rr][cc] !== null || !seatOk(zone, rr, rows)) continue;
            if (avoidSeat && prev.seatOf[name] === rr + ',' + cc) continue;
            spots.push([rr, cc]);
          }
        }
        shuffle(spots);
        var placed = false;
        for (var s = 0; s < spots.length; s++) {
          if (!conflicts(grid, spots[s][0], spots[s][1], name, apartOf, rows, cols) &&
              !(avoidNb && prevNeighbor(grid, spots[s][0], spots[s][1], name, prev.nbOf, rows, cols))) {
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

  var NEIGHBOR_D = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 斜めは隣として数えない

  /** その席の前後左右にいる名前を集める */
  function neighborNames(grid, r, c, rows, cols) {
    var out = [];
    for (var i = 0; i < NEIGHBOR_D.length; i++) {
      var nr = r + NEIGHBOR_D[i][0], nc = c + NEIGHBOR_D[i][1];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc]) out.push(grid[nr][nc]);
    }
    return out;
  }

  // 前後左右の隣に「離す」相手がいないか
  function conflicts(grid, r, c, name, apartOf, rows, cols) {
    var mine = apartOf[name];
    if (!mine) return false;
    return neighborNames(grid, r, c, rows, cols).some(function (other) { return !!mine[other]; });
  }

  // 前後左右の隣が「前回も隣だった相手」になっていないか
  function prevNeighbor(grid, r, c, name, nbOf, rows, cols) {
    var mine = nbOf[name];
    if (!mine) return false;
    return neighborNames(grid, r, c, rows, cols).some(function (other) { return !!mine[other]; });
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

    // 「前回とちがう席に」は守れないこともあるので、守れなければ段階的にゆるめる
    var attempts = prevAttempts();
    var grid = null, relaxed = null;
    for (var i = 0; i < attempts.length; i++) {
      grid = solve(names, rows, cols, parsed.rules, attempts[i].prev);
      if (grid) { relaxed = attempts[i].note; break; }
    }

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
    showMsgs(relaxed ? [{ text: relaxed }] : []);
    render();
  }

  /**
   * 前回の席を避ける条件を、きつい順に並べた試行リストを作る。
   * 前から順に試して、通ったところで採用する（通らない条件は自動で外れる）。
   */
  function prevAttempts() {
    var prev = prevState.data;
    var wantSeat = prev && $('sk-prev-seat').checked;
    var wantNb = prev && $('sk-prev-nb').checked;
    if (!wantSeat && !wantNb) return [{ prev: null, note: '' }];

    var list = [];
    var mk = function (s, n) { return { seatOf: prev.seatOf, nbOf: prev.nbOf, avoidSeat: s, avoidNb: n }; };
    if (wantSeat && wantNb) {
      list.push({ prev: mk(true, true), note: '' });
      list.push({ prev: mk(false, true), note: '前回と同じ席になった子がいます（「同じ隣にしない」だけ守りました）。' });
      list.push({ prev: mk(true, false), note: '前回と同じ隣になった子がいます（「同じ席にしない」だけ守りました）。' });
    } else if (wantSeat) {
      list.push({ prev: mk(true, false), note: '' });
    } else {
      list.push({ prev: mk(false, true), note: '' });
    }
    list.push({ prev: null, note: '前回の席を避ける条件は守れなかったので、外して作りました。' });
    return list;
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

  function esc(s) { return R.esc(s); }

  function updateCount() {
    var names = parseNames($('sk-names').value);
    var n = names.length;
    $('sk-count').textContent = n + '人';
    updateSepNote(names);
    var rows = parseInt($('sk-rows').value, 10);
    var cols = parseInt($('sk-cols').value, 10);
    var seats = rows * cols;
    $('sk-seats').textContent = '席は ' + seats + '（' + cols + '×' + rows + '）' +
      (n ? '・' + (seats >= n ? 'あき ' + (seats - n) + '席' : n - seats + '席たりません') : '');
  }

  // 「1行に1人」が伝わりにくいので、詰まって見えるときだけその場で直せるようにする
  function updateSepNote(names) {
    var note = $('sk-sep-note');
    if (!note) return;
    if (splitOnSpace) {
      note.hidden = false;
      note.innerHTML = 'スペースでも区切って ' + names.length + '人 として読んでいます。' +
        '<button type="button" class="sk-mini" id="sk-sep-off">もとに戻す</button>';
      $('sk-sep-off').addEventListener('click', function () {
        splitOnSpace = false;
        updateCount();
      });
      return;
    }
    if (looksCrammed(names)) {
      note.hidden = false;
      note.innerHTML = '名前が1行に詰まっていませんか？ いまは ' + names.length + '人 として読んでいます。' +
        '<button type="button" class="sk-mini" id="sk-sep-on">スペースでも区切る</button>';
      $('sk-sep-on').addEventListener('click', function () {
        splitOnSpace = true;
        updateCount();
      });
      return;
    }
    note.hidden = true;
    note.innerHTML = '';
  }

  function copyText(text, btn) { R.copyText(text, btn); }

  /* ============================================================
     保存はCSVファイルだけ（2026-08-24決定）
     配慮も前回の席もCSVに入るので、ブラウザ保存（localStorage）はやめた。
     ブラウザ保存は端末ごとに分かれて職員室と自宅で共有できないうえ、
     「名簿は一切保存しません」と言い切れなくなるため。
     ============================================================ */

  var prevState = { data: null };   // 前回の席（読みこんだCSVから作る）

  function rosterNote(text, kind) {
    var el = $('sk-roster-note');
    if (!el) return;
    if (!text) { el.hidden = true; el.textContent = ''; el.className = 'sk-roster-note'; return; }
    el.hidden = false;
    el.textContent = text;
    el.className = 'sk-roster-note' + (kind ? ' is-' + kind : '');
  }

  /* ---------- 前回の席 ---------- */

  /** 座席表から「誰がどの席か」「誰と誰が隣か」を引ける形に変換する */
  function applyPrevSeating(grid) {
    if (!grid || !grid.length) { clearPrev(); return; }
    var seatOf = {}, nbOf = {};
    var rows = grid.length, cols = grid[0].length;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var name = grid[r][c];
        if (!name) continue;
        seatOf[name] = r + ',' + c;
        neighborNames(grid, r, c, rows, cols).forEach(function (other) {
          (nbOf[name] = nbOf[name] || {})[other] = true;
        });
      }
    }
    prevState.data = { seatOf: seatOf, nbOf: nbOf };
    $('sk-prev').hidden = false;
    $('sk-prev-lbl').textContent = '読みこんだCSVの席を「前回の席」として使います';
  }

  function clearPrev() {
    prevState.data = null;
    $('sk-prev').hidden = true;
  }

  /* ============================================================
     CSV / Excel からの取り込み
     ============================================================ */

  var csvRows = null, csvRoles = {};   // 列番号 → 'name' | 'rule' | 'seat'

  var ROLE_LABEL = { '': '（使わない）', name: 'なまえ', rule: '配慮', seat: '前回の席' };

  /** 見出しから列の役割を当てる。自分が書き出したCSVはそのまま読み戻せる */
  function autoDetectRoles(head) {
    var roles = {};
    head.forEach(function (raw, c) {
      var h = (raw || '').trim();
      if (!h) return;
      if (/^(出席番号|番号|no\.?|#)$/i.test(h)) return;
      if (/(なまえ|名前|氏名|生徒名|児童名|姓|名|name)/i.test(h)) roles[c] = 'name';
      else if (/(配慮|はいりょ)/i.test(h)) roles[c] = 'rule';
      else if (/(席|座席|seat)/i.test(h)) roles[c] = 'seat';
    });
    return roles;
  }

  function readCsvFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var text = R.decode(reader.result);
      var rows = R.parseDelimited(text, R.detectSep(text));
      if (!rows.length) { rosterNote('このファイルからは名前を読み取れませんでした。', 'error'); return; }
      csvRows = rows;
      csvRoles = $('sk-csv-head').checked ? autoDetectRoles(rows[0]) : {};
      if (!Object.keys(csvRoles).some(function (c) { return csvRoles[c] === 'name'; })) {
        var guess = R.guessNameCol(rows);
        if (guess >= 0) csvRoles[guess] = 'name';
      }
      renderCsvPick();
    };
    reader.onerror = function () { rosterNote('ファイルを読めませんでした。', 'error'); };
    reader.readAsArrayBuffer(file);
  }

  function renderCsvPick() {
    var hasHead = $('sk-csv-head').checked;
    var width = R.colWidth(csvRows);
    var sample = csvRows[hasHead ? 1 : 0] || [];
    var html = '';
    for (var c = 0; c < width; c++) {
      var head = hasHead ? ((csvRows[0][c] || '').trim() || (c + 1) + '列目') : (c + 1) + '列目';
      var val = (sample[c] || '').trim() || '（空）';
      var role = csvRoles[c] || '';
      html += '<div class="sk-csv-col' + (role ? ' is-on' : '') + '">' +
        '<span class="sk-csv-h">' + esc(head) + '</span>' +
        '<span class="sk-csv-v">' + esc(val) + '</span>' +
        '<select class="sk-csv-role-sel" data-col="' + c + '" aria-label="' + esc(head) + 'の役割">' +
        Object.keys(ROLE_LABEL).map(function (k) {
          return '<option value="' + k + '"' + (role === k ? ' selected' : '') + '>' + ROLE_LABEL[k] + '</option>';
        }).join('') +
        '</select></div>';
    }
    $('sk-csv-cols').innerHTML = html;
    $('sk-csv-pick').hidden = false;
    rosterNote('');
  }

  function colsWithRole(role) {
    return Object.keys(csvRoles).filter(function (c) { return csvRoles[c] === role; })
      .map(Number).sort(function (a, b) { return a - b; });
  }

  /** 「2れつ3ばん」「2-3」どちらの書き方でも席として読む */
  function parseSeat(cell) {
    var nums = String(cell || '').match(/\d+/g);
    if (!nums || nums.length < 2) return null;
    return { c: Number(nums[0]) - 1, r: Number(nums[1]) - 1 };
  }

  function applyCsvPick() {
    var nameCols = colsWithRole('name');
    if (!nameCols.length) { rosterNote('「なまえ」の列を1つ以上えらんでください。', 'error'); return; }
    var ruleCol = colsWithRole('rule')[0];
    var seatCol = colsWithRole('seat')[0];

    var body = $('sk-csv-head').checked ? csvRows.slice(1) : csvRows;
    var names = [], ruleCells = [], seatCells = [];
    body.forEach(function (r) {
      var name = nameCols.map(function (c) { return (r[c] || '').trim(); }).filter(Boolean).join(' ').trim();
      if (!name) return;
      names.push(name);
      ruleCells.push(ruleCol === undefined ? '' : (r[ruleCol] || '').trim());
      seatCells.push(seatCol === undefined ? '' : (r[seatCol] || '').trim());
    });

    if (!names.length) { rosterNote('えらんだ列に名前が入っていませんでした。', 'error'); return; }

    $('sk-names').value = names.join('\n');
    splitOnSpace = false;

    // 配慮：同じ「離すN」どうしを1行にまとめ、前列・後列・固定はその場で1行にする
    var apartGroups = {}, lines = [];
    ruleCells.forEach(function (cell, i) {
      String(cell).split(/[;；]+/).forEach(function (t) {
        t = t.trim();
        if (!t) return;
        var m = t.match(/^離す\s*(\d*)$/);
        if (m) { (apartGroups[m[1] || '1'] = apartGroups[m[1] || '1'] || []).push(names[i]); return; }
        if (/^前列$/.test(t)) { lines.push('前列: ' + names[i]); return; }
        if (/^後列$/.test(t)) { lines.push('後列: ' + names[i]); return; }
        var f = t.match(/^固定\s*(.+)$/);
        if (f) {
          var s = parseSeat(f[1]);
          if (s) lines.push('固定: ' + names[i] + ' = ' + (s.c + 1) + 'れつ ' + (s.r + 1) + 'ばん');
        }
      });
    });
    var apartLines = Object.keys(apartGroups).sort().filter(function (k) { return apartGroups[k].length >= 2; })
      .map(function (k) { return '離す: ' + apartGroups[k].join(', '); });
    var ruleText = apartLines.concat(lines).join('\n');
    if (ruleCol !== undefined) $('sk-rules').value = ruleText;

    // 前回の席：席の列から座席表を組み直す
    var maxC = 0, maxR = 0, seats = [];
    seatCells.forEach(function (cell, i) {
      var s = parseSeat(cell);
      if (!s) return;
      seats.push({ name: names[i], r: s.r, c: s.c });
      maxC = Math.max(maxC, s.c); maxR = Math.max(maxR, s.r);
    });
    if (seats.length > 1) {
      var grid = [];
      for (var r = 0; r <= maxR; r++) grid.push(new Array(maxC + 1).fill(null));
      seats.forEach(function (s) { grid[s.r][s.c] = s.name; });
      applyPrevSeating(grid);
      // 席の数も前回に合わせておく
      if (maxC + 1 >= 2 && maxC + 1 <= 10) $('sk-cols').value = String(maxC + 1);
      if (maxR + 1 >= 2 && maxR + 1 <= 10) $('sk-rows').value = String(maxR + 1);
    } else {
      clearPrev();
    }

    closeCsvPick();
    updateCount();
    var got = [names.length + '人'];
    if (ruleText) got.push('配慮');
    if (seats.length > 1) got.push('前回の席');
    rosterNote(got.join('・') + ' を読みこみました。', 'ok');
  }

  function closeCsvPick() {
    $('sk-csv-pick').hidden = true;
    csvRows = null;
    csvRoles = {};
    $('sk-csv').value = '';
  }

  /* ---------- CSVに書き出す ---------- */

  /** Excelで開いても文字化けしないよう BOM を付けて渡す */
  function downloadCsv(filename, rows) {
    var body = rows.map(function (r) {
      return r.map(function (v) {
        var s = String(v == null ? '' : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');

    var blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /** いまの配慮欄を、人ごとのセル（「離す1」「前列」「固定2-3」）に直す */
  function ruleCellsByName(names) {
    var parsed = parseRules($('sk-rules').value, names);
    var cells = {};
    var add = function (n, code) { cells[n] = cells[n] ? cells[n] + ';' + code : code; };
    parsed.rules.apart.forEach(function (g, i) {
      g.forEach(function (n) { add(n, '離す' + (i + 1)); });
    });
    parsed.rules.front.forEach(function (n) { add(n, '前列'); });
    parsed.rules.back.forEach(function (n) { add(n, '後列'); });
    parsed.rules.fixed.forEach(function (f) { add(f.name, '固定' + (f.c + 1) + '-' + (f.r + 1)); });
    return cells;
  }

  function downloadState(withSeats) {
    var names = parseNames($('sk-names').value);
    if (!names.length) { rosterNote('名簿が空です。', 'error'); return; }
    var cells = ruleCellsByName(names);

    var seatOf = {};
    if (withSeats && state.grid) {
      for (var r = 0; r < state.rows; r++) {
        for (var c = 0; c < state.cols; c++) {
          if (state.grid[r][c]) seatOf[state.grid[r][c]] = (c + 1) + 'れつ' + (r + 1) + 'ばん';
        }
      }
    }

    var rows = [['出席番号', 'なまえ', '配慮', '席']];
    names.forEach(function (n, i) {
      rows.push([String(i + 1), n, cells[n] || '', seatOf[n] || '']);
    });
    downloadCsv(withSeats ? '席替え.csv' : '席替え_名簿.csv', rows);
    rosterNote('CSVに保存しました。次回このファイルを「CSVを読む」から取り込めば、' +
      (withSeats ? '名簿・配慮・前回の席' : '名簿と配慮') + 'がそのまま戻ります。', 'ok');
  }

  function downloadTemplate() {
    downloadCsv('席替え_名簿ひな形.csv', [
      ['出席番号', 'なまえ', '配慮', '席'],
      ['1', '佐藤 みゆき', '固定1-1', ''],
      ['2', '鈴木 けんた', '', ''],
      ['3', '高橋 あおい', '前列', ''],
      ['4', '田中 そうた', '離す1', ''],
      ['5', '中村 はると', '離す1', ''],
      ['6', '長谷川 れん', '後列', '']
    ]);
    rosterNote('ひな形をダウンロードしました。配慮は「離す1」のように、同じ番号どうしが1つの組になります。', 'ok');
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
    clearPrev();
    rosterNote('');
    updateCount();
    run();
  });

  /* 前回の席 */
  $('sk-prev-clear').addEventListener('click', clearPrev);

  /* CSV */
  $('sk-csv').addEventListener('change', function () {
    if (this.files && this.files[0]) readCsvFile(this.files[0]);
  });
  $('sk-csv-save').addEventListener('click', function () { downloadState(false); });
  $('sk-csv-template').addEventListener('click', downloadTemplate);
  $('sk-download').addEventListener('click', function () { downloadState(true); });
  $('sk-csv-head').addEventListener('change', function () { if (csvRows) renderCsvPick(); });
  $('sk-csv-cancel').addEventListener('click', closeCsvPick);
  $('sk-csv-ok').addEventListener('click', applyCsvPick);
  // 列ごとに役割をえらぶ（見出しから自動で当たっていることが多い）
  $('sk-csv-cols').addEventListener('change', function (e) {
    if (!e.target.classList.contains('sk-csv-role-sel')) return;
    csvRoles[Number(e.target.getAttribute('data-col'))] = e.target.value;
    renderCsvPick();
  });

  updateCount();
})();
