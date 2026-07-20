(function () {
  'use strict';

  const STORAGE_KEY = 'sansuProgress';
  const CHALLENGE_LENGTH = 10;
  const ENDLESS_STAGE = 100;   // とことんモードの進捗バー1本ぶん
  const ENDLESS_MAX = 1000;    // とことんモードのコンプリート
  const app = document.getElementById('app');

  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---- むずかしさ（こたえの大きさで決める。学年は持たない）----
  const DIFFS = [
    { id: 'vs', name: 'ちょうかんたん', note: 'こたえが 5まで', max: 5 },
    { id: 's', name: 'かんたん', note: 'こたえが 10まで', max: 10 },
    { id: 'm', name: 'ふつう', note: 'こたえが 20まで', max: 20 },
    { id: 'l', name: 'ちょうなんもん', note: 'こたえが 100まで', max: 100 }
  ];

  const PLAYSTYLES = [
    { id: 'challenge', name: '10もん チャレンジ', note: 'といて けっかを みる' },
    { id: 'endless', name: 'とことん', note: '100もんずつ すすむ' }
  ];

  // ---- けいさんの しゅるい ----
  // 出題UIはモードごとに差し替えられるようにしておく（さくらんぼ算は4択にならないため）
  function makeAdd(diff) {
    let a, b;
    if (diff.max <= 20) {
      a = randInt(1, diff.max - 1);
      b = randInt(1, diff.max - a);
    } else {
      a = randInt(10, 89);
      b = randInt(1, diff.max - a);
    }
    return { a: a, b: b, answer: a + b, text: a + ' + ' + b };
  }

  const MODES = [
    { id: 'tashizan', name: 'たしざん', emoji: '➕', ready: true, ui: 'choice', make: makeAdd },
    { id: 'hikizan', name: 'ひきざん', emoji: '➖', ready: false },
    { id: 'sakuranbo', name: 'さくらんぼざん', emoji: '🍒', ready: false }
  ];

  // ---- せいせきの保存 ----
  function emptyProgress() {
    return { version: 2, totals: { answered: 0, correct: 0 }, challenge: {}, endless: {} };
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && parsed.version === 2) return parsed;
    } catch (e) { /* 壊れていたら作り直す */ }
    return emptyProgress();
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) { /* プライベートモード等では保存しない */ }
  }

  let progress = loadProgress();

  const bucketKey = (modeId, diffId) => modeId + ':' + diffId;

  function endlessRecord(modeId, diffId) {
    const key = bucketKey(modeId, diffId);
    if (!progress.endless[key]) progress.endless[key] = { answered: 0, correct: 0 };
    return progress.endless[key];
  }

  function challengeRecord(modeId, diffId) {
    const key = bucketKey(modeId, diffId);
    if (!progress.challenge[key]) progress.challenge[key] = { plays: 0, bestCorrect: 0 };
    return progress.challenge[key];
  }

  const starsFor = (correct) => (correct >= CHALLENGE_LENGTH ? 3 : correct >= 8 ? 2 : correct >= 6 ? 1 : 0);
  const starText = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);

  // ---- おと（Web Audio）----
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

  // ---- 選択肢（ありがちな間違いから作る）----
  function buildOptions(correct, max) {
    const limit = Math.max(max, correct);
    const near = [correct + 1, correct - 1, correct + 2, correct - 2];
    // 繰り上がり・十の位のミスは大きい数のときだけ混ぜる
    const carry = max >= 20 ? [correct - 10, correct + 10] : [];
    const pool = shuffle(near.concat(carry))
      .filter((v) => v >= 0 && v <= limit && v !== correct);

    const opts = new Set([correct]);
    pool.forEach((v) => { if (opts.size < 4) opts.add(v); });
    let guard = 0;
    while (opts.size < 4 && guard++ < 200) {
      const v = randInt(Math.max(0, correct - 5), Math.min(limit, correct + 5));
      if (v !== correct) opts.add(v);
    }
    let filler = 1;
    while (opts.size < 4) opts.add(correct + filler++);
    return shuffle(Array.from(opts));
  }

  // ---- 画面 ----
  let selection = { modeId: 'tashizan', diffId: 's', styleId: 'challenge' };
  let session = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  const findMode = (id) => MODES.find((m) => m.id === id);
  const findDiff = (id) => DIFFS.find((d) => d.id === id);
  const findStyle = (id) => PLAYSTYLES.find((s) => s.id === id);

  // ---- メニュー ----
  function renderMenu() {
    session = null;
    app.innerHTML = '';

    const total = el('p', 'sa-total');
    total.innerHTML = 'いままで <strong>' + progress.totals.correct + '</strong> もん せいかい!';
    app.appendChild(total);

    app.appendChild(group('けいさんの しゅるい', MODES, 'modeId', (m) => ({
      label: m.emoji + ' ' + m.name,
      note: m.ready ? null : 'じゅんびちゅう',
      disabled: !m.ready
    })));

    app.appendChild(group('むずかしさ', DIFFS, 'diffId', (d) => ({
      label: d.name,
      note: d.note
    })));

    app.appendChild(group('あそびかた', PLAYSTYLES, 'styleId', (s) => ({
      label: s.name,
      note: s.note
    })));

    const start = el('button', 'sa-start', '▶ スタート');
    start.type = 'button';
    start.addEventListener('click', startSession);
    app.appendChild(start);

    const reset = el('button', 'sa-reset', 'せいせきを リセットする');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      if (!window.confirm('いままでの せいせきを ぜんぶ けしますか?')) return;
      progress = emptyProgress();
      saveProgress();
      renderMenu();
    });
    app.appendChild(reset);
  }

  function group(title, items, key, describe) {
    const wrap = el('section', 'sa-group');
    wrap.appendChild(el('h3', 'sa-group-title', title));
    const grid = el('div', 'sa-choices');
    items.forEach((item) => {
      const info = describe(item);
      const btn = el('button', 'sa-choice');
      btn.type = 'button';
      btn.appendChild(el('span', 'sa-choice-label', info.label));
      if (info.note) btn.appendChild(el('span', 'sa-choice-note', info.note));
      if (info.disabled) {
        btn.classList.add('is-disabled');
        btn.disabled = true;
      } else {
        if (selection[key] === item.id) btn.classList.add('is-on');
        btn.addEventListener('click', () => {
          selection[key] = item.id;
          renderMenu();
        });
      }
      grid.appendChild(btn);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  // ---- プレイ ----
  function startSession() {
    const mode = findMode(selection.modeId);
    const diff = findDiff(selection.diffId);
    const style = findStyle(selection.styleId);
    session = {
      mode: mode, diff: diff, style: style,
      index: 0, correct: 0, locked: false, current: null
    };
    nextQuestion();
  }

  function nextQuestion() {
    if (session.style.id === 'challenge' && session.index >= CHALLENGE_LENGTH) return renderResult(false);
    if (session.style.id === 'endless' && endlessRecord(session.mode.id, session.diff.id).answered >= ENDLESS_MAX) {
      return renderResult(true);
    }
    session.current = session.mode.make(session.diff);
    session.locked = false;
    renderPlay();
  }

  function renderPlay() {
    const s = session;
    app.innerHTML = '';

    // 選択中のモード表示＋もどる
    const head = el('div', 'sa-play-head');
    const back = el('button', 'sa-back', '← もどる');
    back.type = 'button';
    back.addEventListener('click', () => {
      session = null;
      renderMenu();
    });
    head.appendChild(back);
    head.appendChild(el('span', 'sa-play-mode',
      s.mode.name + '・' + s.diff.name + '・' + s.style.name));
    app.appendChild(head);

    app.appendChild(progressBar());

    const card = el('div', 'sa-card');
    card.appendChild(el('p', 'sa-question-text', 'こたえは どれ?'));

    const problem = el('div', 'sa-problem');
    problem.appendChild(el('span', null, s.current.text));
    problem.appendChild(el('span', 'sa-op', '='));
    problem.appendChild(el('span', 'sa-qmark', '?'));
    card.appendChild(problem);

    const options = el('div', 'sa-options');
    const feedback = el('div', 'sa-feedback');
    feedback.innerHTML = '&nbsp;';

    buildOptions(s.current.answer, s.diff.max).forEach((val) => {
      const btn = el('button', 'sa-opt', String(val));
      btn.type = 'button';
      btn.addEventListener('click', () => answer(val, btn, options, feedback));
      options.appendChild(btn);
    });
    card.appendChild(options);
    card.appendChild(feedback);
    app.appendChild(card);
  }

  function progressBar() {
    const s = session;
    const wrap = el('div', 'sa-track-card');
    const label = el('div', 'sa-track-label');
    let done, goal, left;

    if (s.style.id === 'challenge') {
      done = s.index;
      goal = CHALLENGE_LENGTH;
      left = 'うちゅうへ すすもう';
    } else {
      const rec = endlessRecord(s.mode.id, s.diff.id);
      const stage = Math.floor(rec.answered / ENDLESS_STAGE);
      done = rec.answered - stage * ENDLESS_STAGE;
      goal = ENDLESS_STAGE;
      left = 'ステージ ' + (stage + 1) + ' / ' + (ENDLESS_MAX / ENDLESS_STAGE);
    }

    label.appendChild(el('span', null, left));
    label.appendChild(el('span', null, done + ' / ' + goal + ' もん'));
    wrap.appendChild(label);

    const bar = el('div', 'sa-track');
    const fill = el('div', 'sa-track-fill');
    const pct = (done / goal) * 100;
    fill.style.width = pct + '%';
    const rocket = el('div', 'sa-rocket', '🚀');
    rocket.style.left = pct + '%';
    bar.appendChild(fill);
    bar.appendChild(rocket);
    bar.appendChild(el('div', 'sa-track-goal', '🪐'));
    wrap.appendChild(bar);
    return wrap;
  }

  function answer(val, btn, options, feedback) {
    const s = session;
    if (s.locked) return;
    s.locked = true;

    const q = s.current;
    const buttons = options.querySelectorAll('.sa-opt');
    buttons.forEach((b) => { b.disabled = true; });

    const ok = val === q.answer;
    if (ok) {
      btn.classList.add('is-correct');
      s.correct += 1;
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

    s.index += 1;
    progress.totals.answered += 1;
    if (ok) progress.totals.correct += 1;

    if (s.style.id === 'endless') {
      const rec = endlessRecord(s.mode.id, s.diff.id);
      rec.answered += 1;
      if (ok) rec.correct += 1;
      // 100問ごとにステージクリア
      if (rec.answered % ENDLESS_STAGE === 0 && rec.answered < ENDLESS_MAX) {
        setTimeout(() => {
          playFanfare();
          feedback.textContent = '🎉 ステージ ' + (rec.answered / ENDLESS_STAGE) + ' クリア!';
          feedback.className = 'sa-feedback is-ok';
        }, 400);
      }
    }
    saveProgress();

    setTimeout(() => { if (session) nextQuestion(); }, 1200);
  }

  // ---- けっか ----
  function renderResult(complete) {
    const s = session;
    app.innerHTML = '';
    playFanfare();

    const card = el('div', 'sa-card sa-result');

    if (complete) {
      card.appendChild(el('div', 'sa-result-emoji', '👑'));
      card.appendChild(el('p', 'sa-result-msg', ENDLESS_MAX + 'もん たっせい! うちゅうの おうさまだ!'));
    } else {
      const rec = challengeRecord(s.mode.id, s.diff.id);
      rec.plays += 1;
      if (s.correct > rec.bestCorrect) rec.bestCorrect = s.correct;
      saveProgress();

      const stars = starsFor(s.correct);
      card.appendChild(el('div', 'sa-result-emoji', stars === 3 ? '🏆' : stars >= 1 ? '🚀' : '🌱'));
      const score = el('p', 'sa-result-score');
      score.innerHTML = CHALLENGE_LENGTH + 'もん ちゅう <strong>' + s.correct + '</strong> もん せいかい!';
      card.appendChild(score);
      card.appendChild(el('div', 'sa-result-stars', starText(stars)));
      card.appendChild(el('p', 'sa-result-msg',
        stars === 3 ? 'ぜんもん せいかい! すごい!'
          : stars === 2 ? 'すごい! もうすこしで ぜんもん せいかい!'
            : stars === 1 ? 'いいちょうし! もういっかい やってみよう!'
              : 'あきらめないで! れんしゅうすれば できるよ!'));
    }

    const actions = el('div', 'sa-actions');
    const again = el('button', 'sa-btn sa-btn-primary', 'もういちど');
    again.type = 'button';
    again.addEventListener('click', startSession);
    actions.appendChild(again);

    const menu = el('button', 'sa-btn', 'メニューに もどる');
    menu.type = 'button';
    menu.addEventListener('click', () => { session = null; renderMenu(); });
    actions.appendChild(menu);

    card.appendChild(actions);
    app.appendChild(card);
  }

  renderMenu();
})();
