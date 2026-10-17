/* ============================================================
   nenpyo.js — 年表修行（#168）。歴史の年号を 4択で練習する
   データは js/nenpyo-data.js（NENPYO_DATA）。ここは その形しか知らない。

   メニューは2まい。
   1まいめ：がっこう（しょうがっこう／ちゅうがっこう）。押すと そのまま 2まいめへ
   2まいめ：とき方（年号→できごと／できごと→年号／まぜて）と じだい。両方 えらぶまで スタートは押せない

   盤面と けっか の見た目は かけざん修行の部品（kk-）を借りる。窓は nk-modal.js、
   見出しは NinjaHead、まちがえたときの「つぎへ」は NkWrongNext（どれも ninja-links.js）。
   語呂合わせは 問題文に出さず、まちがえたときの せつめいに だけ出す（語呂がないと 答えられない子に しないため）
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('kk-app');
  var DATA = window.NENPYO_DATA;
  if (!app || !DATA) return;

  var COUNT = 10;

  var SCHOOLS = [
    { id: 'sho', name: 'しょうがっこう', note: '小6の 社会。人物と 大きな できごと' },
    { id: 'chu', name: 'ちゅうがっこう', note: '中学の 歴史。小学校の 分も ぜんぶ 出る' }
  ];
  var MODES = [
    { id: 'year', name: '年号 → できごと', note: '「1185年」→ なにが あった？' },
    { id: 'event', name: 'できごと → 年号', note: '「鎌倉幕府」→ 何年？' },
    { id: 'mix', name: 'まぜて とく', note: 'どちらも 出る' }
  ];
  var BANDS = [
    { id: 'kodai', name: '古代〜平安', note: '卑弥呼・聖徳太子・平安京' },
    { id: 'bushi', name: '鎌倉〜江戸', note: '幕府・戦国・開国' },
    { id: 'kindai', name: '明治〜いま', note: '憲法・戦争・オリンピック' },
    { id: 'all', name: 'ぜんぶ', note: 'すべての じだいから' }
  ];

  var state = { school: null, mode: null, band: null, session: null };

  /* ---------- 問題づくり ---------- */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function poolOf(school, band) {
    return DATA.filter(function (d) {
      return (school === 'chu' || !d.chu) && (band === 'all' || d.band === band);
    });
  }

  // まちがいの選択肢は 年が近い できごとから。遠すぎると 時代だけで 当てられてしまう
  function nearest(pool, d, n) {
    return pool.filter(function (x) { return x.y !== d.y; })
      .sort(function (a, b) { return Math.abs(a.y - d.y) - Math.abs(b.y - d.y); })
      .slice(0, n);
  }

  function makeQuestion(pool, d, kind) {
    var wrongs = shuffle(nearest(pool, d, 6)).slice(0, 3);
    var opts = shuffle([d].concat(wrongs)).map(function (x) {
      return { v: kind === 'year' ? x.e : String(x.y), ok: x === d };
    });
    return {
      d: d, kind: kind, options: opts,
      prompt: kind === 'year' ? 'この年の できごとは?' : '何年?',
      ask: kind === 'year' ? d.y + '年' : d.e,
      answer: kind === 'year' ? d.e : d.y + '年'
    };
  }

  function buildList() {
    var pool = poolOf(state.school, state.band);
    return shuffle(pool.slice()).slice(0, COUNT).map(function (d, i) {
      var kind = state.mode === 'mix' ? (i % 2 ? 'event' : 'year') : state.mode;
      return makeQuestion(pool, d, kind);
    });
  }

  /* ---------- 画面 ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function itemOf(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

  function group(title, items, key, gridCls, onPick) {
    var sec = el('section', 'kk-group');
    if (title) sec.appendChild(el('h2', 'kk-group-title', title));
    var grid = el('div', 'kk-choices ' + gridCls);
    items.forEach(function (item) {
      var btn = el('button', 'kk-choice');
      btn.type = 'button';
      btn.appendChild(el('span', 'kk-choice-label', item.name));
      btn.appendChild(el('span', 'kk-choice-note', item.note));
      if (state[key] === item.id) btn.classList.add('is-on');
      btn.addEventListener('click', function () { state[key] = item.id; onPick(); });
      grid.appendChild(btn);
    });
    sec.appendChild(grid);
    return sec;
  }

  function currentStep() { return history.state && history.state.nkStep === 'menu2' ? 2 : 1; }

  function renderMenu() {
    if (history.state && history.state.nkStep === 'play') history.back();
    else renderMenuStep(currentStep());
  }

  function renderMenuStep(step) {
    NkModal.close();
    state.session = null;
    app.innerHTML = '';
    var wrap = el('div', 'kk-menu is-step ny-menu');
    var btn, back;
    if (step === 1) {
      // がっこう を えらびなおすときは、とき方・じだい も えらびなおし
      state.school = state.mode = state.band = null;
      wrap.appendChild(group('どの がっこうの 年表？', SCHOOLS, 'school', 'ny-choices-school', function () {
        history.pushState({ nkStep: 'menu2' }, '');
        renderMenuStep(2);
      }));
      btn = el('button', 'kk-start is-placeholder', 'スタート');
      btn.tabIndex = -1;
      btn.setAttribute('aria-hidden', 'true');
      back = el('a', 'kk-back nk-applist', '← アプリいちらんに もどる');
      back.href = '/edu-tools.html#kids';
    } else {
      wrap.appendChild(el('p', 'kk-menu-picked', itemOf(SCHOOLS, state.school).name));
      var redraw = function () { renderMenuStep(2); };
      wrap.appendChild(group('とき方', MODES, 'mode', 'ny-choices-mode', redraw));
      wrap.appendChild(group('じだい', BANDS, 'band', 'ny-choices-band', redraw));
      btn = el('button', 'kk-start', 'スタート');
      btn.addEventListener('click', startSession);
      if (!state.mode || !state.band) btn.disabled = true;
      back = el('button', 'kk-back', '← がっこうを えらびなおす');
      back.type = 'button';
      back.addEventListener('click', function () { history.back(); });
    }
    btn.type = 'button';
    wrap.appendChild(btn);
    wrap.appendChild(back);
    app.appendChild(wrap);
    if (window.NinjaLinks) app.appendChild(NinjaLinks.el('nenpyo'));
  }

  window.addEventListener('popstate', function () {
    var st = history.state && history.state.nkStep;
    if (st === 'menu') renderMenuStep(1);
    else if (st === 'menu2') {
      // もどってきたときも 何も えらんでいない ところから（修行アプリ共通の約束）
      state.mode = state.band = null;
      if (state.school) renderMenuStep(2);
      else { history.replaceState({ nkStep: 'menu' }, ''); renderMenuStep(1); }
    }
  });

  function startSession() {
    if (!(history.state && history.state.nkStep === 'play')) history.pushState({ nkStep: 'play' }, '');
    NkModal.open(app, { onClose: renderMenu });
    var list = buildList();
    state.session = { list: list, total: list.length, index: 0, correct: 0, locked: false, missed: [] };
    if (window.NkTrack) NkTrack('mode_select', { app: 'nenpyo', mode: state.mode, level: state.school + ':' + state.band });
    renderPlay();
  }

  function playTitle() {
    return itemOf(SCHOOLS, state.school).name + '・' + itemOf(BANDS, state.band).name;
  }

  function renderPlay() {
    var s = state.session;
    if (s.index >= s.total) return renderResult();
    var q = s.list[s.index];
    s.locked = false;
    app.innerHTML = '';
    var wrap = el('div', 'kk-play ny-play is-text');

    var head = el('div', 'kk-play-head nk-head');
    head.innerHTML = NinjaHead.inner(s.index, s.total, s.correct, playTitle());
    wrap.appendChild(head);

    var bar = el('div', 'kk-bar');
    var fill = el('div', 'kk-bar-fill');
    fill.style.width = (s.index / s.total * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    wrap.appendChild(el('p', 'kk-ask-label', q.prompt));
    var ask = el('div', 'kk-ask ny-ask ny-ask-' + q.kind);
    ask.appendChild(el('p', 'kk-ask-main', q.ask));
    wrap.appendChild(ask);

    var options = el('div', 'kk-options ny-options ny-options-' + q.kind);
    q.options.forEach(function (o) {
      var b = el('button', 'kk-opt');
      b.type = 'button';
      b.appendChild(el('span', 'nk-answer-label', o.v));
      b.addEventListener('click', function () { choose(o, b, options, q); });
      options.appendChild(b);
    });
    wrap.appendChild(options);
    wrap.appendChild(el('div', 'kk-feedback'));
    app.appendChild(wrap);
  }

  function choose(chosen, btn, options, q) {
    var s = state.session;
    if (s.locked) return;
    s.locked = true;
    if (chosen.ok) s.correct++;
    else s.missed.push(q.d.y + '年　' + q.d.e);
    Array.prototype.forEach.call(options.querySelectorAll('.kk-opt'), function (b, i) {
      b.disabled = true;
      if (q.options[i].ok) b.classList.add('is-correct');
    });
    if (!chosen.ok) btn.classList.add('is-wrong');
    NinjaHead.score(app, s.correct);

    var fb = app.querySelector('.kk-feedback');
    fb.className = 'kk-feedback ' + (chosen.ok ? 'is-ok' : 'is-ng');
    fb.textContent = (chosen.ok ? 'せいかい! ' : '正解は ') + q.answer;
    var go = function () { if (state.session !== s) return; s.index++; renderPlay(); };
    if (!chosen.ok) {
      var lines = ['正解は ' + q.d.y + '年　' + q.d.e, q.d.era + '。' + (q.d.note || '')];
      if (q.d.goro) lines.push('おぼえかた：' + q.d.goro);
      NkWrongNext({ fb: fb, options: options, go: go, lines: lines });
      return;
    }
    setTimeout(go, 1400);
  }

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    if (window.NkTrack) NkTrack('set_complete', { app: 'nenpyo', mode: state.mode, level: state.school + ':' + state.band, score: s.correct, total: s.total });
    var wrap = el('div', 'kk-result');
    if (s.correct === s.total) wrap.classList.add('is-perfect');
    var rate = s.correct / s.total;
    var stars = rate >= 1 ? 3 : rate >= .8 ? 2 : rate >= .5 ? 1 : 0;
    wrap.appendChild(el('p', 'kk-result-stars', '★★★☆☆☆'.slice(3 - stars, 6 - stars)));
    wrap.appendChild(el('p', 'kk-result-score', s.total + 'もんちゅう ' + s.correct + 'もん せいかい!'));
    if (s.missed.length) {
      wrap.appendChild(el('p', 'kk-result-msg', 'まちがえた もんだい'));
      var list = el('div', 'kk-missed');
      s.missed.forEach(function (m) { list.appendChild(el('span', 'kk-missed-item', m)); });
      wrap.appendChild(list);
    } else {
      wrap.appendChild(el('p', 'kk-result-msg', 'ぜんもん せいかい! 年表 めいじん!'));
    }
    var again = el('button', 'kk-start', 'もういちど');
    again.type = 'button';
    again.addEventListener('click', function () {
      // 同じ じょうけんで 問題を 引きなおす
      var list = buildList();
      state.session = { list: list, total: list.length, index: 0, correct: 0, locked: false, missed: [] };
      if (window.NkTrack) NkTrack('mode_select', { app: 'nenpyo', mode: state.mode, level: state.school + ':' + state.band });
      renderPlay();
    });
    wrap.appendChild(again);
    var back = el('button', 'kk-back', '← もんだいせんたくに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);
    app.appendChild(wrap);
  }

  history.replaceState({ nkStep: 'menu' }, '');
  renderMenuStep(1);
})();
