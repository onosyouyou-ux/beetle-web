/* ============================================================
   kurasuwake.js — クラス分けメーカー（先生向け・2026-10-05 新規）
   学年の名簿（200人くらいまで）を、クラスの数に分ける。
   各クラスで「男女の人数」「前のクラスの子の人数」「点数の平均」「支援の子の人数」「リーダーの人数」が
   なるべく同じになるように分ける。計算はすべてブラウザ内で完結し、名簿はサーバーに送らない。

   班分けメーカー（hanwake.js）と同じ型：手順バー／1人1行の名簿／結果のドラッグ・タップ入れかえ／
   掲示用の印刷（名前だけ）／共通CSV（js/class-roster.js）。
   解き方は班分けと違い「入れかえの山登り」：クラスの人数を先に均等に決め、
   ちがうクラスの2人を入れかえて、そろい具合（ずれの2乗の合計）がよくなるときだけ採用する。
   ============================================================ */
(function () {
  'use strict';

  var R = window.BeetleRoster;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('kw-list') || !R) return;

  var START_ROWS = 10;
  var CLASS_MAX = 8;
  var RESTARTS = 6;          // 初めの並びを変えて何回解くか
  var STEPS_PER_PERSON = 400; // 1回あたりの入れかえの試行（人数に比例）

  // そろえるものの重み。支援の子は1人の差でも大きいので重め
  var W = { gender: 1, prev: 1, support: 2, leader: 1.5, score: 1 };

  /* ============================================================
     名簿のデータ：1人1行
     { id, name, gender:'女'|'男'|'', prev:'1組', score:'72', support:bool, leader:bool, extra:{} }
     ============================================================ */

  var students = [];
  var nextId = 1;
  var state = { classes: null };   // 結果：classes[c] = [生徒のid…]

  function newStudent(p) {
    p = p || {};
    return {
      id: nextId++, name: p.name || '', gender: p.gender || '', prev: p.prev || '', score: p.score == null ? '' : String(p.score),
      support: !!p.support, leader: !!p.leader, extra: p.extra || {}
    };
  }

  function addRows(n) { for (var i = 0; i < n; i++) students.push(newStudent()); }

  function byId(id) {
    for (var i = 0; i < students.length; i++) if (students[i].id === id) return students[i];
    return null;
  }

  /** 画面と結果に出す名前。空欄は「3番」、同姓同名は2人目以降に（2）を付ける */
  function displayNames() {
    var seen = {};
    return students.map(function (s, i) {
      var n = R.cleanName(s.name) || (i + 1) + '番';
      seen[n] = (seen[n] || 0) + 1;
      return seen[n] > 1 ? n + '（' + seen[n] + '）' : n;
    });
  }

  function nameOf(id) {
    var i = students.findIndex(function (s) { return s.id === id; });
    return i < 0 ? '' : displayNames()[i];
  }

  function normGender(v) {
    v = String(v || '').trim();
    if (/^(女|女子|おんな|f|female|girl)$/i.test(v)) return '女';
    if (/^(男|男子|おとこ|m|male|boy)$/i.test(v)) return '男';
    return '';
  }

  function scoreOf(s) {
    var v = String(s.score || '').replace(/[０-９．]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).trim();
    if (!/^-?\d+(\.\d+)?$/.test(v)) return null;
    return Number(v);
  }

  function className(c) { return (c + 1) + '組'; }

  function classCount() { return parseInt($('kw-num').value, 10) || 0; }
  var TOTAL_MAX = 200;   // 生徒数の上限
  function classTotal() {
    var n = parseInt($('kw-total').value, 10) || 0;
    return n > 0 ? Math.min(n, TOTAL_MAX) : 0;
  }

  /** 人数をクラスに振り分ける（141人4クラスなら 36,35,35,35） */
  function classSizes(total, count) {
    var base = Math.floor(total / count), rem = total % count, sizes = [];
    for (var i = 0; i < count; i++) sizes.push(base + (i < rem ? 1 : 0));
    return sizes;
  }

  /* ============================================================
     クラスを決める
     ============================================================ */

  /**
   * そろえるものごとに「生徒 → 値」を作る。名簿に入っていない項目や、チェックを外した項目は使わない
   * cats: [{ key, w, of: [値の番号 or -1], kinds }]、score: { of: [点数（z値）], use }
   */
  function buildModel(list) {
    var cats = [];
    var add = function (key, values) {
      var kinds = [], of = values.map(function (v) {
        if (v === '' || v == null) return -1;
        var k = kinds.indexOf(v);
        if (k < 0) { kinds.push(v); k = kinds.length - 1; }
        return k;
      });
      if (kinds.length) cats.push({ key: key, w: W[key], of: of, kinds: kinds });
    };
    if ($('kw-bal-gender').checked) add('gender', list.map(function (s) { return s.gender; }));
    if ($('kw-bal-prev').checked) {
      var prevs = list.map(function (s) { return String(s.prev || '').trim(); });
      // 前のクラスが1種類しかなければ、ばらす意味がない
      if (prevs.filter(function (v, i, a) { return v && a.indexOf(v) === i; }).length >= 2) add('prev', prevs);
    }
    if ($('kw-bal-support').checked && list.some(function (s) { return s.support; })) {
      add('support', list.map(function (s) { return s.support ? '支援' : ''; }));
    }
    if ($('kw-bal-leader').checked && list.some(function (s) { return s.leader; })) {
      add('leader', list.map(function (s) { return s.leader ? 'リーダー' : ''; }));
    }
    var score = null;
    if ($('kw-bal-score').checked) {
      var raw = list.map(scoreOf);
      var nums = raw.filter(function (v) { return v !== null; });
      if (nums.length >= 2) {
        var mean = nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
        var sd = Math.sqrt(nums.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / nums.length) || 1;
        // 点数のない子は平均点として扱う（どのクラスに入っても平均を動かさない）
        score = { z: raw.map(function (v) { return v === null ? 0 : (v - mean) / sd; }), mean: mean, sd: sd };
      }
    }
    return { cats: cats, score: score };
  }

  /**
   * 入れかえの山登り。assign[i] = クラスの番号。
   * コスト ＝ Σ そろえるもの Σ クラス Σ 値 (人数 − 理想)² × 重み ＋ Σ クラス (点数zの合計 − 理想)² × 重み
   * 理想はクラスの人数に比例（35人と36人のクラスで、少しだけ違う）
   */
  function solve(list, count, model) {
    var n = list.length, sizes = classSizes(n, count);
    var cats = model.cats, score = model.score;

    var ideal = cats.map(function (cat) {
      var tot = cat.kinds.map(function () { return 0; });
      cat.of.forEach(function (k) { if (k >= 0) tot[k]++; });
      return sizes.map(function (sz) { return tot.map(function (t) { return t * sz / n; }); });
    });
    // 点数zの合計は全体で0なので、どのクラスも理想は0

    var best = null, bestCost = Infinity;
    for (var rs = 0; rs < RESTARTS; rs++) {
      // 初めの並び：ランダムに並べて、人数どおりに区切る
      var order = R.shuffle(list.map(function (s, i) { return i; }));
      var assign = new Array(n), at = 0;
      sizes.forEach(function (sz, c) { for (var k = 0; k < sz; k++) assign[order[at++]] = c; });

      var cnt = cats.map(function (cat) {
        var m = sizes.map(function () { return cat.kinds.map(function () { return 0; }); });
        cat.of.forEach(function (k, i) { if (k >= 0) m[assign[i]][k]++; });
        return m;
      });
      var zsum = sizes.map(function () { return 0; });
      if (score) score.z.forEach(function (z, i) { zsum[assign[i]] += z; });

      var cost = 0;
      cats.forEach(function (cat, ci) {
        cnt[ci].forEach(function (row, c) { row.forEach(function (v, k) { var d = v - ideal[ci][c][k]; cost += cat.w * d * d; }); });
      });
      if (score) zsum.forEach(function (z) { cost += W.score * z * z; });

      var steps = Math.max(4000, n * STEPS_PER_PERSON);
      for (var t = 0; t < steps; t++) {
        var i = Math.floor(Math.random() * n), j = Math.floor(Math.random() * n);
        var a = assign[i], b = assign[j];
        if (a === b) continue;
        var delta = 0;
        for (var ci = 0; ci < cats.length; ci++) {
          var ki = cats[ci].of[i], kj = cats[ci].of[j];
          if (ki === kj) continue;
          var w = cats[ci].w, ma = cnt[ci][a], mb = cnt[ci][b], ia = ideal[ci][a], ib = ideal[ci][b];
          // a から i が出て j が入る。b はその逆
          if (ki >= 0) { delta += w * (sq(ma[ki] - 1 - ia[ki]) - sq(ma[ki] - ia[ki])) + w * (sq(mb[ki] + 1 - ib[ki]) - sq(mb[ki] - ib[ki])); }
          if (kj >= 0) { delta += w * (sq(ma[kj] + 1 - ia[kj]) - sq(ma[kj] - ia[kj])) + w * (sq(mb[kj] - 1 - ib[kj]) - sq(mb[kj] - ib[kj])); }
        }
        if (score) {
          var dz = score.z[j] - score.z[i];
          delta += W.score * (sq(zsum[a] + dz) - sq(zsum[a]) + sq(zsum[b] - dz) - sq(zsum[b]));
        }
        if (delta < -1e-9) {
          for (var cj = 0; cj < cats.length; cj++) {
            var xi = cats[cj].of[i], xj = cats[cj].of[j];
            if (xi === xj) continue;
            if (xi >= 0) { cnt[cj][a][xi]--; cnt[cj][b][xi]++; }
            if (xj >= 0) { cnt[cj][a][xj]++; cnt[cj][b][xj]--; }
          }
          if (score) { var d2 = score.z[j] - score.z[i]; zsum[a] += d2; zsum[b] -= d2; }
          assign[i] = b; assign[j] = a;
          cost += delta;
        }
      }
      if (cost < bestCost) { bestCost = cost; best = assign.slice(); }
    }
    return best;
  }

  function sq(x) { return x * x; }

  /* ============================================================
     実行
     ============================================================ */

  function showMsgs(list) {
    $('kw-msg').innerHTML = list.map(function (m) {
      return '<div class="kw-note' + (m.error ? ' is-error' : '') + '">' + R.esc(m.text) +
        (m.sub ? '<span>' + R.esc(m.sub) + '</span>' : '') + '</div>';
    }).join('');
  }

  function run() {
    // 名前を入れた子がいれば、何も入っていない空の行は外して分ける
    if (students.some(function (s) { return s.name.trim(); })) {
      var blank = students.filter(function (s) { return !s.name.trim() && !s.gender && !s.prev && !s.score && !s.support && !s.leader; });
      if (blank.length) { students = students.filter(function (s) { return blank.indexOf(s) < 0; }); renderList(); }
    }
    var count = classCount();
    if (!count) {
      showMsgs([{ text: 'クラスの数を選んでください。', sub: '1の「クラスの数」が未設定です。', error: true }]);
      $('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!students.length || !students.some(function (s) { return s.name.trim(); })) {
      showMsgs([{ text: '名簿が空です。', sub: '「CSVを読む」で名簿を読み込むか、「見本を入れる」を押してください。', error: true }]);
      return;
    }
    if (count > students.length) {
      showMsgs([{ text: 'クラスの数が人数より多いです。', sub: '名簿は' + students.length + '人ですが、' + count + 'クラスに分けようとしています。', error: true }]);
      return;
    }
    var model = buildModel(students);
    var assign = solve(students, count, model);
    var classes = [];
    for (var c = 0; c < count; c++) classes.push([]);
    // クラスの中は名簿の順（出席番号の順）
    students.forEach(function (s, i) { classes[assign[i]].push(s.id); });
    state = { classes: classes };
    var notes = [];
    if (!model.cats.length && !model.score) {
      notes.push({ text: 'そろえるものがないので、人数だけそろえて分けました。', sub: '名簿に性別・前のクラス・点数・支援・リーダーを入れるか、1のチェックを確かめてください。' });
    }
    showMsgs(notes);
    render();
    $('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
    ['kw-gen', 'kw-gen2'].forEach(function (id) { $(id).textContent = '再配置する'; });
  }

  function clearResult() {
    state = { classes: null };
    picked = null;
    ['kw-gen', 'kw-gen2'].forEach(function (id) { $(id).textContent = 'クラス分けする'; });
    renderBoard();
  }

  /* ============================================================
     1の枠：空のクラスの枠、または結果とクラスごとの内訳の表
     ============================================================ */

  var picked = null;   // タップで1人目にえらんだ子 "クラス,番目"

  function stats(ids) {
    var list = ids.map(byId).filter(Boolean);
    var sc = list.map(scoreOf).filter(function (v) { return v !== null; });
    var prev = {};
    list.forEach(function (s) { var p = String(s.prev || '').trim(); if (p) prev[p] = (prev[p] || 0) + 1; });
    return {
      n: list.length,
      f: list.filter(function (s) { return s.gender === '女'; }).length,
      m: list.filter(function (s) { return s.gender === '男'; }).length,
      prev: prev,
      avg: sc.length ? sc.reduce(function (a, b) { return a + b; }, 0) / sc.length : null,
      support: list.filter(function (s) { return s.support; }).length,
      leader: list.filter(function (s) { return s.leader; }).length
    };
  }

  function prevKinds() {
    var out = [];
    students.forEach(function (s) { var p = String(s.prev || '').trim(); if (p && out.indexOf(p) < 0) out.push(p); });
    return out.sort(function (a, b) { return a.localeCompare(b, 'ja', { numeric: true }); });
  }

  function renderBoard() {
    var board = $('kw-board');
    var hasResult = !!state.classes;
    $('kw-board-wrap').classList.toggle('is-result', hasResult);
    var html = '';
    var count = classCount();
    var named = students.filter(function (s) { return s.name.trim(); }).length;
    if (hasResult) {
      var names = displayNames(), idx = {};
      students.forEach(function (s, i) { idx[s.id] = i; });
      var anyGender = students.some(function (s) { return s.gender; });
      state.classes.forEach(function (ids, c) {
        var st = stats(ids);
        html += '<div class="kw-group" data-g="' + c + '">' +
          '<div class="kw-group-head"><span class="kw-group-n">' + className(c) + '</span>' +
          '<span class="kw-group-size">' + st.n + '人' + (anyGender ? '（女 ' + st.f + '・男 ' + st.m + '）' : '') + '</span></div>' +
          '<ul class="kw-members">' +
          ids.map(function (id, mi) {
            var s = byId(id), at = c + ',' + mi, n = names[idx[id]];
            var tags = '';
            if (s.prev) tags += '<span class="kw-tag">' + R.esc(String(s.prev).trim()) + '</span>';
            if (s.support) tags += '<span class="kw-tag is-support">支援</span>';
            if (s.leader) tags += '<span class="kw-tag is-leader">リーダー</span>';
            var sc = scoreOf(s);
            return '<li class="kw-mem' + (s.gender === '女' ? ' is-f' : s.gender === '男' ? ' is-m' : '') + (picked === at ? ' is-picked' : '') + '"' +
              ' draggable="true" tabindex="0" role="button" data-at="' + at + '" data-name="' + R.esc(n) + '"' +
              ' aria-label="' + className(c) + ' ' + R.esc(n) + '（えらんで入れかえ）">' +
              '<span class="kw-mem-name">' + R.esc(n) + '</span>' + tags +
              (sc !== null ? '<span class="kw-mem-score">' + sc + '</span>' : '') +
              '</li>';
          }).join('') + '</ul></div>';
      });
    } else if (count) {
      // まだクラス分けしていない：クラスの数と人数だけの枠
      var sizes = named ? classSizes(named, count) : null;
      for (var c = 0; c < count; c++) {
        html += '<div class="kw-group is-empty"><div class="kw-group-head"><span class="kw-group-n">' + className(c) + '</span>' +
          '<span class="kw-group-size">' + (sizes ? sizes[c] + '人' : '') + '</span></div>' +
          '<p class="kw-empty-body">' + (sizes ? 'ここに' + sizes[c] + '人が入ります' : '名簿を入れると人数が出ます') + '</p></div>';
      }
    }
    board.innerHTML = html;
    $('kw-pick-hint').hidden = hasResult || !!count;
    $('kw-edit-hint').hidden = hasResult || !count;
    renderBalance();
    updateRowClasses();
    updateSteps();
  }

  /** クラスごとの内訳の表（人数・男女・前のクラス・平均点・支援・リーダー）。印刷には出さない */
  function renderBalance() {
    var box = $('kw-balance');
    if (!state.classes) { box.hidden = true; box.innerHTML = ''; return; }
    var pk = prevKinds();
    var all = stats(students.map(function (s) { return s.id; }));
    var cols = [['人数', function (st) { return st.n; }]];
    if (students.some(function (s) { return s.gender; })) {
      cols.push(['女', function (st) { return st.f; }], ['男', function (st) { return st.m; }]);
    }
    pk.forEach(function (p) { cols.push(['前 ' + p, function (st) { return st.prev[p] || 0; }]); });
    if (all.avg !== null) cols.push(['平均点', function (st) { return st.avg === null ? '—' : st.avg.toFixed(1); }]);
    if (all.support) cols.push(['支援', function (st) { return st.support; }]);
    if (all.leader) cols.push(['リーダー', function (st) { return st.leader; }]);
    var html = '<table class="kw-bal-table"><caption>クラスごとの内訳</caption><thead><tr><th></th>' +
      cols.map(function (c) { return '<th>' + R.esc(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody>';
    state.classes.forEach(function (ids, c) {
      var st = stats(ids);
      html += '<tr><th>' + className(c) + '</th>' + cols.map(function (col) { return '<td>' + col[1](st) + '</td>'; }).join('') + '</tr>';
    });
    html += '<tr class="is-all"><th>学年</th>' + cols.map(function (col) { return '<td>' + col[1](all) + '</td>'; }).join('') + '</tr>';
    html += '</tbody></table>';
    box.innerHTML = html;
    box.hidden = false;
  }

  /** 結果のまとめ・Excel用テキスト */
  function render() {
    renderBoard();
    var total = state.classes.reduce(function (a, g) { return a + g.length; }, 0);
    $('kw-info').textContent = state.classes.length + 'クラス / ' + total + '人';
    var cols = state.classes.map(function (ids, c) { return [className(c)].concat(ids.map(nameOf)); });
    var rows = Math.max.apply(null, cols.map(function (c) { return c.length; }));
    var lines = [];
    for (var r = 0; r < rows; r++) lines.push(cols.map(function (c) { return c[r] || ''; }).join('\t'));
    $('kw-out').value = lines.join('\n');
  }

  /* ---------- 結果を手で直す ---------- */

  function parseAt(at) { return at.split(',').map(Number); }

  function swapMembers(a, b) {
    if (!a || !b || a === b) return;
    var pa = parseAt(a), pb = parseAt(b), g = state.classes;
    var t = g[pa[0]][pa[1]];
    g[pa[0]][pa[1]] = g[pb[0]][pb[1]];
    g[pb[0]][pb[1]] = t;
    afterHandEdit();
  }

  function moveMember(a, to) {
    var pa = parseAt(a), g = state.classes;
    if (pa[0] === to) return;
    var id = g[pa[0]].splice(pa[1], 1)[0];
    g[to].push(id);
    afterHandEdit();
  }

  function afterHandEdit() {
    picked = null;
    // クラスの中は名簿の順にそろえる
    var order = {};
    students.forEach(function (s, i) { order[s.id] = i; });
    state.classes.forEach(function (ids) { ids.sort(function (x, y) { return order[x] - order[y]; }); });
    render();
    var sizes = state.classes.map(function (g) { return g.length; });
    showMsgs(Math.max.apply(null, sizes) - Math.min.apply(null, sizes) >= 2
      ? [{ text: 'クラスの人数に2人以上の差があります。', sub: '内訳の表を見ながら、入れかえ（2人を順にタップ）で直してください。' }]
      : []);
  }

  function pickMember(at) {
    if (!picked) { picked = at; renderBoard(); return; }
    if (picked === at) { picked = null; renderBoard(); return; }
    swapMembers(picked, at);
  }

  /* ---------- 手順バー ---------- */

  function updateSteps() {
    var bar = $('kw-stepbar');
    if (!bar) return;
    var named = students.some(function (s) { return s.name.trim(); });
    // 1 で生徒数とクラスの数を両方決めてはじめて 2（名簿）へ進む
    var now = state.classes ? 4 : !classCount() || !classTotal() ? 1 : named ? 3 : 2;
    Array.prototype.forEach.call(bar.children, function (li) {
      var n = Number(li.getAttribute('data-step'));
      li.classList.toggle('is-done', n < now);
      li.classList.toggle('is-on', n === now);
      if (n === now) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    // 見出しの横に「いま 2／4：名簿を入れる」
    var cur = bar.children[now - 1];
    if ($('kw-flow-now') && cur) $('kw-flow-now').textContent = 'いま ' + now + '／' + bar.children.length + '：' + cur.textContent.replace(/^\d+/, '');
  }

  function updateCount() {
    var n = students.filter(function (s) { return s.name.trim(); }).length;
    $('kw-count').textContent = n + '人';
    var count = classCount();
    $('kw-group-count').textContent = count + 'クラス';
    var info = $('kw-plan');
    var total = classTotal();
    if (!count || !total) { info.textContent = '生徒数とクラスの数を決めてください'; return; }
    // 名前を入れたぶんで分ける。まだ入れていなければ生徒数で見込みを出す
    var sizes = classSizes(n || total, count);
    var min = Math.min.apply(null, sizes), max = Math.max.apply(null, sizes);
    info.textContent = count + 'クラス・1クラス ' + (min === max ? min : min + '〜' + max) + '人' +
      (n && n !== total ? '（名簿 ' + n + '人・生徒数 ' + total + '人）' : '');
  }

  /* ============================================================
     名簿の表（1人1行）
     ============================================================ */

  function segHtml(s, i) {
    return '<span class="kw-seg" role="group" aria-label="' + (i + 1) + '人目の性別">' +
      ['', '女', '男'].map(function (g) {
        return '<button type="button" class="kw-seg-b' + (s.gender === g ? ' is-on' : '') + '" data-gender="' + g + '"' +
          ' aria-pressed="' + (s.gender === g ? 'true' : 'false') + '">' + (g || '—') + '</button>';
      }).join('') + '</span>';
  }

  function flagHtml(s, key, label) {
    return '<button type="button" class="kw-flag' + (s[key] ? ' is-on' : '') + '" data-flag="' + key + '" aria-pressed="' + (s[key] ? 'true' : 'false') + '">' + label + '</button>';
  }

  function renderList() {
    $('kw-list').innerHTML = students.map(function (s, i) {
      return '<div class="kw-row" data-id="' + s.id + '">' +
        '<span class="kw-no">' + (i + 1) + '</span>' +
        '<input type="text" class="kw-name" value="' + R.esc(s.name) + '" placeholder="' + (i + 1) + '番" aria-label="' + (i + 1) + '人目のなまえ" spellcheck="false" autocomplete="off">' +
        segHtml(s, i) +
        '<input type="text" class="kw-prevc" value="' + R.esc(s.prev) + '" placeholder="1組" aria-label="' + (i + 1) + '人目の前のクラス" spellcheck="false" autocomplete="off">' +
        '<input type="text" class="kw-score" value="' + R.esc(s.score) + '" placeholder="点" inputmode="decimal" aria-label="' + (i + 1) + '人目の点数" autocomplete="off">' +
        '<span class="kw-flags">' + flagHtml(s, 'support', '支援') + flagHtml(s, 'leader', 'リーダー') + '</span>' +
        '<span class="kw-row-group"></span>' +
        '<button type="button" class="kw-row-del" aria-label="' + (i + 1) + '人目を消す">✕</button>' +
        '</div>';
    }).join('');
    updateCount();
    if (state.classes) render(); else renderBoard();
  }

  /** 結果があれば、名簿の各行にその子のクラス（「3組」）を出す */
  function updateRowClasses() {
    var at = {};
    if (state.classes) state.classes.forEach(function (ids, c) { ids.forEach(function (id) { at[id] = className(c); }); });
    Array.prototype.forEach.call(document.querySelectorAll('#kw-list .kw-row'), function (row) {
      row.querySelector('.kw-row-group').textContent = at[Number(row.getAttribute('data-id'))] || '';
    });
  }

  function rowOf(el) {
    var row = el.closest('.kw-row');
    return row ? byId(Number(row.getAttribute('data-id'))) : null;
  }

  function addAndFocus(n) {
    var first = students.length;
    addRows(n);
    clearResult();
    renderList();
    var inputs = document.querySelectorAll('#kw-list .kw-name');
    if (inputs[first]) inputs[first].focus();
  }

  /** Excelから縦に何人ぶんか貼られたら、その行から下へ1人ずつ流し込む */
  function pasteNames(s, text) {
    var list = String(text).split(/\r?\n|\t/).map(R.cleanName).filter(Boolean);
    if (list.length < 2) return false;
    var at = students.indexOf(s);
    list.forEach(function (name, i) {
      if (!students[at + i]) students.push(newStudent());
      students[at + i].name = name;
    });
    // 決めた生徒数より多く貼られたときだけ、生徒数を増やす
    if (students.filter(function (x) { return x.name.trim(); }).length > classTotal()) totalFromRoster();
    clearResult();
    renderList();
    rosterNote(list.length + '人ぶん貼り付けました。', 'ok');
    return true;
  }

  function loadRoster(list) {
    nextId = 1;
    students = list.map(newStudent);
    totalFromRoster();
    clearResult();
    renderList();
  }

  /**
   * 名簿の行の数を生徒数にそろえる（2026-10-06）。
   * 足りなければ空の行を足し、多ければ下から空の行だけ消す。名前の入った行は消さない
   */
  function syncRows(total) {
    if (!total) return;
    if (students.length < total) addRows(total - students.length);
    for (var i = students.length - 1; i >= 0 && students.length > total; i--) {
      if (!students[i].name.trim()) students.splice(i, 1);
    }
  }

  /** 名簿を入れ直したら（CSV・見本・貼り付け）、生徒数を名前の数に合わせる */
  function totalFromRoster() {
    var n = students.filter(function (s) { return s.name.trim(); }).length;
    if (!n || n > TOTAL_MAX || n === classTotal()) return;
    $('kw-total').value = String(n);
    updateCount();
    updateSteps();
  }

  /* ============================================================
     見本・ダミー名簿（140人・前のクラス 4つ）
     100人を超える名簿を手で打つのは大変なので、試すための名簿を用意する。名前は架空
     ============================================================ */

  var SURNAMES = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本',
    '井上', '木村', '林', '清水', '山崎', '森', '池田', '橋本', '阿部', '石川', '山下', '中島', '石井', '小川', '前田', '岡田', '長谷川',
    '藤田', '後藤', '近藤', '村上', '遠藤', '青木', '坂本', '斉藤'];
  var GIRLS = ['さくら', 'ひなた', 'ゆい', 'めい', 'あおい', 'ひまり', 'りん', 'ゆな', 'こはる', 'つむぎ', 'えま', 'みお', 'ことね', 'ゆあ', 'のあ', 'あかり', 'しずく', 'かんな', 'いろは', 'すず'];
  var BOYS = ['はると', 'そうた', 'ゆうと', 'りく', 'みなと', 'はやと', 'いつき', 'そら', 'かいと', 'だいち', 'れん', 'あさひ', 'ゆうま', 'たくみ', 'けんた', 'しょう', 'りょう', 'こうき', 'かなた', 'ひろと'];

  function dummyRoster(total, prevCount) {
    var seed = 20261005;
    var rnd = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    var used = {}, out = [];
    for (var i = 0; i < total; i++) {
      var girl = rnd() < 0.5;
      var name;
      do {
        name = SURNAMES[Math.floor(rnd() * SURNAMES.length)] + ' ' + (girl ? GIRLS : BOYS)[Math.floor(rnd() * 20)];
      } while (used[name]);
      used[name] = true;
      // 点数は 60点前後に山があるように（3つの乱数の平均）
      var sc = Math.round(30 + 70 * (rnd() + rnd() + rnd()) / 3);
      out.push({
        name: name, gender: girl ? '女' : '男', prev: (i % prevCount + 1) + '組', score: String(Math.min(100, sc)),
        support: rnd() < 0.06, leader: rnd() < 0.09
      });
    }
    // 前のクラスごとに名簿の順に並べる（学校の名簿に近い形）
    return out.sort(function (a, b) { return a.prev.localeCompare(b.prev, 'ja', { numeric: true }); });
  }

  /* ============================================================
     CSV（席替え・班分けと共通の形。クラス分けが読み書きするのは 性別・クラスの配慮・前のクラス・新しいクラス・点数）
     ============================================================ */

  function rosterNote(text, kind) {
    var el = $('kw-roster-note');
    if (!text) { el.hidden = true; el.textContent = ''; el.className = 'kw-roster-note'; return; }
    el.hidden = false;
    el.textContent = text;
    el.className = 'kw-roster-note' + (kind ? ' is-' + kind : '');
  }

  var csvRows = null, csvRoles = {};
  var ROLE_LABEL = { '': '（使わない）', name: 'なまえ', gender: '性別', prev: '前のクラス', score: '点数', rule: '配慮（支援・リーダー）', result: '新しいクラス' };

  /** 見出しから列の役割を当てる。自分が書き出したCSVはそのまま読み戻せる */
  function autoDetectRoles(head) {
    var roles = {};
    head.forEach(function (raw, c) {
      var h = (raw || '').trim();
      if (!h) return;
      if (/^(出席番号|番号|no\.?|#)$/i.test(h)) return;
      var rr = R.ruleColumnRole(h, 'クラスの配慮', head);
      if (rr === 'rule') { roles[c] = 'rule'; return; }
      if (rr === 'skip' || /^(席|座席の形|班)$/.test(h)) return;   // ほかのメーカーの列はそのまま残す
      if (/^(新しいクラス|新クラス|新学級)$/.test(h)) roles[c] = 'result';
      else if (/(前のクラス|旧クラス|前クラス|現クラス|いまのクラス|旧学級|^クラス$|^組$|^学級$)/.test(h)) roles[c] = 'prev';
      else if (/(性別|せいべつ|男女|gender|sex)/i.test(h)) roles[c] = 'gender';
      else if (/(点数|得点|点|学力|テスト|score)/i.test(h)) roles[c] = 'score';
      else if (/(なまえ|名前|氏名|生徒名|児童名|姓|名|name)/i.test(h)) roles[c] = 'name';
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
      csvRoles = $('kw-csv-head').checked ? autoDetectRoles(rows[0]) : {};
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
    var hasHead = $('kw-csv-head').checked;
    var width = R.colWidth(csvRows);
    var sample = csvRows[hasHead ? 1 : 0] || [];
    var html = '';
    for (var c = 0; c < width; c++) {
      var head = hasHead ? ((csvRows[0][c] || '').trim() || (c + 1) + '列目') : (c + 1) + '列目';
      var val = (sample[c] || '').trim() || '（空）';
      var role = csvRoles[c] || '';
      html += '<div class="kw-csv-col' + (role ? ' is-on' : '') + '">' +
        '<span class="kw-csv-h">' + R.esc(head) + '</span>' +
        '<span class="kw-csv-v">' + R.esc(val) + '</span>' +
        '<select class="kw-csv-role-sel" data-col="' + c + '" aria-label="' + R.esc(head) + 'の役割">' +
        Object.keys(ROLE_LABEL).map(function (k) {
          return '<option value="' + k + '"' + (role === k ? ' selected' : '') + '>' + ROLE_LABEL[k] + '</option>';
        }).join('') + '</select></div>';
    }
    $('kw-csv-cols').innerHTML = html;
    $('kw-csv-pick').hidden = false;
    rosterNote('');
  }

  function colsWithRole(role) {
    return Object.keys(csvRoles).filter(function (c) { return csvRoles[c] === role; })
      .map(Number).sort(function (a, b) { return a - b; });
  }

  function applyCsvPick() {
    var nameCols = colsWithRole('name');
    if (!nameCols.length) { rosterNote('「なまえ」の列を1つ以上えらんでください。', 'error'); return; }
    var one = function (role) { return colsWithRole(role)[0]; };
    var gCol = one('gender'), pCol = one('prev'), sCol = one('score'), rCol = one('rule'), xCol = one('result');
    var body = $('kw-csv-head').checked ? csvRows.slice(1) : csvRows;
    var head = $('kw-csv-head').checked ? csvRows[0] : [];
    var used = Object.keys(csvRoles).filter(function (c) { return csvRoles[c]; }).map(Number);
    var cell = function (r, c) { return c === undefined ? '' : String(r[c] || '').trim(); };
    var list = [], results = [];
    body.forEach(function (r) {
      var name = nameCols.map(function (c) { return cell(r, c); }).filter(Boolean).join(' ').trim();
      if (!name) return;
      var rule = cell(r, rCol);
      list.push({
        name: R.cleanName(name), gender: normGender(cell(r, gCol)), prev: cell(r, pCol), score: cell(r, sCol),
        support: /支援/.test(rule), leader: /(リーダー|りーだー)/.test(rule),
        extra: R.keepExtras(head, r, used)   // ほかのメーカーの列。保存のときそのまま書き戻す
      });
      results.push(cell(r, xCol));
    });
    if (!list.length) { rosterNote('えらんだ列に名前が入っていませんでした。', 'error'); return; }
    loadRoster(list);

    // 「新しいクラス」が入っていれば、その結果を戻す（前に保存したクラス分けの続き）
    var kinds = [];
    results.forEach(function (x) { var m = x.match(/\d+/); if (m && kinds.indexOf(Number(m[0])) < 0) kinds.push(Number(m[0])); });
    var restored = false;
    if (kinds.length >= 2 && results.every(function (x) { return /\d+/.test(x); }) && Math.max.apply(null, kinds) <= CLASS_MAX) {
      var count = Math.max.apply(null, kinds);
      var classes = [];
      for (var c = 0; c < count; c++) classes.push([]);
      results.forEach(function (x, i) { classes[Number(x.match(/\d+/)[0]) - 1].push(students[i].id); });
      $('kw-num').value = String(count);
      state = { classes: classes };
      render();
      ['kw-gen', 'kw-gen2'].forEach(function (id) { $(id).textContent = '再配置する'; });
      restored = true;
    }
    closeCsvPick();
    updateCount();
    var got = [list.length + '人'];
    if (gCol !== undefined) got.push('性別');
    if (pCol !== undefined) got.push('前のクラス');
    if (sCol !== undefined) got.push('点数');
    if (rCol !== undefined) got.push('支援・リーダー');
    if (restored) got.push('新しいクラス');
    rosterNote(got.join('・') + ' を読みこみました。', 'ok');
  }

  function closeCsvPick() {
    $('kw-csv-pick').hidden = true;
    csvRows = null;
    csvRoles = {};
    $('kw-csv').value = '';
  }

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

  function ruleCell(s) {
    return [s.support ? '支援' : '', s.leader ? 'リーダー' : ''].filter(Boolean).join(';');
  }

  function rowsFor(list, classOf) {
    return R.sharedRows(list.map(function (s, i) {
      return {
        values: {
          'なまえ': s.name, '性別': s.gender || '', 'クラスの配慮': ruleCell(s), '前のクラス': s.prev || '',
          '新しいクラス': classOf ? classOf(s, i) : '', '点数': s.score || ''
        },
        extra: s.extra
      };
    }));
  }

  function downloadState(withClasses) {
    var list = students.filter(function (s) { return s.name.trim(); });
    if (!list.length) { rosterNote('名簿が空です。', 'error'); return; }
    var at = {};
    if (withClasses && state.classes) state.classes.forEach(function (ids, c) { ids.forEach(function (id) { at[id] = className(c); }); });
    downloadCsv(withClasses ? 'クラス分け.csv' : 'クラス分け_名簿.csv', rowsFor(list, function (s) { return at[s.id] || ''; }));
    rosterNote('CSVに保存しました。次回このファイルを「CSVを読む」から取り込めば、' +
      (withClasses ? '名簿と新しいクラス' : '名簿') + 'がそのまま戻ります。', 'ok');
  }

  function downloadTemplate() {
    var sample = [
      { name: '佐藤 みゆき', gender: '女', prev: '1組', score: '78', leader: true },
      { name: '鈴木 けんた', gender: '男', prev: '1組', score: '64' },
      { name: '高橋 あおい', gender: '女', prev: '2組', score: '85', support: true },
      { name: '田中 そうた', gender: '男', prev: '2組', score: '52', support: true, leader: true }
    ];
    downloadCsv('クラス分け_ひな形.csv', rowsFor(sample.map(newStudent)));
    rosterNote('ひな形をダウンロードしました。「クラスの配慮」には「支援」「リーダー」を、両方なら「支援;リーダー」と書きます。', 'ok');
  }

  function downloadDummy() {
    downloadCsv('クラス分け_ダミー名簿_140人.csv', rowsFor(dummyRoster(140, 4).map(newStudent)));
    rosterNote('ダミー名簿（140人・前のクラス4つ・名前は架空）をダウンロードしました。「CSVを読む」から読み込めば、そのまま試せます。', 'ok');
  }

  /* ============================================================
     配線
     ============================================================ */

  (function fillNums() {
    var sel = $('kw-num');
    sel.innerHTML = '<option value="">---</option>';
    for (var i = 2; i <= CLASS_MAX; i++) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = i + 'クラス';
      sel.appendChild(o);
    }
  })();

  $('kw-num').addEventListener('change', function () { clearResult(); updateCount(); });
  // 生徒数を決めたら、名簿の欄をその人数ぶん出す
  $('kw-total').addEventListener('change', function () {
    if (classTotal()) this.value = String(classTotal());
    syncRows(classTotal());
    clearResult();
    renderList();
    updateCount();
    updateSteps();
  });
  ['kw-bal-gender', 'kw-bal-prev', 'kw-bal-score', 'kw-bal-support', 'kw-bal-leader'].forEach(function (id) {
    // そろえるものを変えたら、次の「再配置する」から効く（いまの結果は消さない）
    $(id).addEventListener('change', function () {
      if (state.classes) showMsgs([{ text: 'そろえるものを変えました。「再配置する」を押すと反映します。' }]);
    });
  });

  var list = $('kw-list');

  list.addEventListener('input', function (e) {
    var t = e.target, s = rowOf(t);
    if (!s) return;
    if (t.classList.contains('kw-name')) { s.name = t.value; updateCount(); updateSteps(); if (!state.classes) renderBoard(); }
    else if (t.classList.contains('kw-prevc')) s.prev = t.value;
    else if (t.classList.contains('kw-score')) s.score = t.value;
    else return;
    if (state.classes) renderBalance();
  });

  list.addEventListener('paste', function (e) {
    if (!e.target.classList.contains('kw-name')) return;
    var s = rowOf(e.target);
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (s && pasteNames(s, text)) e.preventDefault();
  });

  // Enter で次の行へ（最後の行なら1行足す）
  list.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.isComposing || !e.target.classList.contains('kw-name')) return;
    e.preventDefault();
    var inputs = Array.prototype.slice.call(list.querySelectorAll('.kw-name'));
    var at = inputs.indexOf(e.target);
    if (at === inputs.length - 1) addAndFocus(1);
    else inputs[at + 1].focus();
  });

  list.addEventListener('click', function (e) {
    var t = e.target, s = rowOf(t);
    if (!s) return;
    var seg = t.closest('.kw-seg-b');
    if (seg) {
      s.gender = seg.getAttribute('data-gender');
      Array.prototype.forEach.call(seg.parentNode.querySelectorAll('.kw-seg-b'), function (b) {
        var on = b.getAttribute('data-gender') === s.gender;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (state.classes) render();
      return;
    }
    var flag = t.closest('.kw-flag');
    if (flag) {
      var key = flag.getAttribute('data-flag');
      s[key] = !s[key];
      flag.classList.toggle('is-on', s[key]);
      flag.setAttribute('aria-pressed', s[key] ? 'true' : 'false');
      if (state.classes) render();
      return;
    }
    if (t.classList.contains('kw-row-del')) {
      var label = R.cleanName(s.name) || ((students.indexOf(s) + 1) + '番');
      if (s.name.trim() && !window.confirm('「' + label + '」の行を消します。よろしいですか？')) return;
      students = students.filter(function (x) { return x.id !== s.id; });
      clearResult();
      renderList();
    }
  });

  /* 名簿の名前を押す（名前欄に入る）と、結果のその子を光らせる */
  function highlight(name) {
    Array.prototype.forEach.call(document.querySelectorAll('#kw-board .is-hl'), function (x) { x.classList.remove('is-hl'); });
    if (!name) return;
    Array.prototype.forEach.call(document.querySelectorAll('#kw-board .kw-mem[data-name]'), function (x) {
      if (x.getAttribute('data-name') === name) { x.classList.add('is-hl'); }
    });
  }
  list.addEventListener('focusin', function (e) {
    var row = e.target.closest && e.target.closest('.kw-row');
    if (!row) return;
    var i = Array.prototype.indexOf.call(list.children, row);
    highlight(i >= 0 ? displayNames()[i] : null);
  });
  list.addEventListener('focusout', function (e) { if (!list.contains(e.relatedTarget)) highlight(null); });

  $('kw-add1').addEventListener('click', function () { addAndFocus(1); });
  $('kw-add10').addEventListener('click', function () { addAndFocus(10); });
  $('kw-add30').addEventListener('click', function () { addAndFocus(30); });

  ['kw-gen', 'kw-gen2', 'kw-again'].forEach(function (id) { $(id).addEventListener('click', function () { run(); }); });
  $('kw-copy').addEventListener('click', function () { R.copyText($('kw-out').value, this); });
  $('kw-print').addEventListener('click', function () { window.print(); });
  $('kw-download').addEventListener('click', function () { downloadState(true); });
  $('kw-csv-save').addEventListener('click', function () { downloadState(false); });
  $('kw-csv-template').addEventListener('click', downloadTemplate);
  $('kw-csv-dummy').addEventListener('click', downloadDummy);
  $('kw-sample').addEventListener('click', function () {
    var filled = students.some(function (s) { return s.name.trim(); });
    if (filled && !window.confirm('いま入っている名簿を、見本（ダミー名簿140人）に入れかえます。よろしいですか？')) return;
    // 見本は名簿だけ。クラスの数などは触らず、クラス分けもしない（押すのは先生）
    loadRoster(dummyRoster(140, 4));
    showMsgs([]);
    rosterNote('見本の名簿（140人・前のクラス4つ・名前は架空）を入れました。1でクラスの数を選んで「クラス分けする」を押してください。', 'ok');
  });

  /* 結果の入れかえ：ドラッグ＆ドロップ、またはタップで2人えらぶ。クラスの空いた所に落とすと移動 */
  var board = $('kw-board');
  var memAt = function (el) { var m = el && el.closest && el.closest('.kw-mem[data-at]'); return m ? m.getAttribute('data-at') : null; };
  var groupAt = function (el) { var g = el && el.closest && el.closest('.kw-group[data-g]'); return g ? Number(g.getAttribute('data-g')) : null; };
  board.addEventListener('click', function (e) {
    if (!state.classes) return;
    var at = memAt(e.target);
    if (at) { pickMember(at); return; }
    var g = groupAt(e.target);
    if (picked && g !== null) moveMember(picked, g);
  });
  board.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var at = memAt(e.target);
    if (!at) return;
    e.preventDefault();
    pickMember(at);
    var again = board.querySelector('.kw-mem[data-at="' + at + '"]');
    if (again) again.focus();
  });
  var dragFrom = null;
  var clearOver = function () { Array.prototype.forEach.call(board.querySelectorAll('.is-over'), function (x) { x.classList.remove('is-over'); }); };
  board.addEventListener('dragstart', function (e) {
    dragFrom = memAt(e.target);
    if (!dragFrom) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragFrom);
    e.target.classList.add('is-dragging');
  });
  board.addEventListener('dragover', function (e) {
    if (!dragFrom || groupAt(e.target) === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearOver();
    (e.target.closest('.kw-mem') || e.target.closest('.kw-group')).classList.add('is-over');
  });
  board.addEventListener('drop', function (e) {
    if (!dragFrom) return;
    var to = memAt(e.target), g = groupAt(e.target);
    if (to === null && g === null) return;
    e.preventDefault();
    var from = dragFrom;
    dragFrom = null;
    clearOver();
    if (to) swapMembers(from, to); else moveMember(from, g);
  });
  board.addEventListener('dragend', function () {
    dragFrom = null;
    clearOver();
    Array.prototype.forEach.call(board.querySelectorAll('.is-dragging'), function (x) { x.classList.remove('is-dragging'); });
  });

  /* CSV */
  $('kw-csv').addEventListener('change', function () { if (this.files && this.files[0]) readCsvFile(this.files[0]); });
  $('kw-csv-head').addEventListener('change', function () { if (csvRows) renderCsvPick(); });
  $('kw-csv-cancel').addEventListener('click', closeCsvPick);
  $('kw-csv-ok').addEventListener('click', applyCsvPick);
  $('kw-csv-cols').addEventListener('change', function (e) {
    if (!e.target.classList.contains('kw-csv-role-sel')) return;
    csvRoles[Number(e.target.getAttribute('data-col'))] = e.target.value;
    renderCsvPick();
  });

  addRows(START_ROWS);
  renderList();
})();
