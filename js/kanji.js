/* ============================================================
   kanji.js — かんじ修行（学年別）
   出題データは js/kanji-data.js（window.KANJI_DATA）だけを見る。
   学年を足すときはデータ側に追記すればよく、ここは変えなくてよい。
   出題も採点もブラウザ内で完結し、サーバーには何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('kj-app');
  if (!app || !window.KANJI_DATA) return;

  var DATA = window.KANJI_DATA;
  var SET_LENGTH = 10;

  // データにある学年から選択肢を組み立てる（学年が増えたら自動で増える）
  var GRADES = (function () {
    var gs = [];
    DATA.forEach(function (e) { if (gs.indexOf(e.g) < 0) gs.push(e.g); });
    gs.sort(function (a, b) { return a - b; });
    var list = gs.map(function (g) {
      var n = DATA.filter(function (e) { return e.g === g; }).length;
      return { id: 'g' + g, name: '小' + g + 'で ならう かんじ', note: n + 'じ', grades: [g] };
    });
    if (gs.length > 1) {
      list.push({ id: 'all', name: 'ぜんぶ まとめて', note: DATA.length + 'じ', grades: gs });
    }
    return list;
  })();

  var MODES = [
    { id: 'yomi', name: 'かんじを よむ しゅぎょう', note: 'かんじの ことば → よみかたを えらぶ' },
    { id: 'kanji', name: 'かんじに する しゅぎょう', note: 'よみかた → かんじの ことばを えらぶ' }
  ];

  var state = { gradeId: GRADES[0].id, modeId: 'yomi', session: null };

  var randInt = function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var pick = function (a) { return a[randInt(0, a.length - 1)]; };

  function poolOf(gradeId) {
    var g = GRADES.filter(function (x) { return x.id === gradeId; })[0] || GRADES[0];
    return DATA.filter(function (e) { return g.grades.indexOf(e.g) >= 0; });
  }

  /* ---------- 出題 ---------- */

  function makeQuestion(pool) {
    var entry = pick(pool);
    var wi = randInt(0, entry.w.length - 1);
    var word = entry.w[wi][0], yomi = entry.w[wi][1];

    if (state.modeId === 'yomi') {
      var opts = [{ v: yomi, ok: true }];
      var seen = {};
      seen[yomi] = true;
      // ① 同じ漢字の別のことばの よみ（音と訓の取りちがえ）
      entry.w.forEach(function (pair, i) {
        if (i === wi || seen[pair[1]] || opts.length >= 4) return;
        seen[pair[1]] = true;
        opts.push({ v: pair[1], ok: false, why: 'おなじ かんじの べつの よみ' });
      });
      // ② おなじ長さの よみ（あてずっぽうで消せないようにする）
      var others = [];
      pool.forEach(function (e) {
        if (e.k === entry.k) return;
        e.w.forEach(function (pair) {
          if (!seen[pair[1]] && Math.abs(pair[1].length - yomi.length) <= 1) others.push(pair[1]);
        });
      });
      shuffle(others).forEach(function (v) {
        if (opts.length >= 4 || seen[v]) return;
        seen[v] = true;
        opts.push({ v: v, ok: false });
      });
      return { ask: word, askKind: 'word', options: shuffle(opts), answer: yomi, kanji: entry.k };
    }

    // よみ → ことば（かんじ）
    var kOpts = [{ v: word, ok: true }];
    var kSeen = {};
    kSeen[word] = true;
    var cand = [];
    pool.forEach(function (e) {
      e.w.forEach(function (pair) {
        if (kSeen[pair[0]]) return;
        // 同じよみのことば（日＝ひ／火＝ひ）を混ぜると正解が2つになってしまう
        if (pair[1] === yomi) return;
        // 同じ長さのことばを優先して、字数だけで当てられないようにする
        cand.push({ v: pair[0], sameLen: pair[0].length === word.length, sameKanji: e.k === entry.k });
      });
    });
    cand.sort(function (a, b) {
      return (b.sameKanji - a.sameKanji) * 2 + (b.sameLen - a.sameLen);
    });
    var head = shuffle(cand.slice(0, 24));
    head.forEach(function (c) {
      if (kOpts.length >= 4 || kSeen[c.v]) return;
      kSeen[c.v] = true;
      kOpts.push({ v: c.v, ok: false });
    });
    return { ask: yomi, askKind: 'yomi', options: shuffle(kOpts), answer: word, kanji: entry.k };
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
    var wrap = el('div', 'kj-menu');
    wrap.appendChild(group('がくねん', GRADES, 'gradeId', true));
    wrap.appendChild(group('といかた', MODES, 'modeId', true));

    var start = el('button', 'kj-start', 'スタート');
    start.type = 'button';
    start.addEventListener('click', startSession);
    wrap.appendChild(start);
    app.appendChild(wrap);
  }

  function group(title, items, key, column) {
    var sec = el('section', 'kj-group');
    sec.appendChild(el('h2', 'kj-group-title', title));
    var grid = el('div', column ? 'kj-choices kj-choices-column' : 'kj-choices');
    items.forEach(function (item) {
      var btn = el('button', 'kj-choice');
      btn.type = 'button';
      btn.appendChild(el('span', 'kj-choice-label', item.name));
      btn.appendChild(el('span', 'kj-choice-note', item.note));
      if (state[key] === item.id) btn.classList.add('is-on');
      btn.addEventListener('click', function () { state[key] = item.id; renderMenu(); });
      grid.appendChild(btn);
    });
    sec.appendChild(grid);
    return sec;
  }

  function startSession() {
    state.session = { pool: poolOf(state.gradeId), index: 0, correct: 0, locked: false, q: null, missed: [] };
    nextQuestion();
  }

  function nextQuestion() {
    var s = state.session;
    if (s.index >= SET_LENGTH) return renderResult();
    s.q = makeQuestion(s.pool);
    s.locked = false;
    renderPlay();
  }

  function renderPlay() {
    var s = state.session, q = s.q;
    app.innerHTML = '';
    var wrap = el('div', 'kj-play');

    var head = el('div', 'kj-play-head');
    head.appendChild(el('span', null, (s.index + 1) + ' / ' + SET_LENGTH));
    head.appendChild(el('span', null, 'せいかい ' + s.correct));
    wrap.appendChild(head);

    var bar = el('div', 'kj-bar');
    var fill = el('div', 'kj-bar-fill');
    fill.style.width = (s.index / SET_LENGTH * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    wrap.appendChild(el('p', 'kj-ask-label',
      q.askKind === 'word' ? 'なんと よむ?' : 'この よみの ことばは どれ?'));
    wrap.appendChild(el('p', q.askKind === 'word' ? 'kj-ask kj-ask-word' : 'kj-ask kj-ask-yomi', q.ask));

    var options = el('div', 'kj-options');
    q.options.forEach(function (o) {
      var b = el('button', 'kj-opt', o.v);
      b.type = 'button';
      b.addEventListener('click', function () { choose(o, b, options); });
      options.appendChild(b);
    });
    wrap.appendChild(options);
    wrap.appendChild(el('div', 'kj-feedback'));

    var back = el('button', 'kj-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);
    app.appendChild(wrap);
  }

  function choose(chosen, btn, options) {
    var s = state.session;
    if (s.locked) return;
    s.locked = true;
    var q = s.q;
    if (chosen.ok) s.correct++;
    else s.missed.push(q.askKind === 'word' ? q.ask + '（' + q.answer + '）' : q.answer + '（' + q.ask + '）');

    Array.prototype.forEach.call(options.querySelectorAll('.kj-opt'), function (b, i) {
      b.disabled = true;
      if (q.options[i].ok) b.classList.add('is-correct');
    });
    if (!chosen.ok) btn.classList.add('is-wrong');

    var fb = app.querySelector('.kj-feedback');
    fb.className = 'kj-feedback ' + (chosen.ok ? 'is-ok' : 'is-ng');
    fb.textContent = chosen.ok
      ? 'せいかい! ' + (q.askKind === 'word' ? q.ask + ' → ' + q.answer : q.answer)
      : 'こたえは ' + q.answer + (chosen.why ? '（' + chosen.why + '）' : '');

    setTimeout(function () { s.index++; nextQuestion(); }, chosen.ok ? 1000 : 1900);
  }

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    var wrap = el('div', 'kj-result');
    var stars = s.correct >= 10 ? 3 : s.correct >= 8 ? 2 : s.correct >= 5 ? 1 : 0;
    wrap.appendChild(el('p', 'kj-result-stars', '★★★☆☆☆'.slice(3 - stars, 6 - stars)));
    wrap.appendChild(el('p', 'kj-result-score', SET_LENGTH + 'もんちゅう ' + s.correct + 'もん せいかい!'));
    if (s.missed.length) {
      wrap.appendChild(el('p', 'kj-result-msg', 'まちがえた ことば'));
      var list = el('div', 'kj-missed');
      s.missed.forEach(function (m) { list.appendChild(el('span', 'kj-missed-item', m)); });
      wrap.appendChild(list);
    } else {
      wrap.appendChild(el('p', 'kj-result-msg', 'ぜんもん せいかい! かんじマスター!'));
    }

    var again = el('button', 'kj-start', 'もういちど');
    again.type = 'button';
    again.addEventListener('click', startSession);
    wrap.appendChild(again);

    var back = el('button', 'kj-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);
    app.appendChild(wrap);
  }

  renderMenu();
})();
