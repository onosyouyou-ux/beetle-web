/* ============================================================
   sekigae.js — 席替えメーカー（先生向け）
   名簿と配慮から座席表を作る。計算はすべてブラウザ内で完結し、
   名簿はサーバーに送らない（個人情報を預けずに使えることが前提のツール）。

   2026-10-04：名簿と配慮を「1人1行」の表に変更。
   配慮は行ごとにプルダウン（前列・後列・固定・離す・隣）で足し、1人に何個でも付けられる。
   ============================================================ */
(function () {
  'use strict';

  // 名簿まわり（CSV取り込み・名前の読み取り）は班分けメーカーと共有する
  var R = window.BeetleRoster;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sk-list') || !R) return;

  var ATTEMPTS = 4000;   // ランダム再試行の上限
  // 「前列」＝各列の一番前の席、「後列」＝各列の一番後ろの席（2026-10-04 に「前から2列目まで」から変更。
  //  2ばんの席に入っても前列に見えないため。席を足し引きした形でも列ごとに一番前・後ろを取る）
  var START_ROWS = 10;   // 最初に出しておく行の数
  var SEAT_MAX = 10;     // 席の数の上限（縦・横とも）

  var KIND_LABEL = { '': '配慮をえらぶ', front: '前列', back: '後列', fixed: '固定', apart: '離す', next: '隣' };
  var KIND_ORDER = ['', 'front', 'back', 'fixed', 'apart', 'next'];

  var SAMPLE_NAMES = [
    '佐藤 みゆき', '鈴木 けんた', '高橋 あおい', '田中 そうた', '伊藤 ひなた',
    '渡辺 りく', '山本 さくら', '中村 はると', '小林 ゆい', '加藤 だいち',
    '吉田 めい', '山田 かなた', '佐々木 のあ', '山口 いつき', '松本 ひまり',
    '井上 そら', '木村 あかり', '林 ゆうき', '清水 みなと', '山崎 ひなの',
    '森 かいと', '池田 つむぎ', '橋本 りひと', '石川 えま', '前田 あさひ',
    '藤田 ことね', '後藤 はやと', '岡田 みお', '長谷川 れん', '村上 ゆあ'
  ];

  // 見本の配慮：[だれに, 種類, 相手 or 席]
  var SAMPLE_RULES = [
    ['田中 そうた', 'apart', '中村 はると'],
    ['小林 ゆい', 'front'],
    ['長谷川 れん', 'back'],
    ['伊藤 ひなた', 'next', '渡辺 りく'],
    ['佐藤 みゆき', 'fixed', { c: 0, r: 0 }]
  ];

  /* ============================================================
     名簿のデータ：1人1行。配慮は行ごとに持つ
     { id, name, rules: [{ kind, to(相手のid), c, r }] }
     ============================================================ */

  var students = [];
  var nextId = 1;

  /* ============================================================
     座席の形：seatMap[r][c] が true の所だけ席がある（2026-10-04）
     列・行のプルダウンで長方形を作り、点線の席を押して足す／✕で消す
     ============================================================ */

  var seatMap = null;

  function fullMap(rows, cols) {
    var m = [];
    for (var r = 0; r < rows; r++) m.push(new Array(cols).fill(true));
    return m;
  }

  function resetMapFromSelects() {
    seatMap = fullMap(parseInt($('sk-rows').value, 10), parseInt($('sk-cols').value, 10));
  }

  function seatTotal(m) {
    var n = 0;
    m.forEach(function (row) { row.forEach(function (v) { if (v) n++; }); });
    return n;
  }

  function newStudent(name) {
    // extra：CSVで読みこんだ、ほかのメーカーの列（班・クラスなど）。保存のときそのまま書き戻す
    return { id: nextId++, name: name || '', rules: [], extra: {} };
  }

  function addRows(n, names) {
    for (var i = 0; i < n; i++) students.push(newStudent(names ? names[i] : ''));
  }

  function byId(id) {
    for (var i = 0; i < students.length; i++) if (students[i].id === id) return students[i];
    return null;
  }

  /** 画面と座席表に出す名前。空欄は「3番」、同姓同名は2人目以降に（2）を付けて別人にする */
  function displayNames() {
    var seen = {};
    return students.map(function (s, i) {
      var n = R.cleanName(s.name) || (i + 1) + '番';
      seen[n] = (seen[n] || 0) + 1;
      return seen[n] > 1 ? n + '（' + seen[n] + '）' : n;
    });
  }

  /** 表の中身を、席を決める計算で使う形に直す */
  function collect() {
    var names = displayNames();
    var idx = {};
    students.forEach(function (s, i) { idx[s.id] = i; });

    var rules = { apart: [], next: [], front: [], back: [], fixed: [] };
    var errors = [];
    var pairSeen = { apart: {}, next: {} };
    var fixedSeen = {};

    students.forEach(function (s, i) {
      var me = names[i];
      s.rules.forEach(function (rule) {
        var k = rule.kind;
        if (k === 'front' || k === 'back') {
          if (rules[k].indexOf(me) < 0) rules[k].push(me);
        } else if (k === 'fixed') {
          if (fixedSeen[me]) { errors.push('「' + me + '」に固定席が2つ指定されています。'); return; }
          fixedSeen[me] = true;
          rules.fixed.push({ name: me, c: rule.c, r: rule.r });
        } else if (k === 'apart' || k === 'next') {
          if (!rule.to || idx[rule.to] === undefined) {
            errors.push('「' + me + '」の「' + KIND_LABEL[k] + '」の相手をえらんでください。');
            return;
          }
          if (rule.to === s.id) { errors.push('「' + me + '」の「' + KIND_LABEL[k] + '」の相手が本人になっています。'); return; }
          var other = names[idx[rule.to]];
          var key = [me, other].sort().join('\n');
          if (pairSeen[k][key]) return;   // 両方の行に同じ指定があっても1つと数える
          pairSeen[k][key] = true;
          rules[k].push([me, other]);
        }
      });
    });

    rules.front.forEach(function (n) {
      if (rules.back.indexOf(n) >= 0) errors.push('「' + n + '」に前列と後列の両方が指定されています。');
    });
    Object.keys(pairSeen.next).forEach(function (key) {
      if (pairSeen.apart[key]) {
        var p = key.split('\n');
        errors.push('「' + p[0] + '」と「' + p[1] + '」に「離す」と「隣」の両方が指定されています。');
      }
    });
    return { names: names, rules: rules, errors: errors };
  }

  /* ---------- 席を決める ---------- */

  function shuffle(a) { return R.shuffle(a); }

  function zoneOf(name, rules) {
    if (rules.front.indexOf(name) >= 0) return 'front';
    if (rules.back.indexOf(name) >= 0) return 'back';
    return 'any';
  }

  var edges = null;   // いまの席の形での、列ごとの一番前・一番後ろの行

  function columnEdges(map) {
    var front = [], back = [];
    for (var c = 0; c < map[0].length; c++) {
      front[c] = -1; back[c] = -1;
      for (var r = 0; r < map.length; r++) {
        if (!map[r][c]) continue;
        if (front[c] < 0) front[c] = r;
        back[c] = r;
      }
    }
    return { front: front, back: back };
  }

  function seatOk(zone, r, c) {
    if (zone === 'front') return edges.front[c] === r;
    if (zone === 'back') return edges.back[c] === r;
    return true;
  }

  // 「隣」＝前後左右。「前回と同じ隣」もこの4方向で数える
  var NEIGHBOR_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  // 「離す」＝周囲1マス（斜めも含む8方向）に入れない
  var AROUND_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  function pairMap(pairs) {
    var map = {};
    pairs.forEach(function (p) {
      (map[p[0]] = map[p[0]] || {})[p[1]] = true;
      (map[p[1]] = map[p[1]] || {})[p[0]] = true;
    });
    return map;
  }

  // prev は「前回の席」を避けるための任意条件。
  // { seatOf:{name:'r,c'}, nbOf:{name:{other:true}}, avoidSeat:bool, avoidNb:bool }
  function solve(names, map, rules, prev) {
    var rows = map.length, cols = map[0].length;
    edges = columnEdges(map);
    var avoidSeat = !!(prev && prev.avoidSeat && prev.seatOf);
    var avoidNb = !!(prev && prev.avoidNb && prev.nbOf);

    var apartOf = pairMap(rules.apart);
    var nextOf = pairMap(rules.next);

    var fixedOf = {};   // name → {r,c}
    rules.fixed.forEach(function (f) { fixedOf[f.name] = f; });

    var rest = names.filter(function (n) { return !fixedOf[n]; });
    // 席の候補が狭い順（前列・後列 → それ以外）に置くと成功しやすい
    var zoned = rest.filter(function (n) { return zoneOf(n, rules) !== 'any'; });
    var free = rest.filter(function (n) { return zoneOf(n, rules) === 'any'; });

    for (var attempt = 0; attempt < ATTEMPTS; attempt++) {
      var grid = [];
      // 席のない所は '' で埋めておく（null＝空席、'' ＝席なし）
      for (var r = 0; r < rows; r++) { grid.push(map[r].map(function (v) { return v ? null : ''; })); }
      var posOf = {};
      rules.fixed.forEach(function (f) { grid[f.r][f.c] = f.name; posOf[f.name] = [f.r, f.c]; });

      var order = withPartnersNext(shuffle(zoned.slice()).concat(shuffle(free.slice())), nextOf);
      var ok = true;

      for (var i = 0; i < order.length; i++) {
        var name = order[i];
        var zone = zoneOf(name, rules);
        var spots = [];
        for (var rr = 0; rr < rows; rr++) {
          for (var cc = 0; cc < cols; cc++) {
            if (grid[rr][cc] !== null || !seatOk(zone, rr, cc)) continue;
            if (avoidSeat && prev.seatOf[name] === rr + ',' + cc) continue;
            spots.push([rr, cc]);
          }
        }
        shuffle(spots);
        var placed = false;
        for (var s = 0; s < spots.length; s++) {
          var sr = spots[s][0], sc = spots[s][1];
          if (nearApart(grid, sr, sc, name, apartOf, rows, cols)) continue;
          if (!nextFits(grid, sr, sc, name, nextOf, posOf, rules, rows, cols)) continue;
          if (avoidNb && prevNeighbor(grid, sr, sc, name, prev.nbOf, rows, cols)) continue;
          grid[sr][sc] = name;
          posOf[name] = [sr, sc];
          placed = true;
          break;
        }
        if (!placed) { ok = false; break; }
      }
      if (ok && allNextOk(rules.next, posOf)) return grid;
    }
    return null;
  }

  /** 「隣」の相手が並び順のすぐ後ろに来るようにする（離れていると相手の席が埋まりやすい） */
  function withPartnersNext(order, nextOf) {
    var out = [], done = {};
    var visit = function (n) {
      if (done[n]) return;
      done[n] = true;
      out.push(n);
      Object.keys(nextOf[n] || {}).forEach(function (p) {
        if (order.indexOf(p) >= 0) visit(p);
      });
    };
    order.forEach(visit);
    return out;
  }

  function inside(r, c, rows, cols) { return r >= 0 && r < rows && c >= 0 && c < cols; }

  /** その席の前後左右にいる名前を集める */
  function neighborNames(grid, r, c, rows, cols) {
    var out = [];
    for (var i = 0; i < NEIGHBOR_D.length; i++) {
      var nr = r + NEIGHBOR_D[i][0], nc = c + NEIGHBOR_D[i][1];
      if (inside(nr, nc, rows, cols) && grid[nr][nc]) out.push(grid[nr][nc]);
    }
    return out;
  }

  // 周囲1マス（斜めも含む）に「離す」相手がいないか
  function nearApart(grid, r, c, name, apartOf, rows, cols) {
    var mine = apartOf[name];
    if (!mine) return false;
    for (var i = 0; i < AROUND_D.length; i++) {
      var nr = r + AROUND_D[i][0], nc = c + AROUND_D[i][1];
      if (inside(nr, nc, rows, cols) && grid[nr][nc] && mine[grid[nr][nc]]) return true;
    }
    return false;
  }

  /**
   * 「隣」の相手とつじつまが合うか。
   * 相手がもう座っていれば、その前後左右であること。
   * まだなら、この席の前後左右に相手が座れる空席が残っていること。
   */
  function nextFits(grid, r, c, name, nextOf, posOf, rules, rows, cols) {
    var mine = nextOf[name];
    if (!mine) return true;
    return Object.keys(mine).every(function (p) {
      var at = posOf[p];
      if (at) return Math.abs(at[0] - r) + Math.abs(at[1] - c) === 1;
      var zone = zoneOf(p, rules);
      return NEIGHBOR_D.some(function (d) {
        var nr = r + d[0], nc = c + d[1];
        return inside(nr, nc, rows, cols) && grid[nr][nc] === null && seatOk(zone, nr, nc);
      });
    });
  }

  function allNextOk(pairs, posOf) {
    return pairs.every(function (p) {
      var a = posOf[p[0]], b = posOf[p[1]];
      return a && b && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
    });
  }

  // 前後左右の隣が「前回も隣だった相手」になっていないか
  function prevNeighbor(grid, r, c, name, nbOf, rows, cols) {
    var mine = nbOf[name];
    if (!mine) return false;
    return neighborNames(grid, r, c, rows, cols).some(function (other) { return !!mine[other]; });
  }

  /* ---------- 作れない理由を具体的に出す ---------- */

  function diagnose(names, map, rules) {
    var rows = map.length, cols = map[0].length;
    edges = columnEdges(map);
    var total = seatTotal(map);
    var msgs = [];
    if (names.length > total) {
      msgs.push({ text: '席が足りません。', sub: '名簿は' + names.length + '人ですが、席は' + total + '席です。', error: true });
    }
    var seen = {}, fixedOf = {};
    rules.fixed.forEach(function (f) {
      fixedOf[f.name] = f;
      var key = f.r + ',' + f.c;
      if (f.c < 0 || f.c >= cols || f.r < 0 || f.r >= rows) {
        msgs.push({ text: '「' + f.name + '」の固定席が席の外にあります。', sub: '指定は ' + (f.c + 1) + 'れつ ' + (f.r + 1) + 'ばん ですが、席は ' + cols + 'れつ × ' + rows + 'ばん です。', error: true });
      } else if (!map[f.r][f.c]) {
        msgs.push({ text: '「' + f.name + '」の固定席（' + (f.c + 1) + 'れつ ' + (f.r + 1) + 'ばん）は、消した席です。', error: true });
      } else if (seen[key]) {
        msgs.push({ text: '固定席が重なっています。', sub: (f.c + 1) + 'れつ ' + (f.r + 1) + 'ばん に「' + seen[key] + '」と「' + f.name + '」の2人が指定されています。', error: true });
      } else seen[key] = f.name;

      var z = zoneOf(f.name, rules);
      if (z === 'front' && map[f.r] && f.c >= 0 && f.c < cols && !seatOk('front', f.r, f.c)) msgs.push({ text: '「' + f.name + '」は前列指定と固定席が矛盾しています。', error: true });
      if (z === 'back' && map[f.r] && f.c >= 0 && f.c < cols && !seatOk('back', f.r, f.c)) msgs.push({ text: '「' + f.name + '」は後列指定と固定席が矛盾しています。', error: true });
    });

    // 列ごとに一番前・一番後ろが1席ずつ
    var frontSeats = edges.front.filter(function (r) { return r >= 0; }).length;
    var backSeats = frontSeats;
    if (rules.front.length > frontSeats) {
      msgs.push({ text: '前列に入りきりません。', sub: '前列指定が' + rules.front.length + '人いますが、各列の一番前の席は' + frontSeats + '席しかありません。', error: true });
    }
    if (rules.back.length > backSeats) {
      msgs.push({ text: '後列に入りきりません。', sub: '後列指定が' + rules.back.length + '人いますが、各列の一番後ろの席は' + backSeats + '席しかありません。', error: true });
    }

    // 隣：相手は前後左右の4人までしか置けない
    var nextOf = pairMap(rules.next);
    Object.keys(nextOf).forEach(function (n) {
      var cnt = Object.keys(nextOf[n]).length;
      if (cnt > 4) msgs.push({ text: '「' + n + '」の「隣」が多すぎます。', sub: '前後左右には4人までしか座れませんが、' + cnt + '人が指定されています。', error: true });
    });
    rules.next.forEach(function (p) {
      var a = fixedOf[p[0]], b = fixedOf[p[1]];
      if (a && b && Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) {
        msgs.push({ text: '「' + p[0] + '」と「' + p[1] + '」は「隣」ですが、2人とも離れた固定席です。', error: true });
      }
    });
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
    if (!students.length) {
      showEditor();
      showMsgs([{ text: '名簿が空です。', sub: '「＋1人」などで行を足すか、「見本を入れる」を押してください。', error: true }]);
      return;
    }

    var map = seatMap;
    var rows = map.length, cols = map[0].length;
    var got = collect();
    if (got.errors.length) {
      showEditor();
      showMsgs(got.errors.map(function (t) { return { text: t, error: true }; }));
      return;
    }
    var names = got.names;

    var problems = diagnose(names, map, got.rules);
    if (problems.length) {
      showEditor();
      showMsgs(problems);
      return;
    }

    // 「前回とちがう席に」は守れないこともあるので、守れなければ段階的にゆるめる
    var attempts = prevAttempts();
    var grid = null, relaxed = null;
    for (var i = 0; i < attempts.length; i++) {
      grid = solve(names, map, got.rules, attempts[i].prev);
      if (grid) { relaxed = attempts[i].note; break; }
    }

    if (!grid) {
      showEditor();
      showMsgs([{
        text: '配慮を全部守れる並びが見つかりませんでした。',
        sub: '「離す」「隣」の指定が多すぎるか、前列・後列・固定の指定と重なって身動きが取れなくなっている可能性があります。条件を1つ減らすか、席の数を増やして試してください。',
        error: true
      }]);
      return;
    }

    state = { grid: grid, rows: rows, cols: cols, rules: got.rules, total: seatTotal(map) };
    showMsgs(relaxed ? [{ text: relaxed }] : []);
    picked = null;
    render();
    // 下の「配置する／再配置する」から押しても結果が見えるよう、座席欄まで移動する
    $('sk-seat-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 2回目からは「再配置する」。上と下のボタンをそろえる
    ['sk-gen', 'sk-gen2'].forEach(function (id) { $(id).textContent = '再配置する'; });
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
    board.style.setProperty('--cols', cols);   // 印刷では紙の幅に合わせて等分する

    var html = '';
    var used = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var name = grid[r][c];
        if (name === '') { html += '<div class="sk-seat is-hole" aria-hidden="true"></div>'; continue; }
        var at = r + ',' + c;
        if (name) used++;
        var tag = '';
        var cls = 'sk-seat';
        if (picked === at) cls += ' is-picked';
        if (!name) cls += ' is-empty';
        else if (rules.fixed.some(function (f) { return f.name === name; })) { cls += ' is-fixed'; tag = '固定'; }
        else if (rules.front.indexOf(name) >= 0) tag = '前列';
        else if (rules.back.indexOf(name) >= 0) tag = '後列';
        html += '<div class="' + cls + '" draggable="true" tabindex="0" role="button" data-at="' + at + '"' +
          (name ? ' data-name="' + esc(name) + '"' : '') +
          ' aria-label="' + (c + 1) + 'れつ ' + (r + 1) + 'ばん ' + esc(name || 'あき') + '（えらんで入れかえ）">' +
          '<span class="sk-seat-pos">' + (c + 1) + 'れつ ' + (r + 1) + 'ばん</span>' +
          '<span>' + esc(name || 'あき') + '</span>' +
          (tag ? '<span class="sk-seat-tag">' + tag + '</span>' : '') +
          '</div>';
      }
    }
    board.innerHTML = html;
    // 配置のあとは「配置の結果」タブに出す。形は確定扱いにする
    $('sk-tab-result').disabled = false;
    if (!shapeLocked) { shapeLocked = true; renderLayout(); }
    showTab('result');
    $('sk-info').textContent = used + '人 / ' + state.total + '席（あき ' + (state.total - used) + '席）';

    // Excelに貼れるようタブ区切りで出す
    var lines = [['', ].concat(colLabels(cols)).join('\t')];
    for (var rr = 0; rr < rows; rr++) {
      var row = [(rr + 1) + 'ばん'];
      for (var cc = 0; cc < cols; cc++) row.push(grid[rr][cc] || '');
      lines.push(row.join('\t'));
    }
    $('sk-out').value = 'こくばん\n' + lines.join('\n');
    updateRowSeats();
    updateSteps();
  }

  /* ---------- できた席を手で入れかえる ---------- */

  var picked = null;   // タップで1つ目にえらんだ席 "r,c"

  function swapSeats(a, b) {
    if (!a || !b || a === b) return;
    var pa = a.split(',').map(Number), pb = b.split(',').map(Number);
    var g = state.grid;
    var t = g[pa[0]][pa[1]];
    g[pa[0]][pa[1]] = g[pb[0]][pb[1]];
    g[pb[0]][pb[1]] = t;
    picked = null;
    render();
    // 手で動かした結果、配慮から外れたら知らせる（入れかえ自体は止めない）
    var broken = brokenRules(g, state.rules);
    showMsgs(broken.length
      ? [{ text: '入れかえで、守れていない配慮があります。', sub: broken.join('／') }]
      : []);
  }

  function brokenRules(grid, rules) {
    var pos = {}, out = [];
    grid.forEach(function (row, r) { row.forEach(function (n, c) { if (n) pos[n] = [r, c]; }); });
    var rows = grid.length;
    rules.fixed.forEach(function (f) {
      var p = pos[f.name];
      if (p && (p[0] !== f.r || p[1] !== f.c)) out.push(f.name + 'が固定席にいません');
    });
    edges = columnEdges(seatMap);
    rules.front.forEach(function (n) { if (pos[n] && !seatOk('front', pos[n][0], pos[n][1])) out.push(n + 'が前列にいません'); });
    rules.back.forEach(function (n) { if (pos[n] && !seatOk('back', pos[n][0], pos[n][1])) out.push(n + 'が後列にいません'); });
    rules.apart.forEach(function (p) {
      var a = pos[p[0]], b = pos[p[1]];
      if (a && b && Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) <= 1) out.push(p[0] + 'と' + p[1] + 'が近くにいます（離す）');
    });
    rules.next.forEach(function (p) {
      var a = pos[p[0]], b = pos[p[1]];
      if (a && b && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) out.push(p[0] + 'と' + p[1] + 'が隣ではありません');
    });
    return out;
  }

  /** タップ（クリック）で2つえらぶと入れかえる。スマホはドラッグが効かないのでこちらが本命 */
  function pickSeat(at) {
    if (!picked) { picked = at; render(); return; }
    if (picked === at) { picked = null; render(); return; }
    swapSeats(picked, at);
  }

  /**
   * 座席の形を決める画面。いまの席のまわりに点線の席を出し、押すと足せる。
   * 席の ✕ で消すと、そこは点線になって押せば戻せる。
   */
  var shapeLocked = false;   // 「この形で確定する」を押したら点線と ✕ を隠す

  function renderLayout() {
    var m = seatMap;
    var rows = m.length, cols = m[0].length;
    var growR = rows < SEAT_MAX, growC = cols < SEAT_MAX;
    var board = $('sk-layout-board');
    var edge = shapeLocked ? 0 : 1;
    board.style.gridTemplateColumns = 'repeat(' + (cols + edge * 2) + ', auto)';
    board.classList.toggle('is-locked', shapeLocked);
    var html = '';
    for (var r = -edge; r < rows + edge; r++) {
      for (var c = -edge; c < cols + edge; c++) {
        var outR = r < 0 || r >= rows, outC = c < 0 || c >= cols;
        if (shapeLocked) {
          html += m[r][c]
            ? '<div class="sk-seat sk-cell"><span class="sk-seat-pos">' + (c + 1) + 'れつ ' + (r + 1) + 'ばん</span></div>'
            : '<span class="sk-ghost-sp"></span>';
        } else if (outR || outC) {
          var ok = (!outR || growR) && (!outC || growC) && !(outR && outC);
          html += ok
            ? '<button type="button" class="sk-ghost" data-r="' + r + '" data-c="' + c + '" aria-label="ここに席を足す">＋</button>'
            : '<span class="sk-ghost-sp"></span>';
        } else if (m[r][c]) {
          html += '<div class="sk-seat sk-cell"><span class="sk-seat-pos">' + (c + 1) + 'れつ ' + (r + 1) + 'ばん</span>' +
            '<button type="button" class="sk-cell-del" data-r="' + r + '" data-c="' + c + '" aria-label="' + (c + 1) + 'れつ ' + (r + 1) + 'ばんの席を消す">✕</button></div>';
        } else {
          html += '<button type="button" class="sk-ghost is-in" data-r="' + r + '" data-c="' + c + '" aria-label="' + (c + 1) + 'れつ ' + (r + 1) + 'ばんに席を戻す">＋</button>';
        }
      }
    }
    board.innerHTML = html;
    $('sk-confirm').textContent = shapeLocked ? '座席の形を直す' : 'この形で確定する';
    $('sk-confirm').classList.toggle('is-done', shapeLocked);
    updateSteps();
    $('sk-layout-note').textContent = shapeLocked
      ? 'この形で確定しました。下で名簿と配慮を入れて「配置する」を押してください。'
      : 'まわりの点線を押すと席を足せます。席の ✕ で消せます。';
  }

  /**
   * 上の手順バー（1 形 → 2 名簿 → 3 配置 → 4 手直し・印刷）の「いまここ」を合わせる。
   * どこから手をつければいいか迷わないよう、終わった手順に ✓、いまの手順に色を付ける
   */
  function updateSteps() {
    var bar = $('sk-stepbar');
    if (!bar) return;
    var named = students.some(function (s) { return s.name.trim(); });
    var now = state.grid ? 4 : !shapeLocked ? 1 : named ? 3 : 2;
    Array.prototype.forEach.call(bar.children, function (li) {
      var n = Number(li.getAttribute('data-step'));
      li.classList.toggle('is-done', n < now);
      li.classList.toggle('is-on', n === now);
      if (n === now) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }

  /** 座席欄のタブを切り替える（'shape'＝座席の形／'result'＝席替えの結果） */
  function showTab(name) {
    $('sk-seat-area').hidden = false;
    $('sk-layout-wrap').hidden = name !== 'shape';
    $('sk-result').classList.toggle('is-on', name === 'result');
    [['sk-tab-shape', 'shape'], ['sk-tab-result', 'result']].forEach(function (t) {
      var on = t[1] === name;
      $(t[0]).classList.toggle('is-on', on);
      $(t[0]).setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function openShape() {
    renderLayout();
    showTab('shape');
  }

  /** 席の形が変わったら、前の結果はその形に合わないので捨てる */
  function invalidateResult() {
    state.grid = null;
    picked = null;
    $('sk-tab-result').disabled = true;
    $('sk-result').classList.remove('is-on');
    updateRowSeats();
    updateSteps();
    // 結果がない状態に戻るので、ボタンも「配置する」に戻す
    ['sk-gen', 'sk-gen2'].forEach(function (id) { $(id).textContent = '配置する'; });
  }

  /** エラーで座席表を出せないときは、席の形の表示へ戻しておく（欄を空にしない） */
  function showEditor() {
    if (seatMap) openShape();
  }

  function seatAreaShown() {
    return !$('sk-seat-area').hidden;
  }

  /** 点線の席を押したとき。外側なら1列（1行）広げてから席を置く */
  function addSeat(r, c) {
    var m = seatMap;
    if (r < 0) { m.unshift(new Array(m[0].length).fill(false)); r = 0; }
    if (r >= m.length) { m.push(new Array(m[0].length).fill(false)); r = m.length - 1; }
    if (c < 0) { m.forEach(function (row) { row.unshift(false); }); c = 0; }
    if (c >= m[0].length) { m.forEach(function (row) { row.push(false); }); c = m[0].length - 1; }
    m[r][c] = true;
    afterMapEdit();
  }

  /** 席を消す。端の行・列が丸ごと空になったら詰める（1席は残す） */
  function removeSeat(r, c) {
    var m = seatMap;
    if (seatTotal(m) <= 1) return;
    m[r][c] = false;
    var empty = function (row) { return row.every(function (v) { return !v; }); };
    while (m.length > 1 && empty(m[0])) m.shift();
    while (m.length > 1 && empty(m[m.length - 1])) m.pop();
    var colEmpty = function (i) { return m.every(function (row) { return !row[i]; }); };
    while (m[0].length > 1 && colEmpty(0)) m.forEach(function (row) { row.shift(); });
    while (m[0].length > 1 && colEmpty(m[0].length - 1)) m.forEach(function (row) { row.pop(); });
    afterMapEdit();
  }

  function afterMapEdit() {
    $('sk-rows').value = String(seatMap.length);
    $('sk-cols').value = String(seatMap[0].length);
    invalidateResult();
    openShape();
    updateCount();
  }

  function colLabels(cols) {
    var a = [];
    for (var i = 0; i < cols; i++) a.push((i + 1) + 'れつ');
    return a;
  }

  function esc(s) { return R.esc(s); }

  function updateCount() {
    var n = students.length;
    $('sk-count').textContent = n + '人';
    var rows = seatMap.length, cols = seatMap[0].length;
    var seats = seatTotal(seatMap);
    // 見出しの横に「30席」「あき 2席」を、名簿の「30人」と同じ札で出す
    $('sk-seat-count').textContent = seats + '席';
    var free = $('sk-seat-free');
    free.textContent = seats >= n ? 'あき ' + (seats - n) + '席' : (n - seats) + '席たりません';
    free.classList.toggle('is-short', seats < n);
    // 横×縦はプルダウンで見えているので、席を消したときだけ添える
    $('sk-seats').textContent = seats < rows * cols ? '（' + (rows * cols - seats) + '席消し）' : '';
  }

  function copyText(text, btn) { R.copyText(text, btn); }

  /* ============================================================
     名簿の表（1人1行）
     ============================================================ */

  function options(list, current) {
    return list.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(current) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
  }

  function numOptions(unit, current) {
    var list = [];
    for (var i = 0; i < SEAT_MAX; i++) list.push([i, (i + 1) + unit]);
    return options(list, current);
  }

  /** 相手のプルダウン：自分以外の全員 */
  function partnerOptions(self, current, names) {
    var list = [['', 'だれと？']];
    students.forEach(function (s, i) {
      if (s.id !== self.id) list.push([s.id, (i + 1) + '　' + names[i]]);
    });
    return options(list, current || '');
  }

  function ruleHtml(s, rule, ri, names) {
    var k = rule.kind;
    var html = '<span class="sk-rule' + (k ? ' is-' + k : '') + '" data-ri="' + ri + '">' +
      '<select class="sk-kind" aria-label="配慮の種類">' +
      options(KIND_ORDER.map(function (x) { return [x, KIND_LABEL[x]]; }), k) + '</select>';
    if (k === 'apart' || k === 'next') {
      html += '<select class="sk-to" aria-label="' + KIND_LABEL[k] + 'の相手">' + partnerOptions(s, rule.to, names) + '</select>';
    } else if (k === 'fixed') {
      html += '<select class="sk-fc" aria-label="固定する列">' + numOptions('れつ', rule.c) + '</select>' +
        '<select class="sk-fr" aria-label="固定する番">' + numOptions('ばん', rule.r) + '</select>';
    }
    html += '<button type="button" class="sk-rule-del" aria-label="この配慮を消す">×</button></span>';
    return html;
  }

  function renderList() {
    var names = displayNames();
    $('sk-list').innerHTML = students.map(function (s, i) {
      return '<div class="sk-row" data-id="' + s.id + '">' +
        '<span class="sk-no">' + (i + 1) + '</span>' +
        '<input type="text" class="sk-name" value="' + esc(s.name) + '" placeholder="' + (i + 1) + '番" aria-label="' + (i + 1) + '人目のなまえ" spellcheck="false">' +
        '<div class="sk-rules">' +
        s.rules.map(function (rule, ri) { return ruleHtml(s, rule, ri, names); }).join('') +
        '<button type="button" class="sk-rule-add">＋ 配慮</button>' +
        '</div>' +
        '<span class="sk-row-seat"></span>' +
        '<button type="button" class="sk-row-del" aria-label="' + (i + 1) + '人目を消す">✕</button>' +
        '</div>';
    }).join('');
    updateCount();
    updateRowSeats();
    updateSteps();
  }

  /** 席替えの結果があれば、名簿の各行にその子の席（「3れつ 2ばん」）を出す。座席表が画面の外でも分かるように */
  function updateRowSeats() {
    var at = {};
    if (state.grid) {
      state.grid.forEach(function (row, r) {
        row.forEach(function (n, c) { if (n) at[n] = (c + 1) + 'れつ ' + (r + 1) + 'ばん'; });
      });
    }
    var names = displayNames();
    Array.prototype.forEach.call(document.querySelectorAll('#sk-list .sk-row-seat'), function (el, i) {
      el.textContent = at[names[i]] || '';
    });
  }

  /** 名前を打っている途中は表を描き直さず、相手のプルダウンの表示だけ差し替える（入力欄のフォーカスを守る） */
  function refreshPartnerLabels() {
    var names = displayNames();
    var label = {};
    students.forEach(function (s, i) { label[s.id] = (i + 1) + '　' + names[i]; });
    Array.prototype.forEach.call(document.querySelectorAll('#sk-list .sk-to option'), function (o) {
      if (o.value && label[o.value]) o.textContent = label[o.value];
    });
  }

  function rowOf(el) {
    var row = el.closest('.sk-row');
    return row ? byId(Number(row.getAttribute('data-id'))) : null;
  }

  function ruleOf(el, s) {
    var box = el.closest('.sk-rule');
    return box ? s.rules[Number(box.getAttribute('data-ri'))] : null;
  }

  function addAndFocus(n) {
    var first = students.length;
    addRows(n);
    renderList();
    var inputs = document.querySelectorAll('#sk-list .sk-name');
    if (inputs[first]) inputs[first].focus();
  }

  function removeStudent(s) {
    students = students.filter(function (x) { return x.id !== s.id; });
    // その人を相手にしていた「離す」「隣」も消す
    students.forEach(function (x) {
      x.rules = x.rules.filter(function (rule) { return rule.to !== s.id; });
    });
    renderList();
  }

  /** Excelから縦に何人ぶんか貼られたら、その行から下へ1人ずつ流し込む */
  function pasteNames(s, text) {
    var list = String(text).split(/\r?\n|\t/).map(R.cleanName).filter(Boolean);
    if (list.length < 2) return false;
    var at = students.indexOf(s);
    list.forEach(function (name, i) {
      if (!students[at + i]) students.push(newStudent(''));
      students[at + i].name = name;
    });
    renderList();
    rosterNote(list.length + '人ぶん貼り付けました。', 'ok');
    return true;
  }

  /** 名前と「名前で書いた配慮」から表を作り直す（見本・CSV読みこみ用） */
  function loadRoster(names, ruleList) {
    nextId = 1;
    students = names.map(function (n) { return newStudent(n); });
    var find = function (name) {
      for (var i = 0; i < students.length; i++) if (students[i].name === name) return students[i];
      return null;
    };
    (ruleList || []).forEach(function (x) {
      var s = find(x[0]);
      if (!s) return;
      if (x[1] === 'apart' || x[1] === 'next') {
        var t = find(x[2]);
        if (t && t !== s) s.rules.push({ kind: x[1], to: t.id });
      } else if (x[1] === 'fixed') {
        s.rules.push({ kind: 'fixed', c: x[2].c, r: x[2].r });
      } else {
        s.rules.push({ kind: x[1] });
      }
    });
    renderList();
  }

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

  var ROLE_LABEL = { '': '（使わない）', name: 'なまえ', rule: '配慮', seat: '前回の席', shape: '座席の形' };

  /*
   * 座席の形をCSVの1セルに入れる書き方。行を「/」で区切り、席あり＝o・席なし＝x。
   * 例：「oooooo/ooxooo」。数字や「-」で始めるとExcelが日付や式に変えてしまうので文字にする
   */
  function encodeShape(m) {
    return m.map(function (row) { return row.map(function (v) { return v ? 'o' : 'x'; }).join(''); }).join('/');
  }

  function decodeShape(text) {
    var rows = String(text || '').trim().split('/');
    if (!rows.length || rows.length > SEAT_MAX) return null;
    var width = rows[0].length;
    if (!width || width > SEAT_MAX) return null;
    var ok = rows.every(function (r) { return r.length === width && /^[ox]+$/i.test(r); });
    if (!ok) return null;
    var m = rows.map(function (r) { return r.split('').map(function (ch) { return ch.toLowerCase() === 'o'; }); });
    return seatTotal(m) ? m : null;
  }

  /** 見出しから列の役割を当てる。自分が書き出したCSVはそのまま読み戻せる */
  function autoDetectRoles(head) {
    var roles = {};
    head.forEach(function (raw, c) {
      var h = (raw || '').trim();
      if (!h) return;
      if (/^(出席番号|番号|no\.?|#)$/i.test(h)) return;
      // 共通CSVの、ほかのメーカーの列は読まない（保存のときそのまま残す）
      var rr = R.ruleColumnRole(h, '席の配慮', head);
      if (rr === 'rule') { roles[c] = 'rule'; return; }
      if (rr === 'skip' || /^(性別|班|前のクラス|新しいクラス)$/.test(h)) return;
      if (/(なまえ|名前|氏名|生徒名|児童名|姓|名|name)/i.test(h)) roles[c] = 'name';
      else if (/(座席の形|shape)/i.test(h)) roles[c] = 'shape';
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
    var shapeCol = colsWithRole('shape')[0];

    var body = $('sk-csv-head').checked ? csvRows.slice(1) : csvRows;
    var names = [], ruleCells = [], seatCells = [], extras = [], shape = null;
    var head = $('sk-csv-head').checked ? csvRows[0] : [];
    var used = Object.keys(csvRoles).filter(function (c) { return csvRoles[c]; }).map(Number);
    body.forEach(function (r) {
      var name = nameCols.map(function (c) { return (r[c] || '').trim(); }).filter(Boolean).join(' ').trim();
      if (!name) return;
      names.push(R.cleanName(name));
      ruleCells.push(ruleCol === undefined ? '' : (r[ruleCol] || '').trim());
      seatCells.push(seatCol === undefined ? '' : (r[seatCol] || '').trim());
      if (!shape && shapeCol !== undefined) shape = decodeShape(r[shapeCol]);
      extras.push(R.keepExtras(head, r, used));
    });

    if (!names.length) { rosterNote('えらんだ列に名前が入っていませんでした。', 'error'); return; }

    // 配慮：同じ「離すN」「隣N」どうしが1つの組。前列・後列・固定はその人だけ
    var groups = { apart: {}, next: {} }, ruleList = [];
    ruleCells.forEach(function (cell, i) {
      String(cell).split(/[;；]+/).forEach(function (t) {
        t = t.trim();
        if (!t) return;
        var m = t.match(/^(離す|隣)\s*(\d*)$/);
        if (m) {
          var g = groups[m[1] === '隣' ? 'next' : 'apart'];
          (g[m[2] || '1'] = g[m[2] || '1'] || []).push(names[i]);
          return;
        }
        if (/^前列$/.test(t)) { ruleList.push([names[i], 'front']); return; }
        if (/^後列$/.test(t)) { ruleList.push([names[i], 'back']); return; }
        var f = t.match(/^固定\s*(.+)$/);
        if (f) {
          var s = parseSeat(f[1]);
          if (s) ruleList.push([names[i], 'fixed', s]);
        }
      });
    });
    ['apart', 'next'].forEach(function (kind) {
      Object.keys(groups[kind]).forEach(function (k) {
        var g = groups[kind][k];
        for (var a = 0; a < g.length; a++) {
          for (var b = a + 1; b < g.length; b++) ruleList.push([g[a], kind, g[b]]);
        }
      });
    });
    loadRoster(names, ruleCol === undefined ? [] : ruleList);
    students.forEach(function (s, i) { s.extra = extras[i] || {}; });

    // 前回の席：席の列から座席表を組み直す
    var maxC = 0, maxR = 0, seats = [];
    var shown = displayNames();
    seatCells.forEach(function (cell, i) {
      var s = parseSeat(cell);
      if (!s) return;
      seats.push({ name: shown[i], r: s.r, c: s.c });
      maxC = Math.max(maxC, s.c); maxR = Math.max(maxR, s.r);
    });
    if (seats.length > 1) {
      var grid = [];
      for (var r = 0; r <= maxR; r++) grid.push(new Array(maxC + 1).fill(null));
      seats.forEach(function (s) { grid[s.r][s.c] = s.name; });
      applyPrevSeating(grid);
    } else {
      clearPrev();
    }

    // 席の形：保存してあればそのまま戻す。なければ前回の席から縦横だけ合わせる（以前のCSV）
    if (shape) {
      seatMap = shape;
      $('sk-rows').value = String(shape.length);
      $('sk-cols').value = String(shape[0].length);
      shapeLocked = true;
    } else if (seats.length > 1) {
      if (maxC + 1 >= 2 && maxC + 1 <= SEAT_MAX) $('sk-cols').value = String(maxC + 1);
      if (maxR + 1 >= 2 && maxR + 1 <= SEAT_MAX) $('sk-rows').value = String(maxR + 1);
      resetMapFromSelects();
      shapeLocked = false;
    }
    // 名簿が入れかわったので、前の結果は使わない
    invalidateResult();
    openShape();

    closeCsvPick();
    updateCount();
    var got = [names.length + '人'];
    if (ruleList.length && ruleCol !== undefined) got.push('配慮');
    if (seats.length > 1) got.push('前回の席');
    if (shape) got.push('座席の形');
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

  /** いまの配慮を、人ごとのセル（「離す1」「隣2」「前列」「固定2-3」）に直す。組は2人ずつ番号を振る */
  function ruleCellsByName(rules) {
    var cells = {};
    var add = function (n, code) { cells[n] = cells[n] ? cells[n] + ';' + code : code; };
    rules.apart.forEach(function (p, i) { add(p[0], '離す' + (i + 1)); add(p[1], '離す' + (i + 1)); });
    rules.next.forEach(function (p, i) { add(p[0], '隣' + (i + 1)); add(p[1], '隣' + (i + 1)); });
    rules.front.forEach(function (n) { add(n, '前列'); });
    rules.back.forEach(function (n) { add(n, '後列'); });
    rules.fixed.forEach(function (f) { add(f.name, '固定' + (f.c + 1) + '-' + (f.r + 1)); });
    return cells;
  }

  function downloadState(withSeats) {
    if (!students.length) { rosterNote('名簿が空です。', 'error'); return; }
    var got = collect();
    var cells = ruleCellsByName(got.rules);

    var seatOf = {};
    if (withSeats && state.grid) {
      for (var r = 0; r < state.rows; r++) {
        for (var c = 0; c < state.cols; c++) {
          if (state.grid[r][c]) seatOf[state.grid[r][c]] = (c + 1) + 'れつ' + (r + 1) + 'ばん';
        }
      }
    }

    // 班分け・クラス分けと共通の形で書き出す。読みこんだほかのメーカーの列もそのまま残す
    var rows = R.sharedRows(got.names.map(function (n, i) {
      return {
        values: {
          'なまえ': n, '席の配慮': cells[n] || '', '席': seatOf[n] || '',
          '座席の形': i === 0 ? encodeShape(seatMap) : ''   // 座席の形は1行目にだけ入れる
        },
        extra: students[i].extra
      };
    }));
    downloadCsv(withSeats ? '席替え.csv' : '席替え_名簿.csv', rows);
    rosterNote('CSVに保存しました。次回このファイルを「CSVを読む」から取り込めば、' +
      (withSeats ? '名簿・配慮・座席の形・前回の席' : '名簿・配慮・座席の形') + 'がそのまま戻ります。', 'ok');
  }

  function downloadTemplate() {
    var sample = [
      ['佐藤 みゆき', '女', '固定1-1'], ['鈴木 けんた', '男', '隣1'], ['高橋 あおい', '女', '前列;隣1'],
      ['田中 そうた', '男', '離す1'], ['中村 はると', '男', '離す1'], ['長谷川 れん', '男', '後列']
    ];
    downloadCsv('名簿ひな形.csv', R.sharedRows(sample.map(function (x) {
      return { values: { 'なまえ': x[0], '性別': x[1], '席の配慮': x[2] } };
    })));
    rosterNote('ひな形をダウンロードしました。配慮は「離す1」「隣1」のように、同じ番号どうしが1つの組になります。「;」で区切ると1人に何個でも付けられます。', 'ok');
  }

  /* ---------- 配線 ---------- */

  (function fillSelects() {
    var c = $('sk-cols'), r = $('sk-rows');
    for (var i = 1; i <= SEAT_MAX; i++) {
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

  var list = $('sk-list');

  /* 名簿の名前を押す（名前欄に入る）と、座席表のその子の席を光らせる。マウスを乗せただけでは光らせない（うるさいため） */
  var hlName = null;
  function highlightSeat(name) {
    hlName = name;
    Array.prototype.forEach.call(document.querySelectorAll('#sk-board .is-hl'), function (x) { x.classList.remove('is-hl'); });
    if (!name) return;
    Array.prototype.forEach.call(document.querySelectorAll('#sk-board .sk-seat[data-name]'), function (x) {
      if (x.getAttribute('data-name') === name) x.classList.add('is-hl');
    });
  }
  function nameOfRow(el) {
    var row = el.closest && el.closest('.sk-row');
    if (!row) return null;
    var i = Array.prototype.indexOf.call(list.children, row);
    return i >= 0 ? displayNames()[i] : null;
  }
  list.addEventListener('focusin', function (e) { highlightSeat(nameOfRow(e.target)); });
  list.addEventListener('focusout', function (e) {
    if (!list.contains(e.relatedTarget)) highlightSeat(null);
  });

  list.addEventListener('input', function (e) {
    if (!e.target.classList.contains('sk-name')) return;
    var s = rowOf(e.target);
    if (!s) return;
    s.name = e.target.value;
    refreshPartnerLabels();
    updateSteps();
  });

  list.addEventListener('paste', function (e) {
    if (!e.target.classList.contains('sk-name')) return;
    var s = rowOf(e.target);
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (s && pasteNames(s, text)) e.preventDefault();
  });

  // Enter で次の行へ（最後の行なら1行足す）
  list.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.isComposing || !e.target.classList.contains('sk-name')) return;
    e.preventDefault();
    var inputs = Array.prototype.slice.call(list.querySelectorAll('.sk-name'));
    var at = inputs.indexOf(e.target);
    if (at === inputs.length - 1) addAndFocus(1);
    else inputs[at + 1].focus();
  });

  list.addEventListener('change', function (e) {
    var t = e.target;
    var s = rowOf(t);
    if (!s) return;
    var rule = ruleOf(t, s);
    if (!rule) return;
    if (t.classList.contains('sk-kind')) {
      rule.kind = t.value;
      delete rule.to; delete rule.c; delete rule.r;
      if (rule.kind === 'fixed') { rule.c = 0; rule.r = 0; }
      renderList();
      // 相手や席をすぐ選べるように、出てきたプルダウンへ移る
      var box = list.querySelector('.sk-row[data-id="' + s.id + '"] .sk-rule[data-ri="' + s.rules.indexOf(rule) + '"]');
      var nextSel = box && box.querySelector('.sk-to, .sk-fc');
      (nextSel || (box && box.querySelector('.sk-kind')) || document.body).focus();
    } else if (t.classList.contains('sk-to')) {
      rule.to = t.value ? Number(t.value) : null;
    } else if (t.classList.contains('sk-fc')) {
      rule.c = Number(t.value);
    } else if (t.classList.contains('sk-fr')) {
      rule.r = Number(t.value);
    }
  });

  list.addEventListener('click', function (e) {
    var t = e.target;
    var s = rowOf(t);
    if (!s) return;
    if (t.classList.contains('sk-rule-add')) {
      s.rules.push({ kind: '' });
      renderList();
      var boxes = list.querySelectorAll('.sk-row[data-id="' + s.id + '"] .sk-kind');
      if (boxes.length) boxes[boxes.length - 1].focus();
    } else if (t.classList.contains('sk-rule-del')) {
      var rule = ruleOf(t, s);
      s.rules = s.rules.filter(function (x) { return x !== rule; });
      renderList();
    } else if (t.classList.contains('sk-row-del')) {
      // 名前か配慮が入っている行だけ確かめる（空の行はそのまま消す）
      var label = R.cleanName(s.name) || ((students.indexOf(s) + 1) + '番');
      if ((s.name.trim() || s.rules.length) &&
          !window.confirm('「' + label + '」の行を消します。付けた配慮も消えます。よろしいですか？')) return;
      removeStudent(s);
    }
  });

  $('sk-add1').addEventListener('click', function () { addAndFocus(1); });
  $('sk-add5').addEventListener('click', function () { addAndFocus(5); });
  $('sk-add10').addEventListener('click', function () { addAndFocus(10); });

  // 列・行を変えたら、空の座席表を出していればそれも作り直す
  // （プルダウンで選び直すと、足した席・消した席はリセットして長方形に戻す）
  var onSizeChange = function () {
    resetMapFromSelects();
    shapeLocked = false;
    invalidateResult();
    updateCount();
    if (seatAreaShown()) openShape();
  };
  $('sk-layout-board').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    var r = Number(t.getAttribute('data-r')), c = Number(t.getAttribute('data-c'));
    if (t.classList.contains('sk-ghost')) addSeat(r, c);
    else if (t.classList.contains('sk-cell-del')) removeSeat(r, c);
  });
  $('sk-cols').addEventListener('change', onSizeChange);
  $('sk-rows').addEventListener('change', onSizeChange);
  $('sk-tab-shape').addEventListener('click', function () { showTab('shape'); });
  $('sk-tab-result').addEventListener('click', function () { if (state.grid) showTab('result'); });
  $('sk-confirm').addEventListener('click', function () {
    shapeLocked = !shapeLocked;
    renderLayout();
    // 確定したら、次にやること（名簿と配慮）へ送る
    if (shapeLocked) {
      var next = document.querySelector('.sk-panel > .sk-lbl-row');
      if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  $('sk-gen').addEventListener('click', run);
  $('sk-gen2').addEventListener('click', run);

  /* できた席の入れかえ：ドラッグ＆ドロップ、またはタップで2つえらぶ */
  var board = $('sk-board');
  var seatAt = function (el) {
    var seat = el && el.closest && el.closest('.sk-seat[data-at]');
    return seat ? seat.getAttribute('data-at') : null;
  };
  board.addEventListener('click', function (e) {
    var at = seatAt(e.target);
    if (at) pickSeat(at);
  });
  board.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var at = seatAt(e.target);
    if (!at) return;
    e.preventDefault();
    pickSeat(at);
    var again = board.querySelector('.sk-seat[data-at="' + at + '"]');
    if (again) again.focus();
  });
  var dragFrom = null;
  board.addEventListener('dragstart', function (e) {
    dragFrom = seatAt(e.target);
    if (!dragFrom) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragFrom);
    e.target.classList.add('is-dragging');
  });
  board.addEventListener('dragover', function (e) {
    if (!dragFrom || !seatAt(e.target)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    Array.prototype.forEach.call(board.querySelectorAll('.is-over'), function (x) { x.classList.remove('is-over'); });
    e.target.closest('.sk-seat').classList.add('is-over');
  });
  board.addEventListener('dragleave', function (e) {
    var seat = e.target.closest && e.target.closest('.sk-seat');
    if (seat && !seat.contains(e.relatedTarget)) seat.classList.remove('is-over');
  });
  board.addEventListener('drop', function (e) {
    var to = seatAt(e.target);
    if (!dragFrom || !to) return;
    e.preventDefault();
    var from = dragFrom;
    dragFrom = null;
    swapSeats(from, to);
  });
  board.addEventListener('dragend', function () {
    dragFrom = null;
    Array.prototype.forEach.call(board.querySelectorAll('.is-over,.is-dragging'), function (x) { x.classList.remove('is-over', 'is-dragging'); });
  });
  $('sk-again').addEventListener('click', run);
  $('sk-copy').addEventListener('click', function () { copyText($('sk-out').value, this); });
  $('sk-print').addEventListener('click', function () { window.print(); });
  // ブラウザのメニューから印刷しても、結果があれば座席表を出す（形のタブを開いたままだと白紙になっていた）
  window.addEventListener('beforeprint', function () {
    if (state.grid && !$('sk-result').classList.contains('is-on')) showTab('result');
  });
  $('sk-sample').addEventListener('click', function () {
    // 名簿に何か入っていたら、見本で上書きしてよいか確かめる
    var filled = students.some(function (s) { return s.name.trim() || s.rules.length; });
    if (filled && !window.confirm('いま入っている名簿と配慮を、見本に入れかえます。よろしいですか？')) return;
    loadRoster(SAMPLE_NAMES, SAMPLE_RULES);
    // 見本は30人ぶん。いまの座席で足りるなら形はそのまま（足した席・消した席を残す）。
    // 足りないときだけ既定の6×5に戻す
    if (seatTotal(seatMap) < SAMPLE_NAMES.length) {
      $('sk-cols').value = '6';
      $('sk-rows').value = '5';
      onSizeChange();
    }
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

  resetMapFromSelects();
  // 座席欄は最初から出しておく（横・縦を選べばその場で形が変わる）
  openShape();
  addRows(START_ROWS);
  renderList();
})();
