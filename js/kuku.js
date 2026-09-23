/* ============================================================
   kuku.js — かけざん修行（九九）
   出題データは js/kuku-data.js（window.KUKU_DATA）だけを見る。
   出題も採点もブラウザ内で完結し、サーバーには何も送らない。

   設計のねらい：
   - 九九は「計算」ではなく「音」で覚える。だから もんだいの本命は
     おとだけ（「にしが」→ こたえ）で、式（「2 × 4」）は その次に置く。
   - 式のもんだいは「じゅんばんに とく」（×1 から ×9 まで順に）と
     「ランダムに こたえる」（同じ範囲を ばらばらの順に、重ならずに）の2つ。
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
  var SET_LENGTH = 10;  // おとだけの問題数。じゅんばん・ランダムは その だんの ×1〜×9 の9もん

  /* データにある段から選択肢を組み立てる（データが増えれば自動で増える）。
     ぜんぶ混ぜる「ランダム」の だんは置かない。ばらばらに出すのは もんだい側の「ランダムに こたえる」が受け持つ（2026-09-17） */
  var DANS = (function () {
    var ns = [];
    DATA.forEach(function (e) { if (ns.indexOf(e.a) < 0) ns.push(e.a); });
    ns.sort(function (x, y) { return x - y; });
    var list = ns.map(function (n) {
      return { id: 'd' + n, name: n + 'の だん', note: n + '×1〜' + n + '×9', dans: [n] };
    });
    return list;
  })();

  var MODES = [
    { id: 'tonae', name: 'おとだけ', note: '「にしが」→ こたえを えらぶ', img: '/assets/images/ninja/modes/kuku-oto.webp' },
    { id: 'junban', name: 'じゅんばんに とく', note: '「2 × 1」「2 × 2」… と じゅんばんに', img: '/assets/images/ninja/modes/kuku-junban.webp' },
    { id: 'random', name: 'ランダムに こたえる', note: '「2 × 7」「2 × 3」… と ばらばらに', img: '/assets/images/ninja/modes/kuku-random.webp' }
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

  function makeQuestion(e) {
    return {
      entry: e,
      askKind: state.modeId === 'tonae' ? 'tonae' : 'shiki',
      ask: state.modeId === 'tonae' ? e.q : shiki(e),
      options: numberOptions(e),
      answer: String(e.ans)
    };
  }

  /* 1セットで出す九九を、はじめに まとめて決める。
     - じゅんばんに とく：えらんだ だんを ×1 から ×9 まで順に
     - ランダムに こたえる：えらんだ だんを まぜて、同じ九九が2回 出ないように出す
     - おとだけ：いままでどおり、範囲から毎回くじ引き */
  function buildList(pool) {
    if (state.modeId === 'junban') {
      return pool.slice().sort(function (x, y) { return x.b - y.b; });
    }
    if (state.modeId === 'random') {
      return shuffle(pool.slice()).slice(0, SET_LENGTH);
    }
    var list = [];
    for (var i = 0; i < SET_LENGTH; i++) list.push(pick(pool));
    return list;
  }

  /* ---------- 画面 ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // メニューは2段階（2026-09-22。かんじ修行と同じ型）。1枚目は もんだい を押したら そのまま次へ、
  // 2枚目で だん を選んで「スタート」。スタートの位置は2枚で そろえる。
  // ブラウザの「戻る」と画面の「← もどる」で1つ前のメニュー画面へ戻れるようにする（2026-09-23）。
  // メニューの画面ごとに履歴を1つ積み、戻る操作は history.back() にそろえる
  function goStep(step) {
    history.pushState({ nkStep: step }, '');
    renderMenuStep(step);
  }
  function currentStep() {
    var st = history.state && history.state.nkStep;
    return typeof st === 'number' ? st : 1;
  }
  window.addEventListener('popstate', function () {
    // ページ内リンク（#faq など）の履歴は state を持たないので、メニューはそのままにする
    if (!history.state || typeof history.state.nkStep !== 'number') return;
    renderMenuStep(history.state.nkStep);
  });
  // プレイも履歴に1つ積む。プレイ・けっか から メニューへ戻るときは、直前のメニュー画面へ
  function pushPlay() {
    if (!(history.state && history.state.nkStep === 'play')) history.pushState({ nkStep: 'play' }, '');
  }
  function renderMenu() {
    if (history.state && history.state.nkStep === 'play') history.back();
    else renderMenuStep(currentStep());
  }

  // その画面で押したカード。画面に来たときは何も選んでいない状態から始め、
  // だん を押すまでスタートは押せない（2026-09-23。かんじ修行と同じ）
  var picked = null;

  function renderMenuStep(step, keep) {
    if (!keep) picked = null;
    state.session = null;
    app.innerHTML = '';
    var wrap = el('div', 'kk-menu is-step');
    var btn;
    if (step === 1) {
      wrap.appendChild(group('もんだい', MODES, 'modeId', 'kk-choices-column kk-choices-mode', 1));
      // スタートの場所だけ見えない形で取っておく
      btn = el('button', 'kk-start is-placeholder', 'スタート');
      btn.tabIndex = -1;
      btn.setAttribute('aria-hidden', 'true');
    } else {
      var mode = MODES.filter(function (m) { return m.id === state.modeId; })[0];
      wrap.appendChild(el('p', 'kk-menu-picked', mode.name));
      wrap.appendChild(group(null, DANS, 'danId', 'kk-choices-dan', 2));
      btn = el('button', 'kk-start', 'スタート');
      btn.addEventListener('click', startSession);
      if (!picked) btn.disabled = true;
    }
    btn.type = 'button';
    wrap.appendChild(btn);

    // 1枚目にも もどるボタンの場所だけ取っておく（スタートの位置を そろえるため）
    var back = el('button', 'kk-back', step === 1 ? '←' : '← もんだいに もどる');
    back.type = 'button';
    if (step === 1) {
      back.classList.add('is-placeholder');
      back.tabIndex = -1;
      back.setAttribute('aria-hidden', 'true');
    } else {
      back.addEventListener('click', function () { history.back(); });
    }
    wrap.appendChild(back);

    app.appendChild(wrap);
    if (window.NinjaLinks) app.appendChild(NinjaLinks.el('kuku'));
  }

  function group(title, items, key, gridCls, step) {
    var sec = el('section', 'kk-group');
    if (title) sec.appendChild(el('h2', 'kk-group-title', title));
    var grid = el('div', 'kk-choices ' + gridCls);
    items.forEach(function (item) {
      var btn = el('button', 'kk-choice');
      btn.type = 'button';
      if (item.img) {
        var img = el('img', 'kk-choice-img');
        img.src = item.img;
        img.alt = '';
        img.width = 160;
        img.height = 160;
        btn.appendChild(img);
      }
      btn.appendChild(el('span', 'kk-choice-label', item.name));
      btn.appendChild(el('span', 'kk-choice-note', item.note));
      if (picked && picked.key === key && picked.id === item.id) btn.classList.add('is-on');
      // もんだい を押したら そのまま だん の画面へ。だん は選ぶだけ
      btn.addEventListener('click', function () {
        state[key] = item.id;
        if (step === 1) return goStep(2);
        picked = { key: key, id: item.id };
        renderMenuStep(2, true);
      });
      grid.appendChild(btn);
    });
    sec.appendChild(grid);
    return sec;
  }

  function startSession() {
    pushPlay();
    var list = buildList(poolOf(state.danId));
    state.session = { list: list, total: list.length, index: 0, correct: 0, locked: false, q: null, missed: [] };
    nextQuestion();
  }

  function nextQuestion() {
    var s = state.session;
    if (s.index >= s.total) return renderResult();
    s.q = makeQuestion(s.list[s.index]);
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
    // こたえは書かない。まとまりを数えるところまでを見せ、答えは子どもに出させる（2026-09-16）
    box.appendChild(el('p', 'kk-dots-note', e.a + 'の まとまりが ' + e.b + 'こ あるから…'));
    return box;
  }

  function renderPlay() {
    var s = state.session, q = s.q;
    app.innerHTML = '';
    var wrap = el('div', 'kk-play');

    var head = el('div', 'kk-play-head nk-head');
    var mode = MODES.filter(function (m) { return m.id === state.modeId; })[0];
    var dan = DANS.filter(function (d) { return d.id === state.danId; })[0];
    head.innerHTML = NinjaHead.inner(s.index, s.total, s.correct, mode.name + (dan ? '・' + dan.name : ''));
    wrap.appendChild(head);

    var bar = el('div', 'kk-bar');
    var fill = el('div', 'kk-bar-fill');
    fill.style.width = (s.index / s.total * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    wrap.appendChild(el('p', 'kk-ask-label', 'こたえは?'));

    var ask = el('div', 'kk-ask kk-ask-' + q.askKind);
    ask.appendChild(el('p', 'kk-ask-main', q.ask));
    // ヒントは押しても減点しない。押さずに済むならそれが一番いい、という作りにはしない。
    var hint = el('button', 'kk-hint-btn');
    var hintIc = el('img', 'kk-ic');
    hintIc.src = '/assets/images/ninja/shuriken-on.webp';
    hintIc.width = 56; hintIc.height = 56; hintIc.alt = 'しゅりけん';
    hint.appendChild(hintIc);
    hint.appendChild(document.createTextNode(' で みる'));
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
    fb.textContent = (chosen.ok ? 'せいかい! ' : 'こたえは ') + e.q + ' ' + e.y + '
（' + shiki(e) + ' = ' + e.ans + '）';

    setTimeout(function () { if (state.session !== s) return; s.index++; nextQuestion(); }, chosen.ok ? 1400 : 2600);
  }

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    var wrap = el('div', 'kk-result');
    if (s.correct === s.total) wrap.classList.add('is-perfect');
    var rate = s.correct / s.total;  // じゅんばんは9もんなので、数ではなく割合で星を決める
    var stars = rate >= 1 ? 3 : rate >= .8 ? 2 : rate >= .5 ? 1 : 0;
    wrap.appendChild(el('p', 'kk-result-stars', '★★★☆☆☆'.slice(3 - stars, 6 - stars)));
    wrap.appendChild(el('p', 'kk-result-score', s.total + 'もんちゅう ' + s.correct + 'もん せいかい!'));
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

  history.replaceState({ nkStep: 1 }, '');
  renderMenuStep(1);
})();
