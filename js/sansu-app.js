(function () {
  'use strict';

  const STORAGE_KEY = 'sansuProgress';
  const CHALLENGE_LENGTH = 10;
  const ENDLESS_STAGE = 100;   // とことんモードの進捗バー1本ぶん
  const ENDLESS_MAX = 1000;    // とことんモードのコンプリート
  const app = document.getElementById('app');

  // とことんモードの旅路：スタート=地球。100問ごとに次の天体へ到着していく（全10ステージ）
  // icon があれば /assets/images/sansu/route/ の画像、無ければ emoji で表示
  // 地球から近い順に並べる
  const JOURNEY = [
    { name: 'ちきゅう', emoji: '🌏' },                          // スタート地点
    { name: 'つき', emoji: '🌙', icon: 'moon' },               // 1 月
    { name: 'きんせい', emoji: '🟡', icon: 'venus' },          // 2 金星
    { name: 'かせい', emoji: '🔴', icon: 'mars' },             // 3 火星
    { name: 'すいせい', emoji: '⚪', icon: 'mercury' },        // 4 水星
    { name: 'もくせい', emoji: '🟠', icon: 'jupiter' },        // 5 木星
    { name: 'どせい', emoji: '🪐', icon: 'saturn' },           // 6 土星
    { name: 'てんのうせい', emoji: '🔵', icon: 'uranus' },     // 7 天王星
    { name: 'かいおうせい', emoji: '🟣', icon: 'neptune' },    // 8 海王星
    { name: 'ブラックホール', emoji: '🕳️', icon: 'black-hole' }, // 9
    { name: 'かがやく ほし', emoji: '🌟' }                     // 10 ゴール（1000問）
  ];

  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---- むずかしさ（数の大きさで決める。学年は持たない）----
  // note はモードによって意味が変わるので、選択中のモードに合わせて出し分ける
  const DIFFS = [
    { id: 'vs', name: 'ちょうかんたん', max: 5, icon: 'moon' },
    { id: 's', name: 'かんたん', max: 10, icon: 'ringed-planet' },
    { id: 'm', name: 'ふつう', max: 20, icon: 'meteor' },
    { id: 'l', name: 'ちょうなんもん', max: 100, icon: 'black-hole' }
  ];

  const PLAYSTYLES = [
    { id: 'challenge', name: '10もん チャレンジ', note: 'といて けっかを みる', icon: 'stopwatch' },
    { id: 'endless', name: 'とことん', note: '100もんずつ すすむ', icon: 'orbit-loop' }
  ];

  // ---- けいさんの しゅるい ----
  // 出題は make() が「答え・選択肢・見た目」まで返す。
  // さくらんぼ算のように4択の作り方が違うモードを足せるようにしてある。
  function makeAdd(diff) {
    let a, b;
    if (diff.max <= 20) {
      a = randInt(1, diff.max - 1);
      b = randInt(1, diff.max - a);
    } else {
      a = randInt(10, 89);
      b = randInt(1, diff.max - a);
    }
    const answer = a + b;
    return {
      layout: 'plain',
      prompt: 'こたえは どれ?',
      text: a + ' + ' + b,
      answer: answer,
      options: buildOptions(answer, 0, diff.max)
    };
  }

  function makeSub(diff) {
    // 引かれる数を難易度の上限に合わせる（こたえは自動的に上限以下になる）
    const a = diff.max <= 20 ? randInt(2, diff.max) : randInt(11, diff.max);
    const b = randInt(1, a - 1);   // こたえが0にならないようにする
    const answer = a - b;
    return {
      layout: 'plain',
      prompt: 'こたえは どれ?',
      text: a + ' − ' + b,
      answer: answer,
      options: buildOptions(answer, 0, diff.max)
    };
  }

  // さくらんぼ算：うしろの数を「キリのいい数をつくる分」と「あまり」に分ける。
  // 教科書どおり「大きいほうを10にする」ため、前の数 a は必ず b 以上にする
  // （6+8 で 8 を崩すのは不自然。8+6 で 6 を 2 と 4 に分けるのが本来の形）
  function makeCherry(diff) {
    let a;
    if (diff.max >= 100) {
      do { a = randInt(11, 89); } while (a % 10 < 2);   // 1の位が0・1だと分けられない
    } else if (diff.max >= 20) {
      a = randInt(6, 9);
    } else if (diff.max >= 10) {
      a = randInt(7, 9);
    } else {
      a = randInt(8, 9);
    }
    const target = (Math.floor(a / 10) + 1) * 10;   // つくりたいキリのいい数
    const need = target - a;                        // 左のさくらんぼ（これを答えさせる）
    // くり上がるように need より大きく、かつ a を超えない（分けるのは小さいほう）
    const b = randInt(need + 1, Math.min(9, a));
    return {
      layout: 'cherry',
      // 「9 を わけて 90 を つくろう」は 9 から 90 を作ると読めて意味が通らないため、
      // 動作（分ける）だけを書き、何のために分けるかは さくらんぼの下の説明に任せる
      prompt: b + ' を 2つに わけよう',
      text: a + ' + ' + b,
      a: a, b: b, target: target, need: need, rest: b - need, total: a + b,
      answer: need,
      options: buildOptions(need, 1, 9)
    };
  }

  const MODES = [
    { id: 'tashizan', name: 'たしざん', emoji: '➕', ready: true, make: makeAdd,
      icon: 'addition', diffNote: (d) => d.max + 'までの たしざん' },
    { id: 'hikizan', name: 'ひきざん', emoji: '➖', ready: true, make: makeSub,
      icon: 'subtraction', diffNote: (d) => d.max + 'までの ひきざん' },
    // さくらんぼ算は「10のかたまり」を作る技法なので、前の数の大きさで難しさが決まる
    { id: 'sakuranbo', name: 'さくらんぼざん', emoji: '🍒', ready: true, make: makeCherry,
      icon: 'multiplication',
      diffNote: (d) => (d.max >= 100 ? '2けたの くり上がり'
        : d.max >= 20 ? '1けたどうし'
          : d.max >= 10 ? '7〜9に たす' : '8・9に たす') }
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
  function buildOptions(correct, min, max) {
    const lo = min;
    const hi = Math.max(max, correct);
    const near = [correct + 1, correct - 1, correct + 2, correct - 2];
    // 繰り上がり・十の位のミスは大きい数のときだけ混ぜる
    const carry = hi >= 20 ? [correct - 10, correct + 10] : [];
    const pool = shuffle(near.concat(carry))
      .filter((v) => v >= lo && v <= hi && v !== correct);

    const opts = new Set([correct]);
    pool.forEach((v) => { if (opts.size < 4) opts.add(v); });
    let guard = 0;
    while (opts.size < 4 && guard++ < 300) {
      const v = randInt(Math.max(lo, correct - 5), Math.min(hi, correct + 5));
      if (v !== correct) opts.add(v);
    }
    // それでも足りなければ範囲内を順に埋める（選択肢が4つ未満にならないようにする）
    for (let v = lo; v <= hi && opts.size < 4; v++) opts.add(v);
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

    // さくらんぼざんの となりに、やりかた解説へのリファレンスボタンを置く
    const refBtn = el('button', 'sa-ref');
    refBtn.type = 'button';
    refBtn.appendChild(icon('multiplication', 'sa-ref-icon'));
    const refBody = el('span', 'sa-choice-body');
    refBody.appendChild(el('span', 'sa-choice-label', 'やりかた'));
    refBody.appendChild(el('span', 'sa-choice-note', 'さくらんぼざん って?'));
    refBtn.appendChild(refBody);
    refBtn.addEventListener('click', renderReference);

    app.appendChild(group('けいさんの しゅるい', MODES, 'modeId', (m) => ({
      label: m.name,
      note: m.ready ? null : 'じゅんびちゅう',
      disabled: !m.ready
    }), refBtn));

    const chosenMode = findMode(selection.modeId);
    app.appendChild(group('むずかしさ', DIFFS, 'diffId', (d) => ({
      label: d.name,
      note: chosenMode.diffNote(d)
    })));

    app.appendChild(group('あそびかた', PLAYSTYLES, 'styleId', (s) => ({
      label: s.name,
      note: s.note
    })));

    const start = el('button', 'sa-start');
    start.type = 'button';
    start.appendChild(icon('rocket-simple', 'sa-start-icon'));
    start.appendChild(el('span', null, 'スタート'));
    start.addEventListener('click', startSession);
    app.appendChild(start);

    const reset = el('button', 'sa-reset');
    reset.type = 'button';
    reset.appendChild(icon('reset-arrow', 'sa-reset-icon'));
    reset.appendChild(el('span', null, 'せいせきを リセットする'));
    reset.addEventListener('click', () => {
      if (!window.confirm('いままでの せいせきを ぜんぶ けしますか?')) return;
      progress = emptyProgress();
      saveProgress();
      renderMenu();
    });
    app.appendChild(reset);
  }

  function icon(name, cls) {
    const img = el('img', cls || 'sa-choice-icon');
    img.src = '/assets/images/sansu/icons/' + name + '.png';
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }

  function group(title, items, key, describe, extra) {
    const wrap = el('section', 'sa-group');
    wrap.appendChild(el('h3', 'sa-group-title', title));
    const grid = el('div', 'sa-choices');
    items.forEach((item) => {
      const info = describe(item);
      const btn = el('button', 'sa-choice');
      btn.type = 'button';
      if (item.icon) btn.appendChild(icon(item.icon));
      const body = el('span', 'sa-choice-body');
      body.appendChild(el('span', 'sa-choice-label', info.label));
      if (info.note) body.appendChild(el('span', 'sa-choice-note', info.note));
      btn.appendChild(body);
      if (info.disabled) {
        btn.classList.add('is-disabled');
        btn.disabled = true;
      } else {
        if (selection[key] === item.id) {
          btn.classList.add('is-on');
          btn.appendChild(icon('check-badge', 'sa-choice-check'));
        }
        btn.addEventListener('click', () => {
          selection[key] = item.id;
          renderMenu();
        });
      }
      grid.appendChild(btn);
    });
    if (extra) grid.appendChild(extra);
    wrap.appendChild(grid);
    return wrap;
  }

  // ---- さくらんぼざんの やりかた（リファレンス）----
  function renderReference() {
    session = null;
    app.innerHTML = '';

    const head = el('div', 'sa-play-head');
    const back = el('button', 'sa-back', '← もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    head.appendChild(back);
    head.appendChild(el('span', 'sa-play-mode', '🍒 さくらんぼざん の やりかた'));
    app.appendChild(head);

    const card = el('div', 'sa-card sa-ref-card');
    card.appendChild(el('p', 'sa-ref-lead',
      '10より 大きく なる たしざんを、「10の かたまり」を つくって とく やりかただよ。'));

    card.appendChild(el('p', 'sa-ref-example-title', 'れい：8 + 5'));

    // ステップ1：うしろの数を分ける（さくらんぼの図・こたえ入り）
    const step1 = el('div', 'sa-ref-step');
    step1.appendChild(el('span', 'sa-ref-step-no', '1'));
    const s1body = el('div', 'sa-ref-step-body');
    s1body.appendChild(el('p', 'sa-ref-step-text', 'うしろの 5 を、10を つくる ぶんと のこりに わける'));
    s1body.appendChild(refCherry(8, 5, 2, 3, 10));
    step1.appendChild(s1body);
    card.appendChild(step1);

    // ステップ2：10をつくる
    const step2 = el('div', 'sa-ref-step');
    step2.appendChild(el('span', 'sa-ref-step-no', '2'));
    const s2body = el('div', 'sa-ref-step-body');
    s2body.appendChild(el('p', 'sa-ref-step-text', '8 と 2 で 10の かたまりを つくる'));
    s2body.appendChild(refFormula('8 + 2 = 10'));
    step2.appendChild(s2body);
    card.appendChild(step2);

    // ステップ3：のこりをたす
    const step3 = el('div', 'sa-ref-step');
    step3.appendChild(el('span', 'sa-ref-step-no', '3'));
    const s3body = el('div', 'sa-ref-step-body');
    s3body.appendChild(el('p', 'sa-ref-step-text', '10 に のこりの 3 を たす'));
    s3body.appendChild(refFormula('10 + 3 = 13'));
    step3.appendChild(s3body);
    card.appendChild(step3);

    card.appendChild(el('p', 'sa-ref-answer', 'だから 8 + 5 = 13!'));
    card.appendChild(el('p', 'sa-ref-tip', 'このゲームでは ①の「わける かず」を えらぶよ。'));

    const actions = el('div', 'sa-actions');
    const tryBtn = el('button', 'sa-btn sa-btn-primary', '🍒 やってみる');
    tryBtn.type = 'button';
    tryBtn.addEventListener('click', () => {
      selection.modeId = 'sakuranbo';
      startSession();
    });
    actions.appendChild(tryBtn);
    const backBtn = el('a', 'sa-btn', 'メニューに もどる');
    backBtn.href = 'javascript:void(0)';
    backBtn.addEventListener('click', renderMenu);
    actions.appendChild(backBtn);
    card.appendChild(actions);

    app.appendChild(card);
  }

  // リファレンス用：中身の入ったさくらんぼの図
  function refCherry(a, b, need, rest, target) {
    const node = el('div', 'sa-problem sa-problem-cherry sa-ref-cherry');
    node.appendChild(el('span', 'sa-term', String(a)));
    node.appendChild(el('span', 'sa-op', '+'));
    const col = el('div', 'sa-cherry-col');
    col.appendChild(el('span', 'sa-term sa-cherry-top', String(b)));
    col.appendChild(el('div', 'sa-cherry-stem'));
    const pair = el('div', 'sa-cherry-pair');
    const leftSlot = el('div', 'sa-cherry-slot');
    leftSlot.appendChild(el('span', 'sa-cherry-ball is-target is-filled', String(need)));
    leftSlot.appendChild(el('span', 'sa-cherry-cap', a + ' と あわせて ' + target));
    const rightSlot = el('div', 'sa-cherry-slot');
    rightSlot.appendChild(el('span', 'sa-cherry-ball is-filled', String(rest)));
    pair.appendChild(leftSlot);
    pair.appendChild(rightSlot);
    col.appendChild(pair);
    node.appendChild(col);
    return node;
  }

  function refFormula(text) {
    return el('p', 'sa-ref-formula', text);
  }

  // ---- プレイ ----
  function startSession() {
    const mode = findMode(selection.modeId);
    const diff = findDiff(selection.diffId);
    const style = findStyle(selection.styleId);
    session = {
      mode: mode, diff: diff, style: style,
      index: 0, correct: 0, locked: false, current: null,
      recent: [],   // 直近の問題文。連続で同じ問題を出さないため
      combo: 0, bestCombo: 0   // 連続正解（COMBO）
    };
    nextQuestion();
  }

  function nextQuestion() {
    if (session.style.id === 'challenge' && session.index >= CHALLENGE_LENGTH) return renderResult(false);
    // とことんは毎回0からスタート（地球→…→ほし の1回の旅）
    if (session.style.id === 'endless' && session.index >= ENDLESS_MAX) return renderResult(true);
    session.current = makeUniqueQuestion();
    session.locked = false;
    renderPlay();
  }

  // 直近3問と同じ問題を避けて出題する（プールが小さい難易度でも止まらないよう試行回数に上限）
  function makeUniqueQuestion() {
    const s = session;
    let q, tries = 0;
    do {
      q = s.mode.make(s.diff);
      tries++;
    } while (s.recent.indexOf(q.text) !== -1 && tries < 25);
    s.recent.push(q.text);
    if (s.recent.length > 3) s.recent.shift();
    return q;
  }

  function renderPlay() {
    const s = session;
    app.innerHTML = '';

    // 選択中のモード表示（もどるは一番下に配置）＋COMBOバッジ
    const head = el('div', 'sa-play-head');
    head.appendChild(el('span', 'sa-play-mode',
      s.mode.name + '・' + s.diff.name + '・' + s.style.name));
    const combo = el('span', 'sa-combo');
    if (s.combo >= 2) {
      combo.classList.add('is-show');
      combo.textContent = '🔥 COMBO ×' + s.combo;
    }
    head.appendChild(combo);
    app.appendChild(head);

    app.appendChild(progressBar());

    const card = el('div', 'sa-card');
    card.appendChild(el('p', 'sa-question-text', s.current.prompt));

    const built = s.current.layout === 'cherry' ? cherryProblem(s.current) : plainProblem(s.current);
    card.appendChild(built.node);

    const options = el('div', 'sa-options');
    const feedback = el('div', 'sa-feedback');
    feedback.innerHTML = '&nbsp;';

    s.current.options.forEach((val) => {
      const btn = el('button', 'sa-opt', String(val));
      btn.type = 'button';
      btn.addEventListener('click', () => answer(val, btn, options, feedback, built.reveal));
      options.appendChild(btn);
    });
    card.appendChild(options);
    card.appendChild(feedback);
    app.appendChild(card);

    // もどるボタンは一番下
    const backWrap = el('div', 'sa-play-foot');
    const back = el('button', 'sa-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', () => {
      session = null;
      renderMenu();
    });
    backWrap.appendChild(back);
    app.appendChild(backWrap);
  }

  // ふつうの式（こたえは伏せる）
  function plainProblem(q) {
    const node = el('div', 'sa-problem');
    node.appendChild(el('span', null, q.text));
    node.appendChild(el('span', 'sa-op', '='));
    const total = el('span', 'sa-qmark', '?');
    node.appendChild(total);
    return {
      node: node,
      reveal: () => { total.textContent = String(q.answer); }
    };
  }

  // さくらんぼ算：分ける数の真下にさくらんぼをぶら下げる（こたえは答えるまで伏せる）
  function cherryProblem(q) {
    const node = el('div', 'sa-problem sa-problem-cherry');
    node.appendChild(el('span', 'sa-term', String(q.a)));
    node.appendChild(el('span', 'sa-op', '+'));

    const col = el('div', 'sa-cherry-col');
    col.appendChild(el('span', 'sa-term sa-cherry-top', String(q.b)));
    col.appendChild(el('div', 'sa-cherry-stem'));

    const pair = el('div', 'sa-cherry-pair');
    const leftSlot = el('div', 'sa-cherry-slot');
    const left = el('span', 'sa-cherry-ball is-target', '?');
    leftSlot.appendChild(left);
    leftSlot.appendChild(el('span', 'sa-cherry-cap', q.a + ' と あわせて ' + q.target));
    const rightSlot = el('div', 'sa-cherry-slot');
    const right = el('span', 'sa-cherry-ball', '?');
    rightSlot.appendChild(right);
    pair.appendChild(leftSlot);
    pair.appendChild(rightSlot);
    col.appendChild(pair);
    node.appendChild(col);

    // 「= ?」を先に出すと式の答え（16は?）を聞いているように見え、
    // 選択肢（分ける数）と噛み合わないため、答えるまで隠しておく。
    // visibility なら場所は確保されるのでレイアウトが跳ねない
    const eq = el('span', 'sa-op sa-eq-late', '=');
    const total = el('span', 'sa-qmark sa-eq-late', '?');
    node.appendChild(eq);
    node.appendChild(total);

    return {
      node: node,
      reveal: () => {
        left.textContent = String(q.need);
        right.textContent = String(q.rest);
        left.classList.add('is-filled');
        right.classList.add('is-filled');
        total.textContent = String(q.total);
        eq.classList.remove('sa-eq-late');
        total.classList.remove('sa-eq-late');
      }
    };
  }

  // 天体マーカー（icon があれば画像、無ければ絵文字）
  function bodyMarker(body, cls) {
    if (body.icon) {
      const img = el('img', cls);
      img.src = '/assets/images/sansu/route/' + body.icon + '.png';
      img.alt = body.name;
      return img;
    }
    const span = el('span', cls, body.emoji);
    span.title = body.name;
    return span;
  }

  function progressBar() {
    const s = session;
    const wrap = el('div', 'sa-track-card');
    const label = el('div', 'sa-track-label');

    if (s.style.id === 'challenge') {
      const done = s.index, goal = CHALLENGE_LENGTH;
      label.appendChild(el('span', null, 'うちゅうへ すすもう'));
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

    // ── とことん：session.index を使うので必ず0からスタート ──
    const stage = Math.floor(s.index / ENDLESS_STAGE);   // 0..9
    const done = s.index - stage * ENDLESS_STAGE;
    const goal = ENDLESS_STAGE;
    const next = JOURNEY[stage + 1] || JOURNEY[JOURNEY.length - 1];

    const head = el('span', null);
    head.textContent = 'ステージ ' + (stage + 1) + ' / 10 ・ ' + next.name + ' へ';
    label.appendChild(head);
    label.appendChild(el('span', null, done + ' / ' + goal + ' もん'));
    wrap.appendChild(label);

    // 星（到達地点）はバーの上に配置
    const route = el('div', 'sa-route');
    JOURNEY.slice(1).forEach((body, i) => {
      const no = i + 1;   // ステージ番号 1..10
      const stop = el('span', 'sa-route-stop');
      stop.appendChild(bodyMarker(body, 'sa-route-img'));
      if (no <= stage) stop.classList.add('is-done');
      else if (no === stage + 1) stop.classList.add('is-now');
      route.appendChild(stop);
    });
    wrap.appendChild(route);

    const bar = el('div', 'sa-track');
    const fill = el('div', 'sa-track-fill');
    const pct = (done / goal) * 100;
    fill.style.width = pct + '%';
    bar.appendChild(bodyMarker(JOURNEY[stage], 'sa-track-start'));
    const rocket = el('div', 'sa-rocket', '🚀');
    rocket.style.left = pct + '%';
    bar.appendChild(fill);
    bar.appendChild(rocket);
    bar.appendChild(bodyMarker(next, 'sa-track-goal'));
    wrap.appendChild(bar);
    return wrap;
  }

  function answer(val, btn, options, feedback, reveal) {
    const s = session;
    if (s.locked) return;
    s.locked = true;
    if (reveal) reveal();   // 式のこたえ・さくらんぼの中身を埋める

    const q = s.current;
    const buttons = options.querySelectorAll('.sa-opt');
    buttons.forEach((b) => { b.disabled = true; });

    const ok = val === q.answer;
    if (ok) {
      btn.classList.add('is-correct');
      s.correct += 1;
      playCorrect();
      // さくらんぼ算は「分けたあと」の流れまで見せるのが学びどころ
      feedback.textContent = q.layout === 'cherry'
        ? q.a + ' + ' + q.answer + ' = ' + q.target + '、' + q.target + ' + ' + q.rest + ' = ' + q.total + '!'
        : pick(PRAISE_OK);
      feedback.classList.add('is-ok');
    } else {
      btn.classList.add('is-wrong');
      buttons.forEach((b) => {
        if (Number(b.textContent) === q.answer) b.classList.add('is-correct');
      });
      playWrong();
      feedback.textContent = q.layout === 'cherry'
        ? q.b + ' は ' + q.answer + ' と ' + q.rest + ' に わけるよ'
        : pick(PRAISE_NG) + ' こたえは ' + q.answer;
      feedback.classList.add('is-ng');
    }

    // COMBO（連続正解）
    if (ok) {
      s.combo += 1;
      if (s.combo > s.bestCombo) s.bestCombo = s.combo;
      if (s.combo % 5 === 0) playFanfare();   // 5連ごとにファンファーレ
    } else {
      s.combo = 0;
    }
    const comboEl = app.querySelector('.sa-combo');
    if (comboEl) {
      if (s.combo >= 2) {
        comboEl.textContent = '🔥 COMBO ×' + s.combo;
        comboEl.classList.add('is-show');
        comboEl.classList.remove('is-pop');
        void comboEl.offsetWidth;   // アニメを再発火させる
        comboEl.classList.add('is-pop');
      } else {
        comboEl.classList.remove('is-show', 'is-pop');
      }
    }

    s.index += 1;
    progress.totals.answered += 1;
    if (ok) progress.totals.correct += 1;

    if (s.style.id === 'endless') {
      const rec = endlessRecord(s.mode.id, s.diff.id);   // 通算成績（記録用）
      rec.answered += 1;
      if (ok) rec.correct += 1;
      // 100問ごとに次の天体へ到着（バーは session.index 基準＝毎回0スタート）
      if (s.index % ENDLESS_STAGE === 0 && s.index < ENDLESS_MAX) {
        const reached = JOURNEY[s.index / ENDLESS_STAGE];
        const next = JOURNEY[s.index / ENDLESS_STAGE + 1];
        setTimeout(() => {
          playFanfare();
          feedback.textContent = reached.emoji + ' ' + reached.name + ' に とうちゃく!'
            + (next ? ' つぎは ' + next.name : '');
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
      const goal = JOURNEY[JOURNEY.length - 1];
      card.appendChild(el('div', 'sa-result-emoji', goal.emoji));
      card.appendChild(el('p', 'sa-result-msg',
        ENDLESS_MAX + 'もん たっせい! ' + goal.name + ' に とうちゃく! うちゅうの おうさまだ!'));
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

    if (s.bestCombo >= 2) {
      card.appendChild(el('p', 'sa-result-combo', '🔥 さいだい COMBO ×' + s.bestCombo));
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
