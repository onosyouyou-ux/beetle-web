/* ============================================================
   qa-quiz.js — QA用語クイズ
   出題データは qa-quiz-data.js（QA・バグ用語辞典の85語）。
   採点もふくめて全部ブラウザ内で完結し、サーバーには何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('qq-app');
  if (!app || typeof QA_TERMS === 'undefined') return;

  var SET_LENGTH = 10;

  var MODES = [
    { id: 'term2def', name: '用語 → 意味', note: '言葉から意味を選ぶ' },
    { id: 'def2term', name: '意味 → 用語', note: '説明から言葉を選ぶ' }
  ];

  // 範囲は辞典の章立てに合わせる（章が増えてもここは触らなくていい）
  var SECTIONS = (function () {
    var seen = [], out = [{ id: 'all', name: 'ぜんぶ', note: QA_TERMS.length + '語' }];
    QA_TERMS.forEach(function (t) {
      if (seen.indexOf(t.s) >= 0) return;
      seen.push(t.s);
      out.push({ id: t.s, name: t.s, note: QA_TERMS.filter(function (x) { return x.s === t.s; }).length + '語' });
    });
    return out;
  })();

  var state = { modeId: 'term2def', sectionId: 'all', session: null };

  /* ---------- 出題 ---------- */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pool() {
    if (state.sectionId === 'all') return QA_TERMS.slice();
    return QA_TERMS.filter(function (t) { return t.s === state.sectionId; });
  }

  // 誤答は「同じカテゴリの用語」を優先して混ぜる。
  // 無関係な言葉が並ぶと消去法で解けてしまい、練習にならないため。
  function distractors(answer, all, n) {
    var same = shuffle(all.filter(function (t) {
      return t.t !== answer.t && t.c === answer.c;
    }));
    var rest = shuffle(all.filter(function (t) {
      return t.t !== answer.t && t.c !== answer.c;
    }));
    return same.concat(rest).slice(0, n);
  }

  function makeSet() {
    var all = pool();
    var picked = shuffle(all.slice()).slice(0, Math.min(SET_LENGTH, all.length));
    return picked.map(function (answer) {
      var opts = shuffle([answer].concat(distractors(answer, all, 3)));
      return { answer: answer, options: opts };
    });
  }

  /* ---------- 画面 ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function group(title, items, key) {
    var sec = el('section', 'qq-group');
    sec.appendChild(el('h3', 'qq-group-title', title));
    var grid = el('div', 'qq-choices');
    items.forEach(function (item) {
      var btn = el('button', 'qq-choice');
      btn.type = 'button';
      btn.appendChild(el('span', 'qq-choice-label', item.name));
      btn.appendChild(el('span', 'qq-choice-note', item.note));
      if (state[key] === item.id) btn.classList.add('is-on');
      btn.addEventListener('click', function () { state[key] = item.id; renderMenu(); });
      grid.appendChild(btn);
    });
    sec.appendChild(grid);
    return sec;
  }

  function renderMenu() {
    app.innerHTML = '';
    var wrap = el('div', 'qq-menu');
    wrap.appendChild(group('といかた', MODES, 'modeId'));
    wrap.appendChild(group('範囲', SECTIONS, 'sectionId'));

    var n = pool().length;
    wrap.appendChild(el('p', 'qq-note', n + '語から ' + Math.min(SET_LENGTH, n) + '問を出します。'));

    var start = el('button', 'qq-start', 'スタート');
    start.type = 'button';
    start.addEventListener('click', startSession);
    wrap.appendChild(start);

    app.appendChild(wrap);
  }

  function startSession() {
    state.session = { qs: makeSet(), index: 0, correct: 0, locked: false, missed: [] };
    renderPlay();
  }

  function optionText(t) {
    return state.modeId === 'term2def' ? t.d : t.t;
  }

  function renderPlay() {
    var s = state.session;
    var q = s.qs[s.index];
    app.innerHTML = '';
    var wrap = el('div', 'qq-play');

    var head = el('div', 'qq-play-head');
    head.appendChild(el('span', 'qq-play-count', (s.index + 1) + ' / ' + s.qs.length));
    head.appendChild(el('span', 'qq-play-score', '正解 ' + s.correct));
    wrap.appendChild(head);

    var bar = el('div', 'qq-bar');
    var fill = el('div', 'qq-bar-fill');
    fill.style.width = (s.index / s.qs.length * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    if (state.modeId === 'term2def') {
      wrap.appendChild(el('p', 'qq-ask', 'この用語の意味は？'));
      var stage = el('div', 'qq-stage');
      stage.appendChild(el('span', 'qq-stage-term', q.answer.t));
      stage.appendChild(el('span', 'qq-stage-read', q.answer.r));
      wrap.appendChild(stage);
    } else {
      wrap.appendChild(el('p', 'qq-ask', 'この説明にあてはまる用語は？'));
      var stage2 = el('div', 'qq-stage qq-stage-def');
      stage2.appendChild(el('span', 'qq-stage-deftext', q.answer.d));
      wrap.appendChild(stage2);
    }

    var options = el('div', 'qq-options qq-options-' + state.modeId);
    q.options.forEach(function (o) {
      var b = el('button', 'qq-opt', optionText(o));
      b.type = 'button';
      b.addEventListener('click', function () { choose(o, b, options); });
      options.appendChild(b);
    });
    wrap.appendChild(options);

    wrap.appendChild(el('div', 'qq-feedback'));

    var back = el('button', 'qq-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  function choose(chosen, btn, options) {
    var s = state.session;
    if (s.locked) return;
    s.locked = true;
    var q = s.qs[s.index];
    var ok = chosen.t === q.answer.t;
    if (ok) s.correct++; else s.missed.push({ term: q.answer, chosen: chosen });

    Array.prototype.forEach.call(options.querySelectorAll('.qq-opt'), function (b, i) {
      b.disabled = true;
      if (q.options[i].t === q.answer.t) b.classList.add('is-correct');
    });
    if (!ok) btn.classList.add('is-wrong');

    var fb = app.querySelector('.qq-feedback');
    fb.className = 'qq-feedback ' + (ok ? 'is-ok' : 'is-ng');
    fb.textContent = ok
      ? '正解 — ' + q.answer.t
      : '正解は「' + q.answer.t + '」。選んだのは「' + chosen.t + '」（' + chosen.d + '）';

    var next = el('button', 'qq-next', s.index + 1 >= s.qs.length ? '結果を見る →' : '次の問題 →');
    next.type = 'button';
    next.addEventListener('click', function () {
      s.index++;
      if (s.index >= s.qs.length) renderResult(); else renderPlay();
    });
    fb.appendChild(next);
    next.focus();
  }

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    var wrap = el('div', 'qq-result');

    var pct = Math.round(s.correct / s.qs.length * 100);
    wrap.appendChild(el('p', 'qq-result-score', s.qs.length + '問中 ' + s.correct + '問 正解（' + pct + '%）'));
    wrap.appendChild(el('p', 'qq-result-msg',
      pct === 100 ? '全問正解。用語で詰まることはもう無さそうです。'
        : pct >= 80 ? 'あと少し。取りこぼした言葉だけ辞典で読み直すと固まります。'
          : pct >= 50 ? '半分は入っています。まちがえた言葉から埋めていきましょう。'
            : 'まずは「テストの基本」の範囲だけを繰り返すのがおすすめです。'));

    if (s.missed.length) {
      var box = el('div', 'qq-missed');
      box.appendChild(el('h3', null, 'まちがえた用語（' + s.missed.length + '語）'));
      s.missed.forEach(function (m) {
        var item = el('div', 'qq-missed-item');
        item.appendChild(el('span', 'qq-missed-term', m.term.t));
        item.appendChild(el('span', 'qq-missed-def', m.term.d));
        box.appendChild(item);
      });
      var link = el('p', 'qq-missed-link');
      link.innerHTML = 'くわしくは <a href="/tools/glossary/">QA・バグ用語辞典</a> で読み直せます。';
      box.appendChild(link);
      wrap.appendChild(box);
    } else {
      var p = el('p', 'qq-missed-link');
      p.innerHTML = '取りこぼしなし。ほかの範囲や <a href="/tools/glossary/">用語辞典</a> もどうぞ。';
      wrap.appendChild(p);
    }

    var again = el('button', 'qq-start', 'もう一度');
    again.type = 'button';
    again.addEventListener('click', startSession);
    wrap.appendChild(again);

    var back = el('button', 'qq-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  renderMenu();
})();
