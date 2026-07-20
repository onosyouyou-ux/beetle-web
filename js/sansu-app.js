(function () {
  'use strict';

  const STORAGE_KEY = 'sansuProgress';
  const SESSION_LENGTH = 10;
  const app = document.getElementById('app');

  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---- もんだい生成 ----
  function generateTashizan(level) {
    if (level === 4) return generateTashizan(randInt(1, 3));
    let a, b;
    if (level === 1) {
      a = randInt(1, 4);
      b = randInt(1, 4);
    } else if (level === 2) {
      a = randInt(1, 9);
      b = randInt(1, Math.max(1, Math.min(9, 10 - a)));
    } else {
      do {
        a = randInt(2, 9);
        b = randInt(2, 9);
      } while (a + b < 11 || a + b > 18);
    }
    return { a: a, b: b, answer: a + b };
  }

  const MODES = [
    {
      id: 'tashizan',
      name: 'たしざん',
      emoji: '🚀',
      symbol: '+',
      ready: true,
      generate: generateTashizan,
      levels: [
        { id: 1, emoji: '🌱', name: 'かんたん', note: '5まで' },
        { id: 2, emoji: '🍎', name: 'ふつう', note: '10まで' },
        { id: 3, emoji: '🔥', name: 'むずかしい', note: 'くり上がり' },
        { id: 4, emoji: '🌟', name: 'ミックス', note: 'ぜんぶ' }
      ]
    },
    { id: 'hikizan', name: 'ひきざん', emoji: '🛸', ready: false },
    { id: 'kakezan', name: 'かけざん', emoji: '🪐', ready: false }
  ];

  const findMode = (id) => MODES.find((m) => m.id === id) || null;

  // ---- せいせきの保存 ----
  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && parsed.version === 1 && parsed.modes) return parsed;
    } catch (e) { /* 壊れていたら作り直す */ }
    return { version: 1, modes: {}, totalCorrect: 0 };
  }

  function saveProgress(p) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch (e) { /* プライベートモード等では保存しない */ }
  }

  let progress = loadProgress();

  function levelRecord(modeId, levelId) {
    const m = progress.modes[modeId];
    return (m && m[levelId]) || { plays: 0, bestCorrect: 0 };
  }

  function recordResult(modeId, levelId, correct) {
    if (!progress.modes[modeId]) progress.modes[modeId] = {};
    const rec = progress.modes[modeId][levelId] || { plays: 0, bestCorrect: 0 };
    rec.plays += 1;
    if (correct > rec.bestCorrect) rec.bestCorrect = correct;
    progress.modes[modeId][levelId] = rec;
    progress.totalCorrect += correct;
    saveProgress(progress);
  }

  const starsFor = (correct) => (correct >= SESSION_LENGTH ? 3 : correct >= 8 ? 2 : correct >= 6 ? 1 : 0);
  const starText = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);

  // ---- おと（Web Audio） ----
  let audioCtx = null;
  function playTone(freq, start, dur, type, gain) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      g.gain.value = gain || 0.15;
      osc.connect(g);
      g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + start;
      osc.start(t);
      g.gain.setValueAtTime(g.gain.value, t + dur - 0.03);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.stop(t + dur);
    } catch (e) { /* 音が出せない環境では無視 */ }
  }
  const playCorrect = () => {
    playTone(523.25, 0, 0.12, 'triangle', 0.18);
    playTone(659.25, 0.1, 0.12, 'triangle', 0.18);
    playTone(783.99, 0.2, 0.18, 'triangle', 0.2);
  };
  const playWrong = () => {
    playTone(220, 0, 0.18, 'sawtooth', 0.12);
    playTone(180, 0.12, 0.22, 'sawtooth', 0.12);
  };
  const playFanfare = () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, i * 0.09, 0.14, 'triangle', 0.18));
  };

  const PRAISE_OK = ['やったね!せいかい!', 'すごい!そのちょうし!', 'ピンポン!せいかい!', 'かんぺき!', 'さすが!'];
  const PRAISE_NG = ['おしい!つぎいこう!', 'だいじょうぶ、つぎだ!', 'ちょっとまちがえたね', 'もうすこし!'];
  const pick = (arr) => arr[randInt(0, arr.length - 1)];

  // ---- 画面の状態 ----
  let session = null;
  let vizVisible = false;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function screen(title, backHash) {
    app.innerHTML = '';
    const head = el('div', 'sa-screen-head');
    if (backHash != null) {
      const back = el('a', 'sa-back', '← もどる');
      back.href = backHash;
      head.appendChild(back);
    }
    head.appendChild(el('h2', 'sa-screen-title', title));
    app.appendChild(head);
    return app;
  }

  // ---- ハブ ----
  function renderHub() {
    session = null;
    screen('なにを れんしゅうする?');

    const total = el('p', 'sa-total');
    total.innerHTML = 'いままで <strong>' + progress.totalCorrect + '</strong> もん せいかい!';
    app.appendChild(total);

    const grid = el('div', 'sa-mode-grid');
    MODES.forEach((mode) => {
      const card = el(mode.ready ? 'a' : 'div', 'sa-mode-card' + (mode.ready ? '' : ' is-soon'));
      if (mode.ready) card.href = '#/' + mode.id;
      card.appendChild(el('span', 'sa-mode-emoji', mode.emoji));
      card.appendChild(el('span', 'sa-mode-name', mode.name));
      card.appendChild(el('span', 'sa-mode-note', mode.ready ? 'あそぶ →' : 'じゅんびちゅう'));
      grid.appendChild(card);
    });
    app.appendChild(grid);

    const reset = el('button', 'sa-reset', 'せいせきを リセットする');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      if (!window.confirm('いままでの せいせきを ぜんぶ けしますか?')) return;
      progress = { version: 1, modes: {}, totalCorrect: 0 };
      saveProgress(progress);
      renderHub();
    });
    app.appendChild(reset);
  }

  // ---- レベルえらび ----
  function renderLevels(mode) {
    session = null;
    screen(mode.emoji + ' ' + mode.name, '#/');

    const grid = el('div', 'sa-level-grid');
    mode.levels.forEach((lv) => {
      const rec = levelRecord(mode.id, lv.id);
      const card = el('a', 'sa-level-card');
      card.href = '#/' + mode.id + '/' + lv.id;
      card.appendChild(el('span', 'sa-level-emoji', lv.emoji));
      card.appendChild(el('span', 'sa-level-name', lv.name));
      card.appendChild(el('span', 'sa-level-note', lv.note));
      card.appendChild(el('span', 'sa-level-stars', starText(starsFor(rec.bestCorrect))));
      grid.appendChild(card);
    });
    app.appendChild(grid);
  }

  // ---- もんだい ----
  function startSession(mode, level) {
    session = { mode: mode, level: level, index: 0, correct: 0, locked: false, current: null };
    nextQuestion();
  }

  function nextQuestion() {
    if (session.index >= SESSION_LENGTH) return renderResult();
    session.current = session.mode.generate(session.level.id);
    session.locked = false;
    renderPlay();
  }

  function buildOptions(correct) {
    const opts = new Set([correct]);
    let guard = 0;
    while (opts.size < 4 && guard++ < 100) {
      const cand = correct + randInt(-3, 3);
      if (cand < 0 || cand === correct) continue;
      opts.add(cand);
    }
    let filler = 0;
    while (opts.size < 4) opts.add(correct + ++filler);
    return shuffle(Array.from(opts));
  }

  function renderPlay() {
    const q = session.current;
    screen(session.mode.emoji + ' ' + session.mode.name + '（' + session.level.name + '）', '#/' + session.mode.id);

    // ロケットの進み（セット内の進捗）
    const track = el('div', 'sa-track-card');
    const label = el('div', 'sa-track-label');
    label.appendChild(el('span', null, 'うちゅうへ すすもう'));
    label.appendChild(el('span', null, (session.index + 1) + ' / ' + SESSION_LENGTH + ' もんめ'));
    track.appendChild(label);
    const bar = el('div', 'sa-track');
    const fill = el('div', 'sa-track-fill');
    const pct = (session.index / SESSION_LENGTH) * 100;
    fill.style.width = pct + '%';
    const rocket = el('div', 'sa-rocket', '🚀');
    rocket.style.left = pct + '%';
    bar.appendChild(fill);
    bar.appendChild(rocket);
    bar.appendChild(el('div', 'sa-track-goal', '🪐'));
    track.appendChild(bar);
    app.appendChild(track);

    const card = el('div', 'sa-card');

    const problem = el('div', 'sa-problem');
    problem.appendChild(el('span', null, String(q.a)));
    problem.appendChild(el('span', 'sa-op', session.mode.symbol));
    problem.appendChild(el('span', null, String(q.b)));
    problem.appendChild(el('span', 'sa-op', '='));
    problem.appendChild(el('span', 'sa-qmark', '?'));
    card.appendChild(problem);

    const toggle = el('button', 'sa-viz-toggle', vizVisible ? '🙈 えを かくす' : '🔍 えで かずを みる');
    toggle.type = 'button';
    card.appendChild(toggle);

    const viz = el('div', 'sa-viz' + (vizVisible ? ' is-open' : ''));
    const dotsA = el('div', 'sa-dots');
    for (let i = 0; i < q.a; i++) dotsA.appendChild(el('span', 'sa-dot'));
    const dotsB = el('div', 'sa-dots sa-dots-b');
    for (let i = 0; i < q.b; i++) dotsB.appendChild(el('span', 'sa-dot'));
    viz.appendChild(dotsA);
    viz.appendChild(el('span', 'sa-viz-op', session.mode.symbol));
    viz.appendChild(dotsB);
    card.appendChild(viz);

    toggle.addEventListener('click', () => {
      vizVisible = !vizVisible;
      viz.classList.toggle('is-open', vizVisible);
      toggle.textContent = vizVisible ? '🙈 えを かくす' : '🔍 えで かずを みる';
    });

    const options = el('div', 'sa-options');
    const feedback = el('div', 'sa-feedback');
    feedback.innerHTML = '&nbsp;';

    buildOptions(q.answer).forEach((val) => {
      const btn = el('button', 'sa-opt', String(val));
      btn.type = 'button';
      btn.addEventListener('click', () => answer(val, btn, options, feedback));
      options.appendChild(btn);
    });
    card.appendChild(options);
    card.appendChild(feedback);
    app.appendChild(card);
  }

  function answer(val, btn, options, feedback) {
    if (session.locked) return;
    session.locked = true;

    const q = session.current;
    const buttons = options.querySelectorAll('.sa-opt');
    buttons.forEach((b) => { b.disabled = true; });

    if (val === q.answer) {
      btn.classList.add('is-correct');
      session.correct += 1;
      playCorrect();
      feedback.textContent = pick(PRAISE_OK);
      feedback.classList.add('is-ok');
    } else {
      btn.classList.add('is-wrong');
      buttons.forEach((b) => {
        if (Number(b.textContent) === q.answer) b.classList.add('is-correct');
      });
      playWrong();
      feedback.textContent = pick(PRAISE_NG) + ' こたえは ' + q.answer;
      feedback.classList.add('is-ng');
    }

    session.index += 1;
    setTimeout(() => {
      if (session) nextQuestion();
    }, 1200);
  }

  // ---- けっか ----
  function renderResult() {
    const { mode, level, correct } = session;
    recordResult(mode.id, level.id, correct);
    const stars = starsFor(correct);
    playFanfare();

    screen('けっか はっぴょう!', '#/' + mode.id);

    const card = el('div', 'sa-card sa-result');
    card.appendChild(el('div', 'sa-result-emoji', stars === 3 ? '🏆' : stars >= 1 ? '🚀' : '🌱'));
    const score = el('p', 'sa-result-score');
    score.innerHTML = SESSION_LENGTH + 'もん ちゅう <strong>' + correct + '</strong> もん せいかい!';
    card.appendChild(score);
    card.appendChild(el('div', 'sa-result-stars', starText(stars)));
    card.appendChild(el('p', 'sa-result-msg',
      stars === 3 ? 'ぜんもん せいかい! うちゅうの おうさまだ!'
        : stars === 2 ? 'すごい! もうすこしで ぜんもん せいかい!'
          : stars === 1 ? 'いいちょうし! もういっかい やってみよう!'
            : 'あきらめないで! れんしゅうすれば できるよ!'));

    const actions = el('div', 'sa-actions');
    const again = el('button', 'sa-btn sa-btn-primary', 'もういちど');
    again.type = 'button';
    again.addEventListener('click', () => startSession(mode, level));
    actions.appendChild(again);

    const back = el('a', 'sa-btn', 'レベルを えらぶ');
    back.href = '#/' + mode.id;
    actions.appendChild(back);

    const hub = el('a', 'sa-btn', 'ほかの けいさん');
    hub.href = '#/';
    actions.appendChild(hub);

    card.appendChild(actions);
    app.appendChild(card);
  }

  // ---- ルーティング ----
  function route() {
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
    const mode = parts[0] ? findMode(parts[0]) : null;

    if (!mode || !mode.ready) return renderHub();
    if (!parts[1]) return renderLevels(mode);

    const level = mode.levels.find((l) => String(l.id) === parts[1]);
    if (!level) return renderLevels(mode);

    // 同じレベルを再表示するだけの hashchange ではセットを作り直さない
    if (session && session.mode.id === mode.id && session.level.id === level.id) return;
    startSession(mode, level);
  }

  window.addEventListener('hashchange', route);
  route();
})();
