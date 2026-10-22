/* ============================================================
   jstqb.js — テスト技術者資格 練習問題

   2つのモードを持つ。
   - 模試モード：全章から出題。出題数（10問／40問）と「1問ごとに答え合わせ」を選ぶ
     - 答え合わせ OFF：本番と同じ体裁。時間制限つきで、途中では答えを見せず最後にまとめて採点する
       （本番と同じ体裁にしないと、時間配分の練習にならないため）
     - 答え合わせ ON：時間制限なし。答えるたびに正誤と解説を出す（短く区切って覚える使い方）
   - 章別モード：章を選んで10問。1問ごとに解説を出す（弱い章を潰す使い方）

   問題と結果は全画面の窓（<dialog>）で出す。ページ本文に埋め込むと、
   スクロールで残り時間が見えなくなり、解くことに集中できなかったため（#195）。

   出題データは jstqb-data.js。採点も計時もブラウザ内で完結する。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('jq-app');
  if (!app || typeof JSTQB_Q === 'undefined') return;

  var EXAM_TOTAL = 40;        // 本番と同じ問題数
  var EXAM_MINUTES = 60;      // 本番と同じ試験時間
  var PASS_RATE = 0.65;       // 合格ライン（40問中26問）
  var COUNTS = [10, 40];      // 模試モードで選べる出題数
  var CHAPTER_SET = 10;       // 章別モードの1セット

  var state = {
    session: null, timerId: null,
    opts: { count: EXAM_TOTAL, check: false }   // 模試モードの選択。メニューに戻っても覚えておく
  };

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

  function button(cls, text, onClick) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
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

  // 本番の時間配分（1問1分半）と合格ライン（65%）を、出題数に合わせて縮める
  function minutesFor(count) { return Math.round(count * EXAM_MINUTES / EXAM_TOTAL); }
  function passFor(count) { return Math.ceil(count * PASS_RATE); }

  function stopTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  }

  /* ---------- 窓（全画面） ---------- */

  var modal = el('dialog', 'jq-modal');
  modal.setAttribute('aria-label', '練習問題');
  var modalBar = el('div', 'jq-modal-bar');
  var modalTitle = el('span', 'jq-modal-title');
  var modalTimer = el('span', 'jq-timer');
  var modalClose = button('jq-modal-close', '✕ とじる', requestClose);
  modalBar.appendChild(modalTitle);
  modalBar.appendChild(modalTimer);
  modalBar.appendChild(modalClose);
  var view = el('div', 'jq-modal-body');
  modal.appendChild(modalBar);
  modal.appendChild(view);
  document.body.appendChild(modal);

  // Esc でいきなり閉じず、とじるボタンと同じ確認を通す
  modal.addEventListener('cancel', function (e) { e.preventDefault(); requestClose(); });

  // 確認は窓の中に出す小さなポップアップ。ブラウザ標準の confirm は画面の上端に出て、
  // 解いている窓から目が離れてしまうため
  var ask = el('dialog', 'jq-ask');
  var askMsg = el('p', 'jq-ask-msg');
  var askRow = el('div', 'jq-ask-row');
  var askDone = null;
  var askNo = button('jq-sub', '', function () { askDone = null; ask.close(); });
  var askYes = button('jq-ask-yes', '', function () {
    var fn = askDone; askDone = null;
    ask.close();
    if (fn) fn();
  });
  askRow.appendChild(askNo);
  askRow.appendChild(askYes);
  ask.appendChild(askMsg);
  ask.appendChild(askRow);
  document.body.appendChild(ask);

  function confirmThen(msg, yesLabel, noLabel, fn) {
    askMsg.textContent = msg;
    askYes.textContent = yesLabel;
    askNo.textContent = noLabel;
    askDone = fn;
    ask.showModal();
    askNo.focus();   // うっかり Enter で破棄しないよう、残るほうを選んでおく
  }

  function openModal(title, withTimer) {
    modalTitle.textContent = title;
    modalTimer.hidden = !withTimer;
    modalTimer.textContent = '';
    if (!modal.open) {
      modal.showModal();
      document.documentElement.classList.add('jq-locked');
    }
  }

  function closeModal() {
    stopTimer();
    if (modal.open) modal.close();
    document.documentElement.classList.remove('jq-locked');
    state.session = null;
  }

  // 解いている途中だけ確認を挟む。結果画面からはそのまま閉じる
  function requestClose() {
    var s = state.session;
    if (s && !s.finished) {
      var started = s.mode === 'exam' || s.answers.length > 0;
      if (started) {
        confirmThen(
          (s.mode === 'exam' ? '模試を中断しますか？' : '途中でやめますか？') + '\nここまでの回答は破棄されます。',
          'やめる', 'つづける', leave);
        return;
      }
    }
    leave();
  }

  function leave() {
    closeModal();
    renderMenu();
  }

  function clearView() {
    view.innerHTML = '';
    view.scrollTop = 0;
  }

  /* ---------- メニュー ---------- */

  function renderMenu() {
    stopTimer();
    app.innerHTML = '';
    var wrap = el('div', 'jq-menu');

    // 模試モード（全章から出題）
    var examBox = el('section', 'jq-mode-box');
    examBox.appendChild(el('h3', 'jq-mode-title', '模試モード'));
    examBox.appendChild(el('p', 'jq-mode-desc',
      '全章から出題します。章ごとの出題数は本番の配分に寄せています。'));

    var countRow = el('div', 'jq-setting');
    countRow.appendChild(el('span', 'jq-setting-label', '出題数'));
    var seg = el('div', 'jq-seg');
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', '出題数');
    COUNTS.forEach(function (n) {
      var lab = el('label', 'jq-seg-item');
      var r = el('input');
      r.type = 'radio';
      r.name = 'jq-count';
      r.value = String(n);
      r.checked = state.opts.count === n;
      r.addEventListener('change', function () { state.opts.count = n; updateHint(); });
      lab.appendChild(r);
      lab.appendChild(el('span', null, n + '問'));
      seg.appendChild(lab);
    });
    countRow.appendChild(seg);
    examBox.appendChild(countRow);

    var checkLab = el('label', 'jq-check');
    var check = el('input');
    check.type = 'checkbox';
    check.checked = state.opts.check;
    check.addEventListener('change', function () { state.opts.check = check.checked; updateHint(); });
    checkLab.appendChild(check);
    checkLab.appendChild(el('span', null, '1問ごとに答え合わせを表示する'));
    examBox.appendChild(checkLab);

    var hint = el('p', 'jq-mode-hint');
    examBox.appendChild(hint);
    var examBtn = button('jq-start', '', function () { startRandom(state.opts.count, state.opts.check); });
    examBox.appendChild(examBtn);

    function updateHint() {
      var n = state.opts.count;
      if (state.opts.check) {
        hint.textContent = n + '問・時間制限なし。答えるたびに正誤と解説が出て、「次へ」で進みます。';
        examBtn.textContent = n + '問 解き始める';
      } else {
        hint.textContent = n + '問・' + minutesFor(n) + '分。途中では答えを出さず、最後にまとめて採点します（' +
          passFor(n) + '問正解で合格ライン）。' + (n === EXAM_TOTAL ? '本番と同じ問題数と時間です。' : '');
        examBtn.textContent = '模試を始める（' + n + '問・' + minutesFor(n) + '分）';
      }
    }
    updateHint();
    wrap.appendChild(examBox);

    // 章別モード
    var chBox = el('section', 'jq-mode-box');
    chBox.appendChild(el('h3', 'jq-mode-title', '章別モード'));
    chBox.appendChild(el('p', 'jq-mode-desc',
      '章を選んで' + CHAPTER_SET + '問。1問ごとに解説が出ます。弱い章を潰すときはこちらから。'));
    var grid = el('div', 'jq-chapters');
    JSTQB_CHAPTERS.forEach(function (c) {
      var n = JSTQB_Q.filter(function (q) { return q.ch === c.n; }).length;
      var btn = button('jq-chapter', null, function () { startChapter(c.n); });
      btn.appendChild(el('span', 'jq-chapter-n', '第' + c.n + '章'));
      btn.appendChild(el('span', 'jq-chapter-name', c.name));
      btn.appendChild(el('span', 'jq-chapter-note', c.note + '／' + n + '問'));
      grid.appendChild(btn);
    });
    chBox.appendChild(grid);
    wrap.appendChild(chBox);

    wrap.appendChild(el('p', 'jq-menu-note',
      '収録' + JSTQB_Q.length + '問。問題・選択肢・解説はすべて当サイトが独自に作成したもので、' +
      '試験団体が公開しているシラバス本文やサンプル問題は使用していません。'));

    app.appendChild(wrap);
  }

  /* ---------- 出題の組み立て ---------- */

  // 章ごとの出題数は JSTQB_CHAPTERS の exam（合計40）に従う。
  // 10問のときは、配分どおりに組んだ40問から先頭を取る（並べ替え済みなので章の比率はおおむね保たれる）
  function buildExamSet(count) {
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
    return shuffle(qs.slice(0, EXAM_TOTAL)).slice(0, count).map(prepare);
  }

  function startRandom(count, check) {
    if (check) startDrill({ kind: 'random', qs: buildExamSet(count), title: '模試 ' + count + '問（答え合わせつき）',
      retry: function () { startRandom(count, true); }, retryLabel: 'もう一度 模試を解く' });
    else startExam(count);
  }

  function startChapter(chN) {
    var pool = JSTQB_Q.filter(function (q) { return q.ch === chN; });
    var picked = shuffle(pool.slice()).slice(0, Math.min(CHAPTER_SET, pool.length)).map(prepare);
    startDrill({ kind: 'chapter', ch: chN, qs: picked, title: '第' + chN + '章 ' + chapterOf(chN).name,
      retry: function () { startChapter(chN); }, retryLabel: 'もう一度この章を解く' });
  }

  /* ---------- 1問ごとに答え合わせ（章別・答え合わせつき模試） ---------- */

  function startDrill(opt) {
    stopTimer();
    state.session = {
      mode: 'drill', kind: opt.kind, ch: opt.ch, title: opt.title, qs: opt.qs,
      retry: opt.retry, retryLabel: opt.retryLabel,
      index: 0, correct: 0, locked: false, answers: [], finished: false
    };
    openModal(opt.title, false);
    renderDrillPlay();
  }

  function renderDrillPlay() {
    var s = state.session;
    var q = s.qs[s.index];
    s.locked = false;   // 問題を出すたびに解除する
    clearView();
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
      var b = button('jq-opt', null, function () { answerDrill(i, b, options); });
      b.appendChild(el('span', 'jq-opt-mark', String.fromCharCode(65 + i)));
      b.appendChild(el('span', 'jq-opt-text', text));
      options.appendChild(b);
    });
    wrap.appendChild(options);
    wrap.appendChild(el('div', 'jq-feedback'));

    wrap.appendChild(button('jq-back', '← メニューに もどる', requestClose));
    view.appendChild(wrap);
  }

  function answerDrill(chosen, btn, options) {
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

    var fb = view.querySelector('.jq-feedback');
    fb.className = 'jq-feedback ' + (ok ? 'is-ok' : 'is-ng');
    fb.appendChild(el('p', 'jq-fb-head', ok ? '正解' : '不正解 — 正解は ' + String.fromCharCode(65 + q.a)));
    fb.appendChild(el('p', 'jq-fb-why', q.why));

    var next = button('jq-next', s.index + 1 >= s.qs.length ? '結果を見る →' : '次の問題 →', function () {
      s.index++;
      if (s.index >= s.qs.length) renderDrillResult(); else renderDrillPlay();
    });
    fb.appendChild(next);
    next.focus();
  }

  function renderDrillResult() {
    var s = state.session;
    s.finished = true;
    clearView();
    var wrap = el('div', 'jq-result');
    var pct = Math.round(s.correct / s.qs.length * 100);

    wrap.appendChild(el('p', 'jq-result-lead', s.title));
    wrap.appendChild(el('p', 'jq-result-score', s.qs.length + '問中 ' + s.correct + '問 正解（' + pct + '%）'));
    wrap.appendChild(resultActions(s));
    wrap.appendChild(el('p', 'jq-result-msg',
      s.kind === 'chapter'
        ? (pct >= 90 ? 'この章は仕上がっています。ほかの章か模試へ進んでください。'
          : pct >= 65 ? '合格ラインの水準です。落とした問題の解説だけ読み返しておきましょう。'
            : 'この章はもう何周かしたほうが得です。解説を読んでから、続けて回してみてください。')
        : (pct >= 65 ? '合格ラインの水準です。仕上げは答え合わせなしの模試で、時間配分も試してみてください。'
          : '65%を切った章から章別モードで潰すと、次の回で効いてきます。')));

    var answers = s.qs.map(function (_, i) { return s.answers[i]; });
    if (s.kind === 'random') wrap.appendChild(byChapterBox(s.qs, answers));

    var missed = [];
    s.qs.forEach(function (q, i) { if (answers[i] !== q.a) missed.push({ q: q, chosen: answers[i] }); });
    if (missed.length) wrap.appendChild(reviewBox('まちがえた問題（' + missed.length + '問）', missed));

    wrap.appendChild(resultActions(s));
    view.appendChild(wrap);
  }

  /* ---------- 模試（答え合わせなし・時間制限つき） ---------- */

  function startExam(count) {
    stopTimer();
    var qs = buildExamSet(count);
    var minutes = minutesFor(count);
    state.session = {
      mode: 'exam', count: count, pass: passFor(count), qs: qs, index: 0,
      title: '模試 ' + count + '問・' + minutes + '分',
      retry: function () { startExam(count); }, retryLabel: 'もう一度 模試を解く',
      answers: qs.map(function () { return null; }),
      flags: qs.map(function () { return false; }),
      endAt: Date.now() + minutes * 60 * 1000,
      finished: false
    };
    openModal(state.session.title, true);
    state.timerId = setInterval(tickExam, 1000);
    renderExamPlay();
  }

  function tickExam() {
    var s = state.session;
    if (!s || s.mode !== 'exam' || s.finished) { stopTimer(); return; }
    var left = s.endAt - Date.now();
    if (left <= 0) { stopTimer(); finishExam(true); return; }
    var sec = Math.floor(left / 1000);
    var mm = Math.floor(sec / 60), ss = sec % 60;
    modalTimer.textContent = '残り ' + mm + ':' + (ss < 10 ? '0' : '') + ss;
    modalTimer.className = 'jq-timer' + (left < 5 * 60 * 1000 ? ' is-low' : '');
  }

  function renderExamPlay() {
    var s = state.session;
    var q = s.qs[s.index];
    clearView();
    var wrap = el('div', 'jq-play jq-exam');

    var answered = s.answers.filter(function (a) { return a !== null; }).length;
    var head = el('div', 'jq-play-head');
    head.appendChild(el('span', 'jq-play-count', (s.index + 1) + ' / ' + s.qs.length));
    head.appendChild(el('span', 'jq-play-score', '回答済み ' + answered));
    wrap.appendChild(head);

    var bar = el('div', 'jq-bar');
    var fill = el('div', 'jq-bar-fill');
    fill.style.width = (answered / s.qs.length * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    wrap.appendChild(el('span', 'jq-tag', '第' + q.ch + '章 ' + chapterOf(q.ch).name));
    wrap.appendChild(el('p', 'jq-q', q.q));

    var options = el('div', 'jq-options');
    q.o.forEach(function (text, i) {
      // 模試では正誤を出さない。選び直しも自由にできる
      var b = button('jq-opt', null, function () {
        s.answers[s.index] = i;
        renderExamPlay();
      });
      b.appendChild(el('span', 'jq-opt-mark', String.fromCharCode(65 + i)));
      b.appendChild(el('span', 'jq-opt-text', text));
      if (s.answers[s.index] === i) b.classList.add('is-picked');
      options.appendChild(b);
    });
    wrap.appendChild(options);

    var navRow = el('div', 'jq-exam-nav');
    var prev = button('jq-sub', '← 前へ', function () { s.index--; renderExamPlay(); });
    prev.disabled = s.index === 0;
    navRow.appendChild(prev);
    navRow.appendChild(button('jq-sub' + (s.flags[s.index] ? ' is-flagged' : ''),
      s.flags[s.index] ? '見直す印を外す' : 'あとで見直す',
      function () { s.flags[s.index] = !s.flags[s.index]; renderExamPlay(); }));
    var next = button('jq-sub', '次へ →', function () { s.index++; renderExamPlay(); });
    next.disabled = s.index === s.qs.length - 1;
    navRow.appendChild(next);
    wrap.appendChild(navRow);

    // 問題番号の一覧。答えたもの・見直し印をひと目で分かるようにする
    var map = el('div', 'jq-map');
    s.qs.forEach(function (_, i) {
      var cell = button('jq-map-cell', String(i + 1), function () { s.index = i; renderExamPlay(); });
      if (s.answers[i] !== null) cell.classList.add('is-done');
      if (s.flags[i]) cell.classList.add('is-flagged');
      if (i === s.index) cell.classList.add('is-now');
      map.appendChild(cell);
    });
    wrap.appendChild(map);

    var flagged = s.flags.filter(Boolean).length;
    wrap.appendChild(el('p', 'jq-exam-status', '回答済み ' + answered + ' / ' + s.qs.length +
      (flagged ? '　見直し ' + flagged : '')));

    wrap.appendChild(button('jq-start', '採点する', function () {
      var left = s.qs.length - answered;
      if (left > 0) {
        confirmThen('未回答が ' + left + '問あります。\nこのまま採点しますか？', '採点する', 'もどって解く',
          function () { finishExam(false); });
        return;
      }
      finishExam(false);
    }));

    wrap.appendChild(button('jq-back', '← 中断してメニューにもどる', requestClose));

    view.appendChild(wrap);
    tickExam();
  }

  function finishExam(timeUp) {
    var s = state.session;
    stopTimer();
    s.finished = true;
    modalTimer.hidden = true;

    var correct = 0;
    s.qs.forEach(function (q, i) { if (s.answers[i] === q.a) correct++; });

    clearView();
    var wrap = el('div', 'jq-result');
    var passed = correct >= s.pass;

    if (timeUp) wrap.appendChild(el('p', 'jq-timeup', '時間切れです。ここまでの回答で採点しました。'));

    wrap.appendChild(el('p', 'jq-verdict ' + (passed ? 'is-pass' : 'is-fail'),
      passed ? '合格ライン到達' : '合格ラインまで あと ' + (s.pass - correct) + '問'));
    wrap.appendChild(el('p', 'jq-result-score',
      s.qs.length + '問中 ' + correct + '問 正解（' + Math.round(correct / s.qs.length * 100) + '%）'));
    wrap.appendChild(resultActions(s));
    wrap.appendChild(el('p', 'jq-result-msg',
      '本番の合格ラインは ' + EXAM_TOTAL + '問中 ' + passFor(EXAM_TOTAL) + '問（65%）です' +
      (s.count !== EXAM_TOTAL ? '（この回は ' + s.count + '問中 ' + s.pass + '問で判定）' : '') + '。' +
      'この模試は当サイトが独自に作った問題なので、点数はあくまで目安として使ってください。'));

    // 章別の正答率。どこが弱いかはここで分かる
    wrap.appendChild(byChapterBox(s.qs, s.answers));

    var missed = [];
    s.qs.forEach(function (q, i) { if (s.answers[i] !== q.a) missed.push({ q: q, chosen: s.answers[i] }); });
    if (missed.length) wrap.appendChild(reviewBox('まちがえた問題・未回答（' + missed.length + '問）', missed));

    wrap.appendChild(resultActions(s));
    view.appendChild(wrap);
  }

  /* ---------- 結果画面の部品 ---------- */

  // 「もう一度」と「メニューへ」。スコアの直下と一番下の2か所に置く
  // （まちがえた問題の一覧が長いと、下まで行かないと次に進めなかったため）
  function resultActions(s) {
    var row = el('div', 'jq-result-actions');
    row.appendChild(button('jq-start', s.retryLabel, s.retry));
    row.appendChild(button('jq-sub', 'メニューへ', requestClose));
    return row;
  }

  function byChapterBox(qs, answers) {
    var byCh = {};
    qs.forEach(function (q, i) {
      byCh[q.ch] = byCh[q.ch] || { n: 0, ok: 0 };
      byCh[q.ch].n++;
      if (answers[i] === q.a) byCh[q.ch].ok++;
    });
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
      if (d.ok / d.n < PASS_RATE) m.classList.add('is-low');
      meter.appendChild(m);
      row.appendChild(meter);
      row.appendChild(el('span', 'jq-bych-num', d.ok + '/' + d.n));
      table.appendChild(row);
    });
    return table;
  }

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
