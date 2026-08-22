/* ============================================================
   tokei.js — とけいのれんしゅう
   アナログ時計はSVGでその場で描く（画像素材を持たない）。
   出題も採点もブラウザ内で完結し、サーバーには何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('tk-app');
  if (!app) return;

  var SET_LENGTH = 10;

  var STEPS = [
    { id: 'hour', name: 'ちょうど', note: '〇じ ぴったり', step: 60 },
    { id: 'half', name: '30ぷん', note: '〇じはん も', step: 30 },
    { id: 'five', name: '5ふんきざみ', note: '5・10・15…', step: 5 },
    { id: 'one', name: '1ぷんきざみ', note: 'ぜんぶの ぷん', step: 1 }
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

  /* ---------- 時刻のことば ---------- */

  // 分の読みは1の位で「ふん／ぷん」が決まる
  // 0ぷん 1ぷん 2ふん 3ぷん 4ぷん 5ふん 6ぷん 7ふん 8ぷん 9ふん
  var PUN = 'ぷぷふぷぷふぷふぷふ';
  function punOf(m) { return PUN.charAt(m % 10) + 'ん'; }

  function timeText(h, m) {
    if (m === 0) return h + 'じ';
    return h + 'じ' + m + punOf(m);
  }

  /* ---------- 時計のSVG ---------- */

  function clockSvg(h, m, size, showMinutes) {
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
    var ha = ((h % 12) * 30 + m * 0.5 - 90) * Math.PI / 180;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + Math.cos(ha) * (R * 0.5)) +
      '" y2="' + f(cy + Math.sin(ha) * (R * 0.5)) + '" stroke="#c0503b" stroke-width="11" stroke-linecap="round"/>';
    // 長針（分）
    var ma = (m * 6 - 90) * Math.PI / 180;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + Math.cos(ma) * (R * 0.78)) +
      '" y2="' + f(cy + Math.sin(ma) * (R * 0.78)) + '" stroke="#2f5d8a" stroke-width="7" stroke-linecap="round"/>';
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

  function makeQuestion(step) {
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
      var c = { h: randInt(1, 12), m: step === 60 ? 0 : (randInt(0, 59 / step | 0) * step) };
      if (seen[key(c)]) continue;
      seen[key(c)] = true;
      opts.push(c);
    }
    return { answer: answer, options: shuffle(opts) };
  }

  /* ---------- ヒント ----------
     こたえそのものは言わず、「どっちの はりを 見て、どう かぞえるか」だけを出す。
     とけいを よむ／さがす で見るべきものが逆になるので、文面も分ける。 */

  function hintLines(mode, t) {
    var h = t.h, m = t.m;
    var next = h % 12 + 1;
    var lines = [];

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
        : 'みじかい はり（あかいはり）は 「' + h + '」を すこし すぎた ところ。「' + next + '」に ちかい とけいは まちがいだよ。');
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

    wrap.appendChild(group('といかた', MODES, 'modeId'));
    wrap.appendChild(group('むずかしさ', STEPS, 'stepId'));

    var opt = el('label', 'tk-toggle');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.showMinutes;
    cb.addEventListener('change', function () { state.showMinutes = cb.checked; });
    opt.appendChild(cb);
    opt.appendChild(el('span', null, 'ぷんの すう字を 出す'));
    wrap.appendChild(opt);

    var preview = el('div', 'tk-preview');
    preview.innerHTML = clockSvg(3, state.showMinutes ? 50 : 0, 150, state.showMinutes);
    cb.addEventListener('change', function () {
      preview.innerHTML = clockSvg(3, state.showMinutes ? 50 : 0, 150, state.showMinutes);
    });
    wrap.appendChild(preview);

    var start = el('button', 'tk-start', 'スタート');
    start.type = 'button';
    start.addEventListener('click', startSession);
    wrap.appendChild(start);

    app.appendChild(wrap);
  }

  function group(title, items, key) {
    var sec = el('section', 'tk-group');
    sec.appendChild(el('h2', 'tk-group-title', title));
    var grid = el('div', 'tk-choices');
    items.forEach(function (item) {
      var btn = el('button', 'tk-choice');
      btn.type = 'button';
      btn.appendChild(el('span', 'tk-choice-label', item.name));
      btn.appendChild(el('span', 'tk-choice-note', item.note));
      if (state[key] === item.id) btn.classList.add('is-on');
      btn.addEventListener('click', function () { state[key] = item.id; renderMenu(); });
      grid.appendChild(btn);
    });
    sec.appendChild(grid);
    return sec;
  }

  function startSession() {
    var step = STEPS.filter(function (s) { return s.id === state.stepId; })[0];
    state.session = { step: step.step, index: 0, correct: 0, locked: false, q: null };
    nextQuestion();
  }

  function nextQuestion() {
    var s = state.session;
    if (s.index >= SET_LENGTH) return renderResult();
    s.q = makeQuestion(s.step);
    s.locked = false;
    renderPlay();
  }

  function renderPlay() {
    var s = state.session;
    var q = s.q;
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
      wrap.appendChild(el('p', 'tk-ask', 'なんじ なんぷん?'));
      var stage = el('div', 'tk-stage');
      stage.innerHTML = clockSvg(q.answer.h, q.answer.m, 240, state.showMinutes);
      wrap.appendChild(stage);
      options.classList.add('is-text');
      q.options.forEach(function (o) {
        var b = el('button', 'tk-opt', timeText(o.h, o.m));
        b.type = 'button';
        b.addEventListener('click', function () { choose(o, b, options); });
        options.appendChild(b);
      });
    } else {
      wrap.appendChild(el('p', 'tk-ask', timeText(q.answer.h, q.answer.m) + ' の とけいは どれ?'));
      options.classList.add('is-clock');
      q.options.forEach(function (o) {
        var b = el('button', 'tk-opt tk-opt-clock');
        b.type = 'button';
        b.innerHTML = clockSvg(o.h, o.m, 132, state.showMinutes);
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
    hintLines(state.modeId, q.answer).forEach(function (line) {
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

    var back = el('button', 'tk-back', '← メニューに もどる');
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
      ? 'せいかい! ' + timeText(q.answer.h, q.answer.m)
      : 'こたえは ' + timeText(q.answer.h, q.answer.m) + (chosen.why ? '（' + chosen.why + '）' : '');

    setTimeout(function () {
      s.index++;
      nextQuestion();
    }, ok ? 1100 : 2000);
  }

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    var wrap = el('div', 'tk-result');
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

    var back = el('button', 'tk-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  renderMenu();
})();
