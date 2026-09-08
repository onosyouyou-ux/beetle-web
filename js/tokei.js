/* ============================================================
   tokei.js — とけい修行
   アナログ時計はSVGでその場で描く（画像素材を持たない）。
   出題も採点もブラウザ内で完結し、サーバーには何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('tk-app');
  if (!app) return;

  var SET_LENGTH = 10;

  /* なんいどは「手裏剣の数＝level」で見せる。配列の並び順ではなく level を持たせるのは、
     はりを1本ずつ見る2つ（みじかい／ながい）を同じ段に横並びで置くため（2026-09-08）。
     pair が同じものは1行にまとめて描く。 */
  var LEVEL_MAX = 5;

  var STEPS = [
    { id: 'hand-h', level: 1, pair: 'hand', name: 'みじかい はり', note: 'なんじ？', step: 60, hands: 'hour' },
    { id: 'hand-m', level: 1, pair: 'hand', name: 'ながい はり', note: 'なんぷん？', step: 5, hands: 'minute' },
    { id: 'hour', level: 2, name: 'ちょうどの じかん', note: '3じ・8じ など', step: 60, hands: 'both' },
    { id: 'half', level: 3, name: '30ぷんきざみ', note: '〇じはん も', step: 30, hands: 'both' },
    { id: 'five', level: 4, name: '5ふんきざみ', note: '5・10・15…', step: 5, hands: 'both' },
    { id: 'one', level: 5, name: '1ぷんきざみ', note: 'ぜんぶの ぷん', step: 1, hands: 'both' }
  ];

  var MODES = [
    { id: 'read', name: 'とけいを よむ', note: 'とけい → じこく' },
    { id: 'find', name: 'とけいを さがす', note: 'じこく → とけい' }
  ];

  var state = {
    stepId: 'hour',
    modeId: 'read',
    showMinutes: true,
    session: null
  };

  function stepOf(id) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return STEPS[i];
    return STEPS[2];
  }

  /* ---------- 時刻のことば ---------- */

  // 分の読みは1の位で「ふん／ぷん」が決まる
  // 0ぷん 1ぷん 2ふん 3ぷん 4ぷん 5ふん 6ぷん 7ふん 8ぷん 9ふん
  var PUN = 'ぷぷふぷぷふぷふぷふ';
  function punOf(m) { return PUN.charAt(m % 10) + 'ん'; }

  function timeText(h, m) {
    if (m === 0) return h + 'じ';
    return h + 'じ' + m + punOf(m);
  }

  // はりを1本だけ見る段では、答えも「じ」だけ／「ぷん」だけになる
  function answerText(o, hands) {
    if (hands === 'hour') return o.h + 'じ';
    if (hands === 'minute') return o.m + punOf(o.m);
    return timeText(o.h, o.m);
  }

  function askText(hands) {
    if (hands === 'hour') return 'なんじ?';
    if (hands === 'minute') return 'なんぷん?';
    return 'なんじ なんぷん?';
  }

  /* ---------- 時計のSVG ----------
     hands: 'both'（りょうほう）／'hour'（みじかい はりだけ）／'minute'（ながい はりだけ） */

  function clockSvg(h, m, size, showMinutes, hands) {
    hands = hands || 'both';
    // みじかい はりだけの段では、外がわの「ぷん」の数字は手がかりにならないので出さない
    if (hands === 'hour') showMinutes = false;

    var cx = 110, cy = 110, R = 92;
    var s = '<svg class="tk-clock" viewBox="0 0 220 220" width="' + size + '" height="' + size + '" role="img" aria-label="とけい">';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 12) + '" fill="#f6ede0" stroke="#d9c7ab" stroke-width="4"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="#fffdf8" stroke="#c9b696" stroke-width="2"/>';

    var i, a, x1, y1, x2, y2;
    // 分のめもり
    for (i = 0; i < 60; i++) {
      a = (i * 6 - 90) * Math.PI / 180;
      var big = i % 5 === 0;
      x1 = cx + Math.cos(a) * (R - (big ? 12 : 6));
      y1 = cy + Math.sin(a) * (R - (big ? 12 : 6));
      x2 = cx + Math.cos(a) * R;
      y2 = cy + Math.sin(a) * R;
      s += '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) +
        '" stroke="' + (big ? '#8a7a5e' : '#cbbfa8') + '" stroke-width="' + (big ? 3 : 1.6) + '" stroke-linecap="round"/>';
    }
    // 1〜12の数字
    for (i = 1; i <= 12; i++) {
      a = (i * 30 - 90) * Math.PI / 180;
      s += '<text x="' + f(cx + Math.cos(a) * (R - 27)) + '" y="' + f(cy + Math.sin(a) * (R - 27) + 8) +
        '" text-anchor="middle" class="tk-num">' + i + '</text>';
    }
    // 外がわの「ぷん」の数字（はじめのうちの手がかり）
    if (showMinutes) {
      for (i = 0; i < 12; i++) {
        a = (i * 30 - 90) * Math.PI / 180;
        s += '<text x="' + f(cx + Math.cos(a) * (R + 6)) + '" y="' + f(cy + Math.sin(a) * (R + 6) + 4.5) +
          '" text-anchor="middle" class="tk-num-min">' + (i * 5) + '</text>';
      }
    }
    // 短針（時）は分ぶんも進む
    if (hands !== 'minute') {
      var ha = ((h % 12) * 30 + m * 0.5 - 90) * Math.PI / 180;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + Math.cos(ha) * (R * 0.5)) +
        '" y2="' + f(cy + Math.sin(ha) * (R * 0.5)) + '" stroke="#c0503b" stroke-width="11" stroke-linecap="round"/>';
    }
    // 長針（分）
    if (hands !== 'hour') {
      var ma = (m * 6 - 90) * Math.PI / 180;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + Math.cos(ma) * (R * 0.78)) +
        '" y2="' + f(cy + Math.sin(ma) * (R * 0.78)) + '" stroke="#2f5d8a" stroke-width="7" stroke-linecap="round"/>';
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#3a3630"/>';
    s += '</svg>';
    return s;
  }

  function f(n) { return Math.round(n * 10) / 10; }

  /* ---------- 出題 ---------- */

  var randInt = function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var key = function (t) { return t.h + ':' + t.m; };

  // 正解＋まちがえ方の候補から、重複なしで4つに詰める
  function pick4(answer, wrongs, filler) {
    var seen = {};
    seen[key(answer)] = true;
    var opts = [answer];
    shuffle(wrongs).forEach(function (w) {
      if (opts.length >= 4) return;
      if (w.h < 1 || w.h > 12 || w.m < 0 || w.m > 59) return;
      if (seen[key(w)]) return;
      seen[key(w)] = true;
      opts.push(w);
    });
    var guard = 0;
    while (opts.length < 4 && guard++ < 200) {
      var c = filler();
      if (seen[key(c)]) continue;
      seen[key(c)] = true;
      opts.push(c);
    }
    return { answer: answer, options: shuffle(opts) };
  }

  function makeQuestion(step, hands) {
    if (hands === 'hour') return makeHourHandQuestion();
    if (hands === 'minute') return makeMinuteHandQuestion();
    return makeBothHandsQuestion(step);
  }

  /* みじかい はりだけ。
     分はわざとランダムにして、短針を数字と数字の「あいだ」に立たせる。
     ちょうどの位置しか出さないと、本物の時計を読むときに役に立たない。 */
  function makeHourHandQuestion() {
    var h = randInt(1, 12);
    // 57分以降は短針が次の数字に重なって見分けがつかないので、55分までにする
    var m = randInt(0, 55);
    var answer = { h: h, m: m };
    var next = h % 12 + 1;
    var prev = (h + 10) % 12 + 1;
    var wrongs = [
      { h: next, m: m, why: 'つぎの すう字を よんだ' },
      { h: prev, m: m, why: 'まえの すう字を よんだ' },
      { h: (h + 5) % 12 + 1, m: m },
      { h: (h + 6) % 12 + 1, m: m },
      { h: (h + 2) % 12 + 1, m: m }
    ];
    return pick4(answer, wrongs, function () { return { h: randInt(1, 12), m: m }; });
  }

  /* ながい はりだけ。5ふんきざみに固定する。
     1ぷんきざみは いちばん上の段（りょうほうの はり）にまかせて、
     ここは「すう字を 5ばい する」だけに集中させる。 */
  function makeMinuteHandQuestion() {
    var m = randInt(0, 11) * 5;
    var answer = { h: 12, m: m };
    var wrongs = [];
    // ① 長針がさす数字をそのまま分にする（50ぷん を 10ぷん と読む）
    if (m !== 0) wrongs.push({ h: 12, m: m / 5, why: 'すう字を そのまま ぷんに した' });
    // ② 逆まわりに数えた
    if (m !== 0) wrongs.push({ h: 12, m: (60 - m) % 60, why: 'ぎゃくむきに かぞえた' });
    // ③ 数字1つぶん ずれた
    wrongs.push({ h: 12, m: (m + 5) % 60, why: 'すう字 1つぶん ずれた' });
    wrongs.push({ h: 12, m: (m + 55) % 60, why: 'すう字 1つぶん ずれた' });
    return pick4(answer, wrongs, function () { return { h: 12, m: randInt(0, 11) * 5 }; });
  }

  function makeBothHandsQuestion(step) {
    var h = randInt(1, 12);
    var m;
    if (step === 60) m = 0;
    else if (step === 30) m = randInt(0, 1) * 30;
    else m = randInt(0, 59 / step | 0) * step;
    var answer = { h: h, m: m };

    // まちがえやすい読み方を選択肢に混ぜる
    var wrongs = [];
    // ① 長針と短針の取りちがえ（3:50 を 10:15 と読む）
    var swapH = (m === 0 ? 12 : Math.floor(m / 5)) || 12;
    var swapM = (h % 12) * 5;
    wrongs.push({ h: swapH, m: swapM, why: 'はりの とりちがえ' });
    // ② 長針がさす数字をそのまま分にする（50ぷん を 10ぷん と読む）
    if (m % 5 === 0 && m !== 0) wrongs.push({ h: h, m: m / 5, why: 'すう字を そのまま ぷんに した' });
    // ③ 時が1つずれる（短針が次の数字に近いとき）
    wrongs.push({ h: h % 12 + 1, m: m, why: 'みじかい はりの よみまちがい' });
    wrongs.push({ h: (h + 10) % 12 + 1, m: m, why: 'みじかい はりの よみまちがい' });
    // ④ 分だけずれる
    if (step < 60) {
      wrongs.push({ h: h, m: (m + step * 1) % 60, why: 'ぷんの よみまちがい' });
      wrongs.push({ h: h, m: (m + 60 - step) % 60, why: 'ぷんの よみまちがい' });
      wrongs.push({ h: h, m: (60 - m) % 60, why: 'ぷんの よみまちがい' });
    }

    return pick4(answer, wrongs, function () {
      return { h: randInt(1, 12), m: step === 60 ? 0 : (randInt(0, 59 / step | 0) * step) };
    });
  }

  /* ---------- ヒント ----------
     こたえそのものは言わず、「どっちの はりを 見て、どう かぞえるか」だけを出す。
     とけいを よむ／さがす で見るべきものが逆になるので、文面も分ける。 */

  function hintLines(mode, t, hands) {
    var h = t.h, m = t.m;
    var next = h % 12 + 1;
    var lines = [];

    if (hands === 'hour') {
      if (mode === 'read') {
        lines.push(m === 0
          ? 'みじかい はり（あかいはり）は 「' + h + '」を ぴったり さして いるね。'
          : 'みじかい はり（あかいはり）は 「' + h + '」と 「' + next + '」の あいだに あるね。');
        lines.push('あいだに ある ときは、まだ こえて いない ほう（まえの すう字）を よむよ。');
      } else {
        lines.push('みじかい はり（あかいはり）だけの とけいだよ。');
        lines.push('「' + h + '」を すぎて いて、まだ 「' + next + '」に とどいて いない とけいを さがそう。');
      }
      return lines;
    }

    if (hands === 'minute') {
      if (mode === 'read') {
        lines.push('ながい はり（あおいはり）だけの とけいだよ。さして いる すう字を 見よう。');
        lines.push(m === 0
          ? '「12」を さして いる ときは 0ぷん（ちょうど）だよ。'
          : 'すう字を 5ばい すると 「ぷん」。いまは 「' + (m / 5) + '」を さして いるね。');
      } else {
        lines.push(m === 0
          ? '0ぷん の ながい はり（あおいはり）は 「12」を さすよ。'
          : '「' + m + punOf(m) + '」は 5で わると 「' + (m / 5) + '」。ながい はりが その すう字を さす とけいを さがそう。');
        lines.push('ぎゃくまわりに かぞえないように、「12」から 右まわりで たしかめよう。');
      }
      return lines;
    }

    if (mode === 'read') {
      lines.push(m === 0
        ? 'みじかい はり（あかいはり）は 「' + h + '」を ぴったり さして いるね。それが 「じ」だよ。'
        : 'みじかい はり（あかいはり）は 「' + h + '」と 「' + next + '」の あいだ。まえの すう字の 「' + h + 'じ」だよ。');
      if (m === 0) {
        lines.push('ながい はり（あおいはり）は 「12」。ちょうど の とけいだね。');
      } else if (m % 5 === 0) {
        lines.push('ながい はり（あおいはり）が さす すう字を 5ばい すると 「ぷん」。いまは 「' + (m / 5) + '」を さして いるよ。');
      } else {
        lines.push('ながい はり（あおいはり）は 「' + Math.floor(m / 5) + '」を すぎた ところ。'
          + '「' + (Math.floor(m / 5) * 5) + punOf(Math.floor(m / 5) * 5) + '」から めもりを 1つずつ かぞえて みよう。');
      }
    } else {
      lines.push(m === 0
        ? 'みじかい はり（あかいはり）が 「' + h + '」を ぴったり さして いる とけいを さがそう。'
        : 'みじかい はり（あかいはり）が 「' + h + '」と 「' + next + '」の あいだに ある とけいを さがそう。「' + next + '」を こえて いたら ちがうよ。');
      lines.push(m === 0
        ? 'ながい はり（あおいはり）は 「12」を さして いるよ。'
        : m % 5 === 0
          ? '「' + m + punOf(m) + '」は 5で わると 「' + (m / 5) + '」。ながい はり（あおいはり）は その すう字を さすよ。'
          : '「' + m + punOf(m) + '」は 「' + (Math.floor(m / 5) * 5) + punOf(Math.floor(m / 5) * 5) + '」から めもり ' + (m % 5) + 'つぶん さき。ながい はりの さきを よく 見よう。');
    }
    return lines;
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
    var wrap = el('div', 'tk-menu');

    wrap.appendChild(modeGroup('といかた'));
    wrap.appendChild(levelGroup('なんいど'));

    var opt = el('label', 'tk-toggle');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.showMinutes;
    cb.addEventListener('change', function () { state.showMinutes = cb.checked; });
    opt.appendChild(cb);
    opt.appendChild(el('span', null, 'とけいに ふんを ひょうじする'));
    wrap.appendChild(opt);

    // 見本の時計は、いま選んでいる なんいど と同じ本数のはりで描く
    var preview = el('div', 'tk-preview');
    var drawPreview = function () {
      var hands = stepOf(state.stepId).hands;
      preview.innerHTML = clockSvg(3, state.showMinutes ? 50 : 0, 150, state.showMinutes, hands);
    };
    drawPreview();
    cb.addEventListener('change', drawPreview);
    wrap.appendChild(preview);

    var start = el('button', 'tk-start', 'スタート');
    start.type = 'button';
    start.addEventListener('click', startSession);
    wrap.appendChild(start);

    app.appendChild(wrap);
    app.appendChild(NinjaLinks.el('tokei'));
  }

  // 手裏剣1枚。中心の穴は fill-rule="evenodd" で抜いている
  var SHURIKEN_SVG = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">'
    + '<path fill-rule="evenodd" d="M12 1 17.2 6.8 23 12 17.2 17.2 12 23 6.8 17.2 1 12 6.8 6.8Z'
    + 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></svg>';

  // なんいどは手裏剣の数で見せる（全部で total 枚、うち level 枚が光る）。
  // 数字も文字も読まずに「どれが やさしいか」が分かるようにするため。
  function levelBadge(level, total) {
    var box = el('span', 'tk-level');
    box.setAttribute('aria-hidden', 'true');
    for (var i = 1; i <= total; i++) {
      var one = el('span', i <= level ? 'tk-shuriken is-on' : 'tk-shuriken');
      one.innerHTML = SHURIKEN_SVG;
      box.appendChild(one);
    }
    return box;
  }

  function choiceBtn(item, stateKey, level) {
    var btn = el('button', 'tk-choice');
    btn.type = 'button';
    if (level) {
      btn.appendChild(levelBadge(level, LEVEL_MAX));
      btn.setAttribute('aria-label', item.name + '（なんいど ' + level + ' / ' + LEVEL_MAX + '）');
    }
    btn.appendChild(el('span', 'tk-choice-label', item.name));
    btn.appendChild(el('span', 'tk-choice-note', item.note));
    if (state[stateKey] === item.id) btn.classList.add('is-on');
    btn.addEventListener('click', function () { state[stateKey] = item.id; renderMenu(); });
    return btn;
  }

  function modeGroup(title) {
    var sec = el('section', 'tk-group');
    sec.appendChild(el('h2', 'tk-group-title', title));
    var grid = el('div', 'tk-choices');
    MODES.forEach(function (item) { grid.appendChild(choiceBtn(item, 'modeId', 0)); });
    sec.appendChild(grid);
    return sec;
  }

  /* なんいどは段（level）ごとに1行へ積む。pair が同じものだけ1行に横並びで入れる。
     手裏剣は行ではなくボタンごとに持たせる。そうすると、狭い画面で
     .tk-pair を display:contents にして全体を2列に折り返しても段が読める。 */
  function levelGroup(title) {
    var sec = el('section', 'tk-group');
    sec.appendChild(el('h2', 'tk-group-title', title));
    var grid = el('div', 'tk-choices tk-choices-level');
    var pairs = {};
    STEPS.forEach(function (item) {
      var btn = choiceBtn(item, 'stepId', item.level);
      if (item.pair) {
        var row = pairs[item.pair];
        if (!row) {
          row = pairs[item.pair] = el('div', 'tk-pair');
          grid.appendChild(row);
        }
        row.appendChild(btn);
      } else {
        grid.appendChild(btn);
      }
    });
    sec.appendChild(grid);
    return sec;
  }

  function startSession() {
    var step = stepOf(state.stepId);
    state.session = {
      step: step.step,
      hands: step.hands || 'both',
      index: 0, correct: 0, locked: false, q: null
    };
    nextQuestion();
  }

  function nextQuestion() {
    var s = state.session;
    if (s.index >= SET_LENGTH) return renderResult();
    s.q = makeQuestion(s.step, s.hands);
    s.locked = false;
    renderPlay();
  }

  function renderPlay() {
    var s = state.session;
    var q = s.q;
    var hands = s.hands;
    app.innerHTML = '';
    var wrap = el('div', 'tk-play');

    var head = el('div', 'tk-play-head');
    head.appendChild(el('span', 'tk-play-count', (s.index + 1) + ' / ' + SET_LENGTH));
    head.appendChild(el('span', 'tk-play-score', 'せいかい ' + s.correct));
    wrap.appendChild(head);

    var bar = el('div', 'tk-bar');
    var fill = el('div', 'tk-bar-fill');
    fill.style.width = (s.index / SET_LENGTH * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    var options = el('div', 'tk-options');

    if (state.modeId === 'read') {
      wrap.appendChild(el('p', 'tk-ask', askText(hands)));
      var stage = el('div', 'tk-stage');
      stage.innerHTML = clockSvg(q.answer.h, q.answer.m, 240, state.showMinutes, hands);
      wrap.appendChild(stage);
      options.classList.add('is-text');
      q.options.forEach(function (o) {
        var b = el('button', 'tk-opt', answerText(o, hands));
        b.type = 'button';
        b.addEventListener('click', function () { choose(o, b, options); });
        options.appendChild(b);
      });
    } else {
      wrap.appendChild(el('p', 'tk-ask', answerText(q.answer, hands) + ' の とけいは どれ?'));
      options.classList.add('is-clock');
      q.options.forEach(function (o) {
        var b = el('button', 'tk-opt tk-opt-clock');
        b.type = 'button';
        b.innerHTML = clockSvg(o.h, o.m, 132, state.showMinutes, hands);
        b.addEventListener('click', function () { choose(o, b, options); });
        options.appendChild(b);
      });
    }

    // ヒント（こたえは言わない。押すまでは出さない）
    var hintBtn = el('button', 'tk-hint-btn', 'ヒントを 見る');
    hintBtn.type = 'button';
    hintBtn.setAttribute('aria-expanded', 'false');
    var hint = el('div', 'tk-hint');
    hint.hidden = true;
    hintLines(state.modeId, q.answer, hands).forEach(function (line) {
      hint.appendChild(el('p', null, line));
    });
    hintBtn.addEventListener('click', function () {
      hint.hidden = !hint.hidden;
      hintBtn.setAttribute('aria-expanded', String(!hint.hidden));
      hintBtn.textContent = hint.hidden ? 'ヒントを 見る' : 'ヒントを とじる';
    });
    wrap.appendChild(hintBtn);
    wrap.appendChild(hint);

    wrap.appendChild(options);
    var fb = el('div', 'tk-feedback');
    wrap.appendChild(fb);

    var back = el('button', 'tk-back', '← もんだいせんたくに もどる');
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
    var hands = s.hands;
    var ok = chosen.h === q.answer.h && chosen.m === q.answer.m;
    if (ok) s.correct++;

    Array.prototype.forEach.call(options.querySelectorAll('.tk-opt'), function (b, i) {
      b.disabled = true;
      var o = q.options[i];
      if (o.h === q.answer.h && o.m === q.answer.m) b.classList.add('is-correct');
    });
    if (!ok) btn.classList.add('is-wrong');

    var fb = app.querySelector('.tk-feedback');
    fb.className = 'tk-feedback ' + (ok ? 'is-ok' : 'is-ng');
    fb.textContent = ok
      ? 'せいかい! ' + answerText(q.answer, hands)
      : 'こたえは ' + answerText(q.answer, hands) + (chosen.why ? '（' + chosen.why + '）' : '');

    setTimeout(function () {
      s.index++;
      nextQuestion();
    }, ok ? 1100 : 2000);
  }

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    var wrap = el('div', 'tk-result');
    // 全問正解のときだけ、お祝いの絵に差し替える（2026-09-03）
    if (s.correct === SET_LENGTH) wrap.classList.add('is-perfect');
    var stars = s.correct >= 10 ? 3 : s.correct >= 8 ? 2 : s.correct >= 5 ? 1 : 0;
    wrap.appendChild(el('p', 'tk-result-stars', '★★★☆☆☆'.slice(3 - stars, 6 - stars)));
    wrap.appendChild(el('p', 'tk-result-score', SET_LENGTH + 'もんちゅう ' + s.correct + 'もん せいかい!'));
    wrap.appendChild(el('p', 'tk-result-msg',
      stars === 3 ? 'ぜんもん せいかい! とけいマスター!'
        : stars === 2 ? 'あと すこし! もういちど やってみよう。'
          : stars === 1 ? 'いいちょうし。つづけて れんしゅう しよう。'
            : 'だいじょうぶ。ゆっくり よんで みよう。'));

    var again = el('button', 'tk-start', 'もういちど');
    again.type = 'button';
    again.addEventListener('click', startSession);
    wrap.appendChild(again);

    var back = el('button', 'tk-back', '← もんだいせんたくに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  renderMenu();
})();
