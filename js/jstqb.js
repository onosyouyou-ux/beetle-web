/* ============================================================
   jstqb.js — テスト技術者資格 練習問題

   2つのモードを持つ。
   - 章別モード：章を選んで10問。1問ごとに解説を出す（覚えるための使い方）
   - 模試モード：40問・60分。途中では答えを見せず、最後にまとめて採点する
     （本番と同じ体裁にしないと、時間配分の練習にならないため）

   出題データは jstqb-data.js。採点も計時もブラウザ内で完結する。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('jq-app');
  if (!app || typeof JSTQB_Q === 'undefined') return;

  var EXAM_TOTAL = 40;        // 本番と同じ問題数
  var EXAM_PASS = 26;         // 合格ライン（65%）
  var EXAM_MINUTES = 60;      // 本番と同じ試験時間
  var CHAPTER_SET = 10;       // 章別モードの1セット

  var state = { session: null, timerId: null };

  /* ---------- 小道具 ---------- */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function chapterOf(n) {
    for (var i = 0; i < JSTQB_CHAPTERS.length; i++) {
      if (JSTQB_CHAPTERS[i].n === n) return JSTQB_CHAPTERS[i];
    }
    return { n: n, name: '第' + n + '章' };
  }

  // 出題ごとに選択肢を並べ替える。答えの位置を覚えてしまわないようにするため、
  // 正解の中身を持ち回って、並べ替えたあとの位置を引き直す。
  function prepare(q) {
    var correctText = q.o[q.a];
    var opts = shuffle(q.o.slice());
    return { src: q, ch: q.ch, q: q.q, o: opts, a: opts.indexOf(correctText), why: q.why };
  }

  function stopTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  }

  /* ---------- メニュー ---------- */

  function renderMenu() {
    stopTimer();
    app.innerHTML = '';
    var wrap = el('div', 'jq-menu');

    // 模試モード
    var examBox = el('section', 'jq-mode-box');
    examBox.appendChild(el('h3', 'jq-mode-title', '模試モード'));
    examBox.appendChild(el('p', 'jq-mode-desc',
      EXAM_TOTAL + '問・' + EXAM_MINUTES + '分。本番と同じ問題数と時間で、章ごとの出題数も本番の配分に寄せています。' +
      '途中では答えを出さず、最後にまとめて採点します（' + EXAM_PASS + '問正解で合格ラインです）。'));
    var examBtn = el('button', 'jq-start', '模試を始める');
    examBtn.type = 'button';
    examBtn.addEventListener('click', startExam);
    examBox.appendChild(examBtn);
    wrap.appendChild(examBox);

    // 章別モード
    var chBox = el('section', 'jq-mode-box');
    chBox.appendChild(el('h3', 'jq-mode-title', '章別モード'));
    chBox.appendChild(el('p', 'jq-mode-desc',
      '章を選んで' + CHAPTER_SET + '問。1問ごとに解説が出ます。弱い章を潰すときはこちらから。'));
    var grid = el('div', 'jq-chapters');
    JSTQB_CHAPTERS.forEach(function (c) {
      var n = JSTQB_Q.filter(function (q) { return q.ch === c.n; }).length;
      var btn = el('button', 'jq-chapter');
      btn.type = 'button';
      btn.appendChild(el('span', 'jq-chapter-n', '第' + c.n + '章'));
      btn.appendChild(el('span', 'jq-chapter-name', c.name));
      btn.appendChild(el('span', 'jq-chapter-note', c.note + '／' + n + '問'));
      btn.addEventListener('click', function () { startChapter(c.n); });
      grid.appendChild(btn);
    });
    chBox.appendChild(grid);
    wrap.appendChild(chBox);

    wrap.appendChild(el('p', 'jq-menu-note',
      '収録' + JSTQB_Q.length + '問。問題・選択肢・解説はすべて当サイトが独自に作成したもので、' +
      '試験団体が公開しているシラバス本文やサンプル問題は使用していません。'));

    app.appendChild(wrap);
  }

  /* ---------- 章別モード ---------- */

  function startChapter(chN) {
    var pool = JSTQB_Q.filter(function (q) { return q.ch === chN; });
    var picked = shuffle(pool.slice()).slice(0, Math.min(CHAPTER_SET, pool.length)).map(prepare);
    state.session = { mode: 'chapter', ch: chN, qs: picked, index: 0, correct: 0, locked: false, answers: [] };
    renderChapterPlay();
  }

  function renderChapterPlay() {
    var s = state.session;
    var q = s.qs[s.index];
    s.locked = false;   // 問題を出すたびに解除する
    app.innerHTML = '';
    var wrap = el('div', 'jq-play');

    var head = el('div', 'jq-play-head');
    head.appendChild(el('span', 'jq-play-count', (s.index + 1) + ' / ' + s.qs.length));
    head.appendChild(el('span', 'jq-play-score', '正解 ' + s.correct));
    wrap.appendChild(head);

    var bar = el('div', 'jq-bar');
    var fill = el('div', 'jq-bar-fill');
    fill.style.width = (s.index / s.qs.length * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    wrap.appendChild(el('span', 'jq-tag', '第' + q.ch + '章 ' + chapterOf(q.ch).name));
    wrap.appendChild(el('p', 'jq-q', q.q));

    var options = el('div', 'jq-options');
    q.o.forEach(function (text, i) {
      var b = el('button', 'jq-opt');
      b.type = 'button';
      b.appendChild(el('span', 'jq-opt-mark', String.fromCharCode(65 + i)));
      b.appendChild(el('span', 'jq-opt-text', text));
      b.addEventListener('click', function () { answerChapter(i, b, options); });
      options.appendChild(b);
    });
    wrap.appendChild(options);
    wrap.appendChild(el('div', 'jq-feedback'));

    var back = el('button', 'jq-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  function answerChapter(chosen, btn, options) {
    var s = state.session;
    if (s.locked) return;
    s.locked = true;
    var q = s.qs[s.index];
    var ok = chosen === q.a;
    if (ok) s.correct++;
    s.answers.push(chosen);

    Array.prototype.forEach.call(options.querySelectorAll('.jq-opt'), function (b, i) {
      b.disabled = true;
      if (i === q.a) b.classList.add('is-correct');
    });
    if (!ok) btn.classList.add('is-wrong');

    var fb = app.querySelector('.jq-feedback');
    fb.className = 'jq-feedback ' + (ok ? 'is-ok' : 'is-ng');
    fb.appendChild(el('p', 'jq-fb-head', ok ? '正解' : '不正解 — 正解は ' + String.fromCharCode(65 + q.a)));
    fb.appendChild(el('p', 'jq-fb-why', q.why));

    var next = el('button', 'jq-next', s.index + 1 >= s.qs.length ? '結果を見る →' : '次の問題 →');
    next.type = 'button';
    next.addEventListener('click', function () {
      s.index++;
      if (s.index >= s.qs.length) renderChapterResult(); else renderChapterPlay();
    });
    fb.appendChild(next);
    next.focus();
  }

  function renderChapterResult() {
    var s = state.session;
    app.innerHTML = '';
    var wrap = el('div', 'jq-result');
    var pct = Math.round(s.correct / s.qs.length * 100);

    wrap.appendChild(el('p', 'jq-result-lead', '第' + s.ch + '章 ' + chapterOf(s.ch).name));
    wrap.appendChild(el('p', 'jq-result-score', s.qs.length + '問中 ' + s.correct + '問 正解（' + pct + '%）'));
    wrap.appendChild(el('p', 'jq-result-msg',
      pct >= 90 ? 'この章は仕上がっています。ほかの章か模試へ進んでください。'
        : pct >= 65 ? '合格ラインの水準です。落とした問題の解説だけ読み返しておきましょう。'
          : 'この章はもう何周かしたほうが得です。解説を読んでから、続けて回してみてください。'));

    var missed = [];
    s.qs.forEach(function (q, i) { if (s.answers[i] !== q.a) missed.push({ q: q, chosen: s.answers[i] }); });
    if (missed.length) wrap.appendChild(reviewBox('まちがえた問題（' + missed.length + '問）', missed));

    var again = el('button', 'jq-start', 'もう一度この章を解く');
    again.type = 'button';
    again.addEventListener('click', function () { startChapter(s.ch); });
    wrap.appendChild(again);

    var back = el('button', 'jq-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  /* ---------- 模試モード ---------- */

  // 章ごとの出題数は JSTQB_CHAPTERS の exam（合計40）に従う
  function buildExamSet() {
    var qs = [];
    JSTQB_CHAPTERS.forEach(function (c) {
      var pool = shuffle(JSTQB_Q.filter(function (q) { return q.ch === c.n; }));
      qs = qs.concat(pool.slice(0, c.exam));
    });
    // 章の配分より収録数が少ない場合の保険（残りは全体から補う）
    if (qs.length < EXAM_TOTAL) {
      var rest = shuffle(JSTQB_Q.filter(function (q) { return qs.indexOf(q) < 0; }));
      qs = qs.concat(rest.slice(0, EXAM_TOTAL - qs.length));
    }
    return shuffle(qs.slice(0, EXAM_TOTAL)).map(prepare);
  }

  function startExam() {
    stopTimer();
    var qs = buildExamSet();
    state.session = {
      mode: 'exam', qs: qs, index: 0,
      answers: qs.map(function () { return null; }),
      flags: qs.map(function () { return false; }),
      endAt: Date.now() + EXAM_MINUTES * 60 * 1000,
      finished: false
    };
    state.timerId = setInterval(tickExam, 1000);
    renderExamPlay();
  }

  function tickExam() {
    var s = state.session;
    if (!s || s.mode !== 'exam' || s.finished) { stopTimer(); return; }
    var left = s.endAt - Date.now();
    if (left <= 0) { stopTimer(); finishExam(true); return; }
    var t = app.querySelector('.jq-timer');
    if (t) {
      var sec = Math.floor(left / 1000);
      var mm = Math.floor(sec / 60), ss = sec % 60;
      t.textContent = '残り ' + mm + ':' + (ss < 10 ? '0' : '') + ss;
      t.className = 'jq-timer' + (left < 5 * 60 * 1000 ? ' is-low' : '');
    }
  }

  function renderExamPlay() {
    var s = state.session;
    var q = s.qs[s.index];
    app.innerHTML = '';
    var wrap = el('div', 'jq-play jq-exam');

    var head = el('div', 'jq-play-head');
    head.appendChild(el('span', 'jq-play-count', (s.index + 1) + ' / ' + s.qs.length));
    head.appendChild(el('span', 'jq-timer', '残り --:--'));
    wrap.appendChild(head);

    var answered = s.answers.filter(function (a) { return a !== null; }).length;
    var bar = el('div', 'jq-bar');
    var fill = el('div', 'jq-bar-fill');
    fill.style.width = (answered / s.qs.length * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    wrap.appendChild(el('span', 'jq-tag', '第' + q.ch + '章 ' + chapterOf(q.ch).name));
    wrap.appendChild(el('p', 'jq-q', q.q));

    var options = el('div', 'jq-options');
    q.o.forEach(function (text, i) {
      var b = el('button', 'jq-opt');
      b.type = 'button';
      b.appendChild(el('span', 'jq-opt-mark', String.fromCharCode(65 + i)));
      b.appendChild(el('span', 'jq-opt-text', text));
      if (s.answers[s.index] === i) b.classList.add('is-picked');
      // 模試では正誤を出さない。選び直しも自由にできる
      b.addEventListener('click', function () {
        s.answers[s.index] = i;
        renderExamPlay();
      });
      options.appendChild(b);
    });
    wrap.appendChild(options);

    var navRow = el('div', 'jq-exam-nav');
    var prev = el('button', 'jq-sub', '← 前へ');
    prev.type = 'button';
    prev.disabled = s.index === 0;
    prev.addEventListener('click', function () { s.index--; renderExamPlay(); });
    navRow.appendChild(prev);

    var flag = el('button', 'jq-sub' + (s.flags[s.index] ? ' is-flagged' : ''),
      s.flags[s.index] ? '見直す印を外す' : 'あとで見直す');
    flag.type = 'button';
    flag.addEventListener('click', function () { s.flags[s.index] = !s.flags[s.index]; renderExamPlay(); });
    navRow.appendChild(flag);

    var next = el('button', 'jq-sub', '次へ →');
    next.type = 'button';
    next.disabled = s.index === s.qs.length - 1;
    next.addEventListener('click', function () { s.index++; renderExamPlay(); });
    navRow.appendChild(next);
    wrap.appendChild(navRow);

    // 問題番号の一覧。答えたもの・見直し印をひと目で分かるようにする
    var map = el('div', 'jq-map');
    s.qs.forEach(function (_, i) {
      var cell = el('button', 'jq-map-cell', String(i + 1));
      cell.type = 'button';
      if (s.answers[i] !== null) cell.classList.add('is-done');
      if (s.flags[i]) cell.classList.add('is-flagged');
      if (i === s.index) cell.classList.add('is-now');
      cell.addEventListener('click', function () { s.index = i; renderExamPlay(); });
      map.appendChild(cell);
    });
    wrap.appendChild(map);

    var status = el('p', 'jq-exam-status', '回答済み ' + answered + ' / ' + s.qs.length +
      (s.flags.filter(Boolean).length ? '　見直し ' + s.flags.filter(Boolean).length : ''));
    wrap.appendChild(status);

    var submit = el('button', 'jq-start', '採点する');
    submit.type = 'button';
    submit.addEventListener('click', function () {
      var left = s.qs.length - answered;
      if (left > 0 && !window.confirm('未回答が ' + left + '問あります。このまま採点しますか？')) return;
      finishExam(false);
    });
    wrap.appendChild(submit);

    var quit = el('button', 'jq-back', '← 中断してメニューにもどる');
    quit.type = 'button';
    quit.addEventListener('click', function () {
      if (window.confirm('模試を中断します。ここまでの回答は破棄されます。よろしいですか？')) renderMenu();
    });
    wrap.appendChild(quit);

    app.appendChild(wrap);
    tickExam();
  }

  function finishExam(timeUp) {
    var s = state.session;
    stopTimer();
    s.finished = true;

    var correct = 0;
    var byCh = {};
    s.qs.forEach(function (q, i) {
      byCh[q.ch] = byCh[q.ch] || { n: 0, ok: 0 };
      byCh[q.ch].n++;
      if (s.answers[i] === q.a) { correct++; byCh[q.ch].ok++; }
    });

    app.innerHTML = '';
    var wrap = el('div', 'jq-result');
    var passed = correct >= EXAM_PASS;

    if (timeUp) wrap.appendChild(el('p', 'jq-timeup', '時間切れです。ここまでの回答で採点しました。'));

    var badge = el('p', 'jq-verdict ' + (passed ? 'is-pass' : 'is-fail'),
      passed ? '合格ライン到達' : '合格ラインまで あと ' + (EXAM_PASS - correct) + '問');
    wrap.appendChild(badge);
    wrap.appendChild(el('p', 'jq-result-score',
      s.qs.length + '問中 ' + correct + '問 正解（' + Math.round(correct / s.qs.length * 100) + '%）'));
    wrap.appendChild(el('p', 'jq-result-msg',
      '本番の合格ラインは ' + EXAM_TOTAL + '問中 ' + EXAM_PASS + '問（65%）です。' +
      'この模試は当サイトが独自に作った問題なので、点数はあくまで目安として使ってください。'));

    // 章別の正答率。どこが弱いかはここで分かる
    var table = el('div', 'jq-bych');
    table.appendChild(el('h3', null, '章ごとの正答'));
    JSTQB_CHAPTERS.forEach(function (c) {
      var d = byCh[c.n];
      if (!d) return;
      var row = el('div', 'jq-bych-row');
      row.appendChild(el('span', 'jq-bych-name', '第' + c.n + '章 ' + c.name));
      var meter = el('span', 'jq-bych-meter');
      var m = el('span', 'jq-bych-fill');
      m.style.width = (d.ok / d.n * 100) + '%';
      if (d.ok / d.n < 0.65) m.classList.add('is-low');
      meter.appendChild(m);
      row.appendChild(meter);
      row.appendChild(el('span', 'jq-bych-num', d.ok + '/' + d.n));
      table.appendChild(row);
    });
    wrap.appendChild(table);

    var missed = [];
    s.qs.forEach(function (q, i) { if (s.answers[i] !== q.a) missed.push({ q: q, chosen: s.answers[i] }); });
    if (missed.length) wrap.appendChild(reviewBox('まちがえた問題・未回答（' + missed.length + '問）', missed));

    var again = el('button', 'jq-start', 'もう一度 模試を解く');
    again.type = 'button';
    again.addEventListener('click', startExam);
    wrap.appendChild(again);

    var back = el('button', 'jq-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
    window.scrollTo({ top: app.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  }

  /* ---------- 見直し ---------- */

  function reviewBox(title, list) {
    var box = el('div', 'jq-review');
    box.appendChild(el('h3', null, title));
    list.forEach(function (m) {
      var item = el('div', 'jq-review-item');
      item.appendChild(el('span', 'jq-tag', '第' + m.q.ch + '章 ' + chapterOf(m.q.ch).name));
      item.appendChild(el('p', 'jq-review-q', m.q.q));
      var ans = el('p', 'jq-review-ans');
      ans.appendChild(el('span', 'jq-review-ng',
        m.chosen === null || m.chosen === undefined
          ? '未回答'
          : 'あなたの答え：' + String.fromCharCode(65 + m.chosen) + '. ' + m.q.o[m.chosen]));
      ans.appendChild(el('span', 'jq-review-ok',
        '正解：' + String.fromCharCode(65 + m.q.a) + '. ' + m.q.o[m.q.a]));
      item.appendChild(ans);
      item.appendChild(el('p', 'jq-review-why', m.q.why));
      box.appendChild(item);
    });
    return box;
  }

  renderMenu();
})();
