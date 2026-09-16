/* ============================================================
   kuku.js — かけざん修行（九九）
   出題データは js/kuku-data.js（window.KUKU_DATA）だけを見る。
   出題も採点もブラウザ内で完結し、サーバーには何も送らない。

   設計のねらい：
   - 九九は「計算」ではなく「音」で覚える。だから といかたの本命は
     となえかた（「にしが」→ こたえ）で、しきは その次に置く。
   - 音だけの丸暗記は、忘れたときに戻れない。まちがえたら●のアレイ図を
     かならず出して、「3が2つぶん」と数えなおせるようにする。
   - 読み上げ（音声合成）は入れない。九九は子どもが声に出すもので、
     アプリが平坦な抑揚で読むとリズムをかえって壊す。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('kk-app');
  if (!app || !window.KUKU_DATA) return;

  var DATA = window.KUKU_DATA;
  var SET_LENGTH = 10;

  /* データにある段から選択肢を組み立てる（データが増えれば自動で増える） */
  var DANS = (function () {
    var ns = [];
    DATA.forEach(function (e) { if (ns.indexOf(e.a) < 0) ns.push(e.a); });
    ns.sort(function (x, y) { return x - y; });
    var list = ns.map(function (n) {
      return { id: 'd' + n, name: n + 'の だん', note: n + '×1〜' + n + '×9', dans: [n] };
    });
    list.push({ id: 'all', name: 'ランダム', note: DATA.length + 'もん ぜんぶ', dans: ns });
    return list;
  })();

  var MODES = [
    { id: 'tonae', name: 'おとだけ', note: '「にしが」→ こたえを えらぶ' },
    { id: 'shiki', name: 'じゅんばんに とく', note: '「2 × 4」→ こたえを えらぶ' },
    { id: 'gyaku', name: 'ランダムに こたえる', note: '「8 は なん × なん?」' }
  ];

  var state = { danId: DANS[0].id, modeId: 'tonae', session: null };

  var randInt = function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var pick = function (a) { return a[randInt(0, a.length - 1)]; };
  var shiki = function (e) { return e.a + ' × ' + e.b; };

  function poolOf(danId) {
    var d = DANS.filter(function (x) { return x.id === danId; })[0] || DANS[0];
    return DATA.filter(function (e) { return d.dans.indexOf(e.a) >= 0; });
  }

  /* ---------- 出題 ---------- */

  /* 九九のまちがいは「1つとなりの段」と「おなじ段の ひとつ ずれ」に集中する。
     ランダムな数を並べても九九の練習にならないので、そこから選択肢を作る。
     かける数・かけられる数は 1〜9 の外に出さない。九九に無い数（3×11=33 など）が
     並ぶと、九九を覚えていない子でも「見たことない数」で消せてしまう。 */
  function numberOptions(e) {
    var near = [];
    [-1, 1, -2, 2].forEach(function (d) {
      if (e.b + d >= 1 && e.b + d <= 9) near.push(e.a * (e.b + d));
      if (e.a + d >= 1 && e.a + d <= 9) near.push((e.a + d) * e.b);
    });
    var opts = [e.ans];
    shuffle(near).forEach(function (v) {
      if (opts.indexOf(v) < 0 && opts.length < 4) opts.push(v);
    });
    // 1×1 のように となりが少ない九九では足りなくなる。そのときも
    // 「九九のこたえ」だけから、近い数を選ぶ。
    if (opts.length < 4) {
      var all = DATA.map(function (x) { return x.ans; })
        .filter(function (v, i, a) { return a.indexOf(v) === i; })
        .sort(function (x, y) { return Math.abs(x - e.ans) - Math.abs(y - e.ans); });
      all.forEach(function (v) {
        if (opts.indexOf(v) < 0 && opts.length < 4) opts.push(v);
      });
    }
    return shuffle(opts.map(function (v) { return { v: String(v), ok: v === e.ans }; }));
  }

  /* ぎゃくびき：こたえが同じ式（3×2 と 2×3）を選択肢に混ぜると正解が2つになる。
     積がちがう式だけを集める。 */
  function shikiOptions(e, pool) {
    var opts = [{ v: shiki(e), ok: true }];
    var seen = {}; seen[shiki(e)] = true;
    var cand = pool.filter(function (x) { return x.ans !== e.ans && !seen[shiki(x)]; });
    // 近い答えの式ほど迷う。差の小さい順に並べてから、その中でシャッフルする
    cand.sort(function (x, y) { return Math.abs(x.ans - e.ans) - Math.abs(y.ans - e.ans); });
    shuffle(cand.slice(0, 10)).forEach(function (x) {
      if (opts.length >= 4 || seen[shiki(x)]) return;
      seen[shiki(x)] = true;
      opts.push({ v: shiki(x), ok: false });
    });
    return shuffle(opts);
  }

  function makeQuestion(pool) {
    var e = pick(pool);
    if (state.modeId === 'gyaku') {
      return { entry: e, askKind: 'gyaku', ask: String(e.ans), options: shikiOptions(e, pool), answer: shiki(e) };
    }
    return {
      entry: e,
      askKind: state.modeId,
      ask: state.modeId === 'tonae' ? e.q : shiki(e),
      options: numberOptions(e),
      answer: String(e.ans)
    };
  }

  /* ---------- 画面 ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderMenu() {
    app.innerHTML = '';
    var wrap = el('div', 'kk-menu');
    wrap.appendChild(group('だん', DANS, 'danId', 'kk-choices-dan'));
    wrap.appendChild(group('もんだい', MODES, 'modeId', 'kk-choices-column'));

    var start = el('button', 'kk-start', 'スタート');
    start.type = 'button';
    start.addEventListener('click', startSession);
    wrap.appendChild(start);
    app.appendChild(wrap);
    if (window.NinjaLinks) app.appendChild(NinjaLinks.el('kuku'));
  }

  function group(title, items, key, gridCls) {
    var sec = el('section', 'kk-group');
    sec.appendChild(el('h2', 'kk-group-title', title));
    var grid = el('div', 'kk-choices ' + gridCls);
    items.forEach(function (item) {
      var btn = el('button', 'kk-choice');
      btn.type = 'button';
      btn.appendChild(el('span', 'kk-choice-label', item.name));
      btn.appendChild(el('span', 'kk-choice-note', item.note));
      if (state[key] === item.id) btn.classList.add('is-on');
      btn.addEventListener('click', function () { state[key] = item.id; renderMenu(); });
      grid.appendChild(btn);
    });
    sec.appendChild(grid);
    return sec;
  }

  function startSession() {
    state.session = { pool: poolOf(state.danId), index: 0, correct: 0, locked: false, q: null, missed: [] };
    nextQuestion();
  }

  function nextQuestion() {
    var s = state.session;
    if (s.index >= SET_LENGTH) return renderResult();
    s.q = makeQuestion(s.pool);
    s.locked = false;
    renderPlay();
  }

  /* ●のアレイ図。a が「1つ分の数」＝1行の●の数、b が「いくつ分」＝行の数。
     3×2 なら ●●● が2行。唱え方「さん・に」の順番と絵の形が一致する。 */
  function dotsEl(e) {
    var box = el('div', 'kk-dots');
    var grid = el('div', 'kk-dots-grid');
    grid.style.setProperty('--kk-cols', e.a);
    grid.style.setProperty('--kk-rows', e.b);
    for (var i = 0; i < e.a * e.b; i++) grid.appendChild(el('span', 'kk-dot'));
    box.appendChild(grid);
    box.appendChild(el('p', 'kk-dots-note', e.a + 'が ' + e.b + 'つぶん で ' + e.ans));
    return box;
  }

  function renderPlay() {
    var s = state.session, q = s.q;
    app.innerHTML = '';
    var wrap = el('div', 'kk-play');

    var head = el('div', 'kk-play-head');
    head.appendChild(el('span', null, (s.index + 1) + ' / ' + SET_LENGTH));
    head.appendChild(el('span', null, 'せいかい ' + s.correct));
    wrap.appendChild(head);

    var bar = el('div', 'kk-bar');
    var fill = el('div', 'kk-bar-fill');
    fill.style.width = (s.index / SET_LENGTH * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    wrap.appendChild(el('p', 'kk-ask-label',
      q.askKind === 'gyaku' ? 'なん × なん?' : 'こたえは?'));

    var ask = el('div', 'kk-ask kk-ask-' + q.askKind);
    ask.appendChild(el('p', 'kk-ask-main', q.ask));
    // ヒントは押しても減点しない。押さずに済むならそれが一番いい、という作りにはしない。
    var hint = el('button', 'kk-hint-btn', '● で みる');
    hint.type = 'button';
    hint.addEventListener('click', function () { showDots(ask, q.entry); });
    ask.appendChild(hint);
    wrap.appendChild(ask);

    var options = el('div', 'kk-options');
    q.options.forEach(function (o) {
      var b = el('button', 'kk-opt');
      b.type = 'button';
      b.appendChild(el('span', 'nk-answer-label', o.v));
      b.addEventListener('click', function () { choose(o, b, options); });
      options.appendChild(b);
    });
    wrap.appendChild(options);

    wrap.appendChild(el('div', 'kk-feedback'));

    var back = el('button', 'kk-back', '← もんだいせんたくに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);
    app.appendChild(wrap);
  }

  function showDots(ask, entry) {
    if (ask.querySelector('.kk-dots')) return;
    var btn = ask.querySelector('.kk-hint-btn');
    if (btn) btn.remove();
    ask.classList.add('is-hint');
    ask.appendChild(dotsEl(entry));
  }

  function choose(chosen, btn, options) {
    var s = state.session;
    if (s.locked) return;
    s.locked = true;
    var q = s.q, e = q.entry;
    if (chosen.ok) s.correct++;
    else s.missed.push(shiki(e) + ' = ' + e.ans);

    Array.prototype.forEach.call(options.querySelectorAll('.kk-opt'), function (b, i) {
      b.disabled = true;
      if (q.options[i].ok) b.classList.add('is-correct');
    });
    if (!chosen.ok) btn.classList.add('is-wrong');

    // まちがえたら●を自動で出す。ヒントが要る子ほどヒントを押さないので、
    // こちらから見せる（2026-09-15）。
    if (!chosen.ok) showDots(app.querySelector('.kk-ask'), e);
    else {
      var h = app.querySelector('.kk-hint-btn');
      if (h) h.remove();
    }

    var fb = app.querySelector('.kk-feedback');
    fb.className = 'kk-feedback ' + (chosen.ok ? 'is-ok' : 'is-ng');
    fb.textContent = (chosen.ok ? 'せいかい! ' : 'こたえは ') + e.q + ' ' + e.y + '（' + shiki(e) + ' = ' + e.ans + '）';

    setTimeout(function () { s.index++; nextQuestion(); }, chosen.ok ? 1400 : 2600);
  }

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    var wrap = el('div', 'kk-result');
    if (s.correct === SET_LENGTH) wrap.classList.add('is-perfect');
    var stars = s.correct >= 10 ? 3 : s.correct >= 8 ? 2 : s.correct >= 5 ? 1 : 0;
    wrap.appendChild(el('p', 'kk-result-stars', '★★★☆☆☆'.slice(3 - stars, 6 - stars)));
    wrap.appendChild(el('p', 'kk-result-score', SET_LENGTH + 'もんちゅう ' + s.correct + 'もん せいかい!'));
    if (s.missed.length) {
      wrap.appendChild(el('p', 'kk-result-msg', 'まちがえた かけざん'));
      var list = el('div', 'kk-missed');
      s.missed.forEach(function (m) { list.appendChild(el('span', 'kk-missed-item', m)); });
      wrap.appendChild(list);
    } else {
      wrap.appendChild(el('p', 'kk-result-msg', 'ぜんもん せいかい! くく めいじん!'));
    }

    var again = el('button', 'kk-start', 'もういちど');
    again.type = 'button';
    again.addEventListener('click', startSession);
    wrap.appendChild(again);

    var back = el('button', 'kk-back', '← もんだいせんたくに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);
    app.appendChild(wrap);
  }

  renderMenu();
})();
