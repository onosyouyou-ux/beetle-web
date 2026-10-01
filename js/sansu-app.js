(function () {
  'use strict';

  // 別ページから指定すると、同じ作りで さくらんぼざん専用のアプリになる（tools/sakuranbo/。2026-09-28）
  // ページの <body data-sansu-mode="sakuranbo"> で切り替える（HTMLにscriptを書かないため）
  const SAKURANBO = document.body.dataset.sansuMode === 'sakuranbo';
  const STORAGE_KEY = SAKURANBO ? 'sakuranboProgress' : 'sansuProgress';
  const CHALLENGE_LENGTH = 10;
  const ENDLESS_STAGE = 10;    // 次の星に到着するのに必要な「正解」数
  const ENDLESS_MAX = 100;     // 全10星ぶんの正解数（コンプリート）
  const app = document.getElementById('app');

  // とことんモードの旅路：スタート=地球。ENDLESS_STAGE（10問）正解ごとに次の天体へ到着していく（全10ステージ＝100問でゴール）
  // icon があれば /assets/images/sansu/route/ の画像、無ければ emoji で表示
  // 地球から近い順に並べる
  const JOURNEY = [
    { name: 'ちきゅう', emoji: '⭐', star: true },              // スタート地点（大きな★）
    { name: 'つき', emoji: '🌙', icon: 'moon' },               // 1 月
    { name: 'きんせい', emoji: '🟡', icon: 'venus' },          // 2 金星
    { name: 'かせい', emoji: '🔴', icon: 'mars' },             // 3 火星
    { name: 'すいせい', emoji: '⚪', icon: 'mercury' },        // 4 水星
    { name: 'もくせい', emoji: '🟠', icon: 'jupiter' },        // 5 木星
    { name: 'どせい', emoji: '🪐', icon: 'saturn' },           // 6 土星
    { name: 'てんのうせい', emoji: '🔵', icon: 'uranus' },     // 7 天王星
    { name: 'かいおうせい', emoji: '🟣', icon: 'neptune' },    // 8 海王星
    { name: 'ブラックホール', emoji: '🕳️', icon: 'black-hole' }, // 9
    { name: 'かがやく ほし', emoji: '🌟' }                     // 10 ゴール（100問）
  ];

  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---- むずかしさ ----
  // さんすう：たしざん・ひきざん を えらんでから、2段目で むずかしさを えらぶ（2026-10-01 ユーザー決定。
  // それまでの「けたの形6つ → むずかしさ」は 形とむずかしさが入りまじって わかりにくかった）
  //   ちょうかんたん＝こたえが5まで（ひきざんは 5から ひく）
  //   かんたん　　　＝こたえが10まで（ひきざんは 10から ひく）
  //   ふつう　　　　＝くり上がり あり（ひきざんは くり下がり あり）
  //   すこしむずかしい＝2けたと 1けた（くり上がり・くり下がり なし）
  //   むずかしい　　＝2けたと 1けた（くり上がり・くり下がり あり）。すこしむずかしい の つぎ（2026-10-01 ユーザー指示）
  //   ちょうなんもん＝2けたどうし
  // さくらんぼざん は むずかしさ の段を持たず、記録のキーに 'one' だけを使う
  const DIFFS = SAKURANBO ? [{ id: 'one', name: '' }] : [
    // アイコンは とことん の旅路の天体（2026-10-01 ユーザー指示）。ちょうなんもん だけ ブラックホールのまま
    { id: 'vs', name: 'ちょうかんたん', icon: 'route/moon' },
    { id: 's', name: 'かんたん', icon: 'route/venus' },
    { id: 'm', name: 'ふつう', icon: 'route/mars' },
    { id: 'h', name: 'すこしむずかしい', icon: 'route/jupiter' },
    { id: 'h2', name: 'むずかしい', icon: 'route/saturn' },
    { id: 'l', name: 'ちょうなんもん', icon: 'black-hole' }
  ];

  const PLAYSTYLES = [
    { id: 'challenge', name: '10もん チャレンジ', note: 'といて けっかを みる', icon: 'stopwatch' },
    { id: 'endless', name: 'とことん', note: '10もんで つぎの ほしへ', icon: 'orbit-loop' }
  ];

  // ---- けいさんの しゅるい ----
  // 出題は make() が「答え・選択肢・見た目」まで返す。
  // さくらんぼ算のように4択の作り方が違うモードを足せるようにしてある。
  // かけざん・わりざん・さくらんぼざん は、かけざん修行・さくらんぼざん の アプリに ゆずった

  // 条件に合う組み合わせが出るまで引きなおす（どの むずかしさでも 数十回で見つかる）
  function drawPair(aLo, aHi, bLo, bHi, ok) {
    for (let guard = 0; guard < 5000; guard++) {
      const a = randInt(aLo, aHi);
      const b = randInt(bLo, bHi);
      if (ok(a, b)) return [a, b];
    }
    throw new Error('sansu: no problem for ' + [aLo, aHi, bLo, bHi].join('/'));
  }

  // むずかしさごとの [まえの数の範囲, うしろの数の範囲, 条件, 選択肢の上限]
  const ADD_RULES = {
    vs: [1, 4, 1, 4, (a, b) => a + b <= 5, 10],
    s: [1, 9, 1, 9, (a, b) => a + b <= 10, 10],
    m: [2, 9, 2, 9, (a, b) => a + b >= 11, 18],
    h: [10, 98, 1, 9, (a, b) => (a % 10) + b <= 9, 99],
    h2: [11, 98, 1, 9, (a, b) => (a % 10) + b >= 10 && a + b <= 99, 99],
    l: [10, 99, 10, 99, () => true, 198]
  };
  // こたえが 0 に ならないように、まえの数は うしろの数より 大きくする
  const SUB_RULES = {
    vs: [2, 5, 1, 4, (a, b) => a > b, 5],
    s: [2, 10, 1, 9, (a, b) => a > b, 10],
    m: [11, 18, 2, 9, (a, b) => a % 10 < b && a - b <= 9, 9],
    h: [10, 99, 1, 9, (a, b) => a % 10 >= b, 99],
    h2: [11, 99, 1, 9, (a, b) => a % 10 < b, 99],
    l: [11, 99, 10, 99, (a, b) => a > b, 99]
  };

  function makeCalc(op, level) {
    const add = op === 'add';
    const [aLo, aHi, bLo, bHi, ok, max] = (add ? ADD_RULES : SUB_RULES)[level];
    const [a, b] = drawPair(aLo, aHi, bLo, bHi, ok);
    const answer = add ? a + b : a - b;
    return {
      layout: 'plain',
      prompt: 'こたえは どれ?',
      text: a + (add ? ' + ' : ' − ') + b,
      answer: answer,
      options: buildOptions(answer, add ? 2 : 1, max)
    };
  }

  // さくらんぼざん専用アプリ：4パターン（2026-09-28）。
  // 「わけかた」＝うしろ／まえ、「かず」＝1けた どうし／2けたも でる。
  // 10の かたまりを つくるのは いつも大きいほう（big）。分けるのは小さいほう（small）。
  //   うしろ：8 + 3 → 3 を 2 と 1 ／ 28 + 5 → 5 を 2 と 3
  //   まえ　：4 + 8 → 4 を 2 と 2 ／ 5 + 28 → 5 を 3 と 2（ならった形：市販プリントの「まえの かずを わけて」）
  // 答えさせるのは「big と あわせて キリのいい数になる ぶん」（need）だけ
  // さくらんぼざん専用アプリは「分ける2つの数」をそのまま答えさせる（「2 と 1」。2026-09-28 ユーザー指示）。
  // 並びは さくらんぼの玉の並び（図の左から）と同じ：うしろを わける＝[10をつくる数, のこり]、まえを わける＝[のこり, 10をつくる数]。
  // まちがいの選択肢は、ほかの分け方（1 と 2 など）と、足しても元の数にならない組み合わせ（2 と 2 など）から作る
  function toPairQuestion(q) {
    if (!SAKURANBO) return q;
    const front = q.side === 'front';
    const split = front ? q.a : q.b;
    const pair = (x) => (front ? (split - x) + ' と ' + x : x + ' と ' + (split - x));
    const correct = pair(q.need);
    const pool = [];
    for (let x = 1; x < split; x++) if (x !== q.need) pool.push(pair(x));   // ほかの分け方
    const off = [[q.need, q.rest + 1], [q.need, q.rest - 1], [q.need + 1, q.rest], [q.need - 1, q.rest]]
      .filter(([n, r]) => n >= 1 && r >= 1)
      .map(([n, r]) => (front ? r + ' と ' + n : n + ' と ' + r));      // 足しても元の数にならない
    // 近い分け方を優先して2つ、足りないぶんを ずれた組み合わせで埋める
    const near = shuffle(pool.filter((t) => Math.abs(parseInt(front ? t.split(' と ')[1] : t, 10) - q.need) <= 2)).slice(0, 2);
    const opts = [correct];
    near.concat(shuffle(off), shuffle(pool)).forEach((t) => { if (opts.length < 4 && opts.indexOf(t) < 0) opts.push(t); });
    // 2 を 1 と 1 に分ける（9 + 2 など）ときは候補が3つしかないので、少し大きくずらした組み合わせで埋める
    [[q.need + 1, q.rest + 1], [q.need, q.rest + 2], [q.need + 2, q.rest]].forEach(([n, r]) => {
      const t = front ? r + ' と ' + n : n + ' と ' + r;
      if (opts.length < 4 && opts.indexOf(t) < 0) opts.push(t);
    });
    q.answer = correct;
    q.options = shuffle(opts);
    return q;
  }

  // ちょうなんもん：2けた ＋ 2けた（38 + 25 → 25 を 2 と 23 に分けて、38 と 2 で 40）。
  // くり上がりが起きる組み合わせ（1の位の和が10以上）で、こたえは99まで。分けるのは うしろ
  function makeCherryTwoTwo() {
    for (let guard = 0; guard < 200; guard++) {
      let a;
      do { a = randInt(12, 79); } while (a % 10 < 2);
      const target = (Math.floor(a / 10) + 1) * 10;
      const need = target - a;
      const cands = [];
      for (let v = 11; v <= 99 - a; v++) if (v % 10 >= need && v % 10 !== 0) cands.push(v);
      if (!cands.length) continue;
      const b = cands[randInt(0, cands.length - 1)];
      return toPairQuestion({
        layout: 'cherry',
        prompt: b + ' を 2つに わけよう',
        text: a + ' + ' + b,
        side: 'back',
        a: a, b: b, target: target, need: need, rest: b - need, total: a + b,
        answer: need,
        options: buildOptions(need, 1, 9)
      });
    }
    return makeCherryPattern(true, 'back');
  }

  function makeCherryPattern(two, side) {
    let big;
    if (two) {
      do { big = randInt(11, 89); } while (big % 10 < 2);   // 1の位が0・1だと くり上がりが作れない
    } else {
      big = randInt(6, 9);
    }
    const target = (Math.floor(big / 10) + 1) * 10;
    const need = target - big;
    const small = randInt(need + 1, two ? 9 : Math.min(9, big));
    const front = side === 'front';
    const a = front ? small : big;
    const b = front ? big : small;
    return toPairQuestion({
      layout: 'cherry',
      prompt: small + ' を 2つに わけよう',
      text: a + ' + ' + b,
      side: front ? 'front' : 'back',
      a: a, b: b, target: target, need: need, rest: small - need, total: a + b,
      answer: need,
      options: buildOptions(need, 1, 9)
    });
  }

  // さくらんぼざん専用：問題の形を1画面に全部並べ、押したらすぐ始める（2026-09-28 ユーザー指示。2段目の「かず」はやめた）
  const MODES = SAKURANBO ? [
    { id: 'one-ushiro', name: '1けたの たしざん', note: 'うしろの すうじを わける（8 + 3）', ready: true, icon: 'cherry',
      make: () => makeCherryPattern(false, 'back') },
    { id: 'one-mae', name: '1けたの たしざん', note: 'まえの すうじを わける（4 + 8）', ready: true, icon: 'cherry',
      make: () => makeCherryPattern(false, 'front') },
    { id: 'two-ushiro', name: '2けたの たしざん', note: 'うしろの すうじを わける（28 + 5）', ready: true, icon: 'cherry',
      make: () => makeCherryPattern(true, 'back') },
    { id: 'two-mae', name: '2けたの たしざん', note: 'まえの すうじを わける（5 + 28）', ready: true, icon: 'cherry',
      make: () => makeCherryPattern(true, 'front') },
    { id: 'hard', name: 'ちょうなんもん', note: '2けた ＋ 2けた（38 + 25）', ready: true, icon: 'cherry',
      make: () => makeCherryTwoTwo() },
    { id: 'mix', name: 'ぜんぶ まぜる', note: '1けた・2けた、まえ・うしろ を まぜて', ready: true, icon: 'cherry',
      make: () => makeCherryPattern(Math.random() < 0.5, Math.random() < 0.5 ? 'front' : 'back') }
  ] : [
    // さんすう：たしざん・ひきざん の2つ（2026-10-01 ユーザー指示）。むずかしさは2段目で えらぶ。
    // levels＝その しゅるいで出せる むずかしさ。diffNote＝むずかしさ の説明
    // 絵つきの大きなカード（とけい修行の「いま なんじ？」と同じ作り。絵は #89。2026-10-01）
    { id: 'add', name: 'たしざん', note: 'ほしを あわせて かずを ふやそう', ready: true, img: '/assets/images/ninja/modes/sansu-tashi.webp',
      levels: ['vs', 's', 'm', 'h', 'h2', 'l'], make: (d) => makeCalc('add', d.id),
      diffNote: { vs: 'こたえが 5まで（2 + 3）', s: 'こたえが 10まで（4 + 5）', m: 'くり上がり あり（8 + 5）',
        h: '2けた ＋ 1けた・くり上がり なし（23 + 5）', h2: '2けた ＋ 1けた・くり上がり あり（27 + 6）', l: '2けた ＋ 2けた（38 + 25）' } },
    { id: 'sub', name: 'ひきざん', note: 'ほしを とって かずを へらそう', ready: true, img: '/assets/images/ninja/modes/sansu-hiki.webp',
      levels: ['vs', 's', 'm', 'h', 'h2', 'l'], make: (d) => makeCalc('sub', d.id),
      diffNote: { vs: '5までの かず から ひく（5 − 2）', s: '10までの かず から ひく（9 − 4）', m: 'くり下がり あり（13 − 6）',
        h: '2けた − 1けた・くり下がり なし（25 − 3）', h2: '2けた − 1けた・くり下がり あり（23 − 5）', l: '2けた − 2けた（56 − 23）' } }
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
  let selection = { modeId: SAKURANBO ? 'one-ushiro' : 'add', diffId: SAKURANBO ? 'one' : null, styleId: 'challenge' };
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
  // さくらんぼざん：1画面。もんだい を押したら そのまま始まる（2026-09-28）
  // さんすう　　：2段。1段目で もんだいの形、2段目で むずかしさ＋スタート（2026-09-30）
  // ブラウザの「戻る」と画面の「← もどる」で1つ前の画面へ戻れるよう、2段目・やりかた・プレイで履歴を1つずつ積む
  let menuStep = 1;
  function goMenu2() {
    history.pushState({ nkStep: 2 }, '');
    renderMenu(2);
  }
  function openReference() {
    history.pushState({ nkStep: 'ref' }, '');
    renderReference();
  }
  // プレイ・けっか から「メニューに もどる」ときは、2段目・やりかた の画面をとばして 1段目へ。
  // どこから始めたかを覚えておき、戻る数を合わせる（戻りすぎるとページの外へ出てしまう。2026-09-28）
  let playFrom = null;
  function backFromPlay() {
    if (history.state && history.state.nkStep === 'play') history.go(playFrom === 2 || playFrom === 'ref' ? -2 : -1);
    else renderMenu(1);
  }
  window.addEventListener('popstate', () => {
    // ページ内リンク（#faq など）の履歴は state を持たないので、画面はそのままにする
    const st = history.state && history.state.nkStep;
    if (st === 'ref') renderReference();
    else if (st === 1 || st === 2) renderMenu(st);
  });

  function renderMenu(step, keep) {
    NkModal.close();
    session = null;
    // 引数なし＝いまの段のまま描きなおす
    if (step === 2) menuStep = 2;
    else if (step !== undefined) menuStep = 1;
    // むずかしさの画面に来たときは何も選んでいない状態から始める（2026-09-27。かんじ修行などと同じ）
    if (step === 2 && !keep) selection.diffId = null;
    app.innerHTML = '';
    if (menuStep === 2) renderMenuStep2(); else renderMenuStep1();
    app.appendChild(NinjaLinks.el(SAKURANBO ? 'sakuranbo' : 'sansu'));
  }

  function renderMenuStep1() {
    const total = el('p', 'sa-total');
    total.innerHTML = 'いままで <strong>' + progress.totals.correct + '</strong> もん せいかい!';
    app.appendChild(total);

    // しゅるいは押したら次の画面へ進む
    // さくらんぼざん専用：もんだい を押したら そのまま始める（2段目は無い）
    const kinds = group('もんだいを えらぼう', MODES, 'modeId', (m) => ({
      label: m.name,
      note: m.note,
      disabled: !m.ready
    }), null, SAKURANBO ? startSession : goMenu2);
    // さくらんぼざんの やりかた（リファレンス）は、しゅるいの下にテキストリンクで置く（2026-09-23 ボタンから変更）
    if (SAKURANBO) {
      const refLink = el('button', 'sa-ref-link', 'さくらんぼざんの やりかた →');
      refLink.type = 'button';
      refLink.addEventListener('click', openReference);
      kinds.appendChild(refLink);
    }
    app.appendChild(kinds);

    app.appendChild(group('あそびかた', PLAYSTYLES, 'styleId', (s) => ({
      label: s.name,
      note: s.note
    })));

    const reset = el('button', 'sa-reset');
    reset.type = 'button';
    reset.appendChild(icon('reset-arrow', 'sa-reset-icon'));
    reset.appendChild(el('span', null, 'せいせきを リセットする'));
    reset.addEventListener('click', () => {
      if (!window.confirm('いままでの せいせきを ぜんぶ けしますか?')) return;
      progress = emptyProgress();
      saveProgress();
      renderMenu(1);
    });
    app.appendChild(reset);
  }

  // さんすうの2段目：えらんだ形で出せる むずかしさ を やさしい順に縦1列＋スタート
  function renderMenuStep2() {
    const chosenMode = findMode(selection.modeId);
    const chosenStyle = findStyle(selection.styleId);
    app.appendChild(el('p', 'sa-step-chosen', chosenMode.name + '・' + chosenStyle.name));

    const diffs = group('むずかしさ', DIFFS.filter((d) => chosenMode.levels.indexOf(d.id) !== -1), 'diffId', (d) => ({
      label: d.name,
      note: chosenMode.diffNote[d.id]
    }), null, () => renderMenu(2, true));
    diffs.classList.add('sa-group-diff');
    app.appendChild(diffs);

    const start = el('button', 'sa-start');
    start.type = 'button';
    start.appendChild(icon('rocket-simple', 'sa-start-icon'));
    start.appendChild(el('span', null, 'スタート'));
    start.addEventListener('click', startSession);
    // むずかしさを押すまでスタートは押せない
    if (!selection.diffId) start.disabled = true;
    app.appendChild(start);

    const back = el('button', 'sa-step-back', '← たしざん・ひきざん に もどる');
    back.type = 'button';
    back.addEventListener('click', () => history.back());
    app.appendChild(back);
  }

  function icon(name, cls) {
    const img = el('img', cls || 'sa-choice-icon');
    // 'route/〇〇' は とことん の天体（/assets/images/sansu/route/）
    img.src = '/assets/images/sansu/' + (name.indexOf('/') !== -1 ? name : 'icons/' + name) + '.png';
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }

  function group(title, items, key, describe, extra, onPick) {
    const wrap = el('section', 'sa-group');
    wrap.appendChild(el('h3', 'sa-group-title', title));
    const grid = el('div', 'sa-choices');
    items.forEach((item) => {
      const info = describe(item);
      const btn = el('button', 'sa-choice');
      btn.type = 'button';
      if (item.icon) btn.appendChild(icon(item.icon));
      if (item.img) {
        btn.classList.add('has-art');
        const art = el('img', 'sa-choice-art');
        art.src = item.img;
        art.alt = '';
        art.width = 180;
        art.height = 180;
        btn.appendChild(art);
      }
      const body = el('span', 'sa-choice-body');
      body.appendChild(el('span', 'sa-choice-label', info.label));
      if (info.note) body.appendChild(el('span', 'sa-choice-note', info.note));
      btn.appendChild(body);
      if (info.disabled) {
        btn.classList.add('is-disabled');
        btn.disabled = true;
      } else {
        // しゅるいは押したら次へ進むので選択ずみを出さない
        const shown = key !== 'modeId';
        if (shown && selection[key] === item.id) {
          btn.classList.add('is-on');
          btn.appendChild(icon('check-badge', 'sa-choice-check'));
        }
        btn.addEventListener('click', () => {
          selection[key] = item.id;
          if (onPick) onPick(item); else renderMenu();
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
    NkModal.close();
    session = null;
    app.innerHTML = '';

    const head = el('div', 'sa-play-head');
    const back = el('button', 'sa-back', '← もどる');
    back.type = 'button';
    back.addEventListener('click', () => history.back());
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

    // さくらんぼざん専用アプリでは「まえを わける」形も見せる（2026-09-28）
    if (SAKURANBO) {
      card.appendChild(el('p', 'sa-ref-example-title', 'まえを わける とき：4 + 8'));
      const f1 = el('div', 'sa-ref-step');
      f1.appendChild(el('span', 'sa-ref-step-no', '1'));
      const f1body = el('div', 'sa-ref-step-body');
      f1body.appendChild(el('p', 'sa-ref-step-text', 'うしろの 8 を 10に するには あと 2。まえの 4 を 2 と 2 に わける'));
      f1body.appendChild(refCherry(4, 8, 2, 2, 10, true));
      f1.appendChild(f1body);
      card.appendChild(f1);
      const f2 = el('div', 'sa-ref-step');
      f2.appendChild(el('span', 'sa-ref-step-no', '2'));
      const f2body = el('div', 'sa-ref-step-body');
      f2body.appendChild(el('p', 'sa-ref-step-text', '2 と 8 で 10、10 に のこりの 2 を たす'));
      f2body.appendChild(refFormula('2 + 8 = 10　10 + 2 = 12'));
      f2.appendChild(f2body);
      card.appendChild(f2);
      card.appendChild(el('p', 'sa-ref-answer', 'だから 4 + 8 = 12!'));
    }
    card.appendChild(el('p', 'sa-ref-tip', 'このゲームでは ①の「わける かず」を えらぶよ。'));

    const actions = el('div', 'sa-actions');
    const tryBtn = el('button', 'sa-btn sa-btn-primary', '🍒 やってみる');
    tryBtn.type = 'button';
    tryBtn.addEventListener('click', () => {
      selection.modeId = 'one-ushiro';
      startSession();
    });
    actions.appendChild(tryBtn);
    const backBtn = el('a', 'sa-btn', 'メニューに もどる');
    backBtn.href = 'javascript:void(0)';
    backBtn.addEventListener('click', () => history.back());
    actions.appendChild(backBtn);
    card.appendChild(actions);

    app.appendChild(card);
  }

  // リファレンス用：中身の入ったさくらんぼの図。front=true なら まえの数（a）を分ける
  function refCherry(a, b, need, rest, target, front) {
    const node = el('div', 'sa-problem sa-problem-cherry sa-ref-cherry' + (front ? ' is-front' : ''));
    const split = front ? a : b;
    const other = front ? b : a;
    const col = el('div', 'sa-cherry-col');
    col.appendChild(el('span', 'sa-term sa-cherry-top', String(split)));
    col.appendChild(el('div', 'sa-cherry-stem'));
    const pair = el('div', 'sa-cherry-pair');
    const targetSlot = el('div', 'sa-cherry-slot');
    targetSlot.appendChild(el('span', 'sa-cherry-ball is-target is-filled', String(need)));
    targetSlot.appendChild(el('span', 'sa-cherry-cap', other + ' と あわせて ' + target));
    const restSlot = el('div', 'sa-cherry-slot');
    restSlot.appendChild(el('span', 'sa-cherry-ball is-filled', String(rest)));
    if (front) { pair.appendChild(restSlot); pair.appendChild(targetSlot); }
    else { pair.appendChild(targetSlot); pair.appendChild(restSlot); }
    col.appendChild(pair);
    if (front) {
      node.appendChild(col);
      node.appendChild(el('span', 'sa-op', '+'));
      node.appendChild(el('span', 'sa-term', String(b)));
    } else {
      node.appendChild(el('span', 'sa-term', String(a)));
      node.appendChild(el('span', 'sa-op', '+'));
      node.appendChild(col);
    }
    return node;
  }

  function refFormula(text) {
    return el('p', 'sa-ref-formula', text);
  }

  // ---- プレイ ----
  function startSession() {
    if (!(history.state && history.state.nkStep === 'play')) {
      playFrom = history.state && history.state.nkStep;
      history.pushState({ nkStep: 'play' }, '');
    }
    // 問題と けっか は窓（ポップアップ）の中に出す。「とじる」はメニューへもどると同じ（2026-09-27）
    NkModal.open(app, { onClose: backFromPlay });
    const mode = findMode(selection.modeId);
    const diff = findDiff(selection.diffId);
    const style = findStyle(selection.styleId);
    session = {
      mode: mode, diff: diff, style: style,
      index: 0, correct: 0, locked: false, current: null,
      marks: [],   // 1もんごとの せいかい（true）／まちがい（false）。けっかの ★☆ に使う
      recent: [],   // 直近の問題文。連続で同じ問題を出さないため
      combo: 0, bestCombo: 0,   // 連続正解（COMBO）
      arrivedStage: null   // 直前に到着した天体のステージ番号（アイコン上に「到着!」を出す）
    };
    nextQuestion();
  }

  function nextQuestion() {
    if (session.style.id === 'challenge' && session.index >= CHALLENGE_LENGTH) return renderResult(false);
    // とことんは「正解数」で進む（毎回0スタート・地球→…→ほし の1回の旅）
    if (session.style.id === 'endless' && session.correct >= ENDLESS_MAX) return renderResult(true);
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
    // さくらんぼざん専用アプリには むずかしさ が無いので、もんだいの形（うしろの すうじを わける 等）を出す
    // もんだいの形（うしろの すうじを わける／2けた ＋ 1けた 等）と、さんすうは むずかしさ も出す
    // さんすうは「たしざん・ふつう」で足りるので、形の説明は さくらんぼざん だけ
    head.appendChild(el('span', 'sa-play-mode', s.mode.name +
      (SAKURANBO ? '（' + s.mode.note.replace(/（.*$/, '') + '）・' : '・' + s.diff.name + '・') + s.style.name));
    app.appendChild(head);

    app.appendChild(progressBar());

    const card = el('div', 'sa-card');
    // 上には「だい○もん」、問いかけ（こたえは どれ? など）は もんだいの枠の中に書く（2026-09-23）
    card.appendChild(el('p', 'sa-question-text', 'だい' + (s.index + 1) + 'もん'));

    const built = s.current.layout === 'cherry' ? cherryProblem(s.current) : plainProblem(s.current);
    built.node.classList.add('has-prompt');
    built.node.appendChild(el('span', 'sa-problem-prompt', s.current.prompt));
    card.appendChild(built.node);

    // 選択肢の上に「こたえを えらぼう」を出す（2026-09-28 ユーザー指示）。問題の枠と こたえの枠の役目を分けて見せる
    card.appendChild(el('p', 'sa-options-label', 'こたえを えらぼう'));
    const options = el('div', 'sa-options');
    const feedback = el('div', 'sa-feedback');
    feedback.innerHTML = '&nbsp;';

    s.current.options.forEach((val) => {
      const btn = el('button', 'sa-opt', String(val));
      btn.dataset.v = String(val);
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
      backFromPlay();
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
    // 「?」がこたえ（12 など）に変わると幅が広がり、式ぜんたいが左へずれてガタガタに見えた。
    // はじめから こたえの桁数ぶんの幅を取っておく（2026-09-28）
    total.style.minWidth = String(q.answer).length + 'ch';
    node.appendChild(total);
    return {
      node: node,
      reveal: () => { total.textContent = String(q.answer); }
    };
  }

  // さくらんぼ算：分ける数の真下にさくらんぼをぶら下げる（こたえは答えるまで伏せる）。
  // うしろを わける ときは うしろの数の下、まえを わける ときは まえの数の下。
  // 答えさせる玉（is-target）は、もう一方の数の がわ（となりあう がわ）に置く
  function cherryProblem(q) {
    const front = q.side === 'front';
    const split = front ? q.a : q.b;
    const other = front ? q.b : q.a;
    const node = el('div', 'sa-problem sa-problem-cherry' + (front ? ' is-front' : ''));

    const col = el('div', 'sa-cherry-col');
    col.appendChild(el('span', 'sa-term sa-cherry-top', String(split)));
    col.appendChild(el('div', 'sa-cherry-stem'));
    const pair = el('div', 'sa-cherry-pair');
    const targetSlot = el('div', 'sa-cherry-slot');
    const target = el('span', 'sa-cherry-ball is-target', '?');
    targetSlot.appendChild(target);
    targetSlot.appendChild(el('span', 'sa-cherry-cap', other + ' と あわせて ' + q.target));
    const restSlot = el('div', 'sa-cherry-slot');
    const rest = el('span', 'sa-cherry-ball', '?');
    restSlot.appendChild(rest);
    if (front) { pair.appendChild(restSlot); pair.appendChild(targetSlot); }
    else { pair.appendChild(targetSlot); pair.appendChild(restSlot); }
    col.appendChild(pair);

    // 式は「数 + 数」のかたまり（sa-cherry-expr）にして枠のまん中に置き、
    // 答えたあとに出す「= 13」は そのかたまりの右に場所を取らずに付ける（sa-cherry-tail）。
    // 場所を取ると、答えた瞬間に式ぜんたいが左へ動いてガタガタに見えた（2026-09-28）
    const expr = el('span', 'sa-cherry-expr');
    if (front) {
      expr.appendChild(col);
      expr.appendChild(el('span', 'sa-op', '+'));
      expr.appendChild(el('span', 'sa-term', String(q.b)));
    } else {
      expr.appendChild(el('span', 'sa-term', String(q.a)));
      expr.appendChild(el('span', 'sa-op', '+'));
      expr.appendChild(col);
    }

    // 「= ?」を先に出すと式の答え（16は?）を聞いているように見え、
    // 選択肢（分ける数）と噛み合わないため、答えるまで隠しておく
    const tail = el('span', 'sa-cherry-tail');
    const eq = el('span', 'sa-op sa-eq-late', '=');
    const total = el('span', 'sa-qmark sa-eq-late', '?');
    tail.appendChild(eq);
    tail.appendChild(total);
    expr.appendChild(tail);
    node.appendChild(expr);

    return {
      node: node,
      reveal: () => {
        target.textContent = String(q.need);
        rest.textContent = String(q.rest);
        target.classList.add('is-filled');
        rest.classList.add('is-filled');
        total.textContent = String(q.total);
        eq.classList.remove('sa-eq-late');
        total.classList.remove('sa-eq-late');
      }
    };
  }

  // 天体マーカー（★スタート／icon画像／絵文字）
  function bodyMarker(body, cls) {
    if (body.star) {
      const span = el('span', cls + ' is-star', '★');
      span.title = body.name;
      return span;
    }
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

  // COMBO の札は すすみぐあいの帯の まん中に置く（2026-09-28）。
  // 見出しの行に置いていたら、札が出た瞬間に見出しが2行に折れて画面ぜんたいが19px下がっていた。
  // 帯の文字は左右の端に固定なので、まん中の札の中身が変わっても何も動かない
  function comboBadge() {
    const combo = el('span', 'sa-combo');
    if (session.combo >= 2) {
      combo.classList.add('is-show');
      combo.textContent = '🔥 COMBO ×' + session.combo;
    }
    return combo;
  }

  function progressBar() {
    const s = session;
    const wrap = el('div', 'sa-track-card');
    const label = el('div', 'sa-track-label');

    if (s.style.id === 'challenge') {
      const done = s.index, goal = CHALLENGE_LENGTH;
      label.appendChild(el('span', null, 'うちゅうへ すすもう'));
      label.appendChild(comboBadge());
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

    // ── とことん：正解数で進む（必ず0からスタート）──
    const stage = Math.floor(s.correct / ENDLESS_STAGE);   // 0..9
    const done = s.correct - stage * ENDLESS_STAGE;
    const goal = ENDLESS_STAGE;
    const next = JOURNEY[stage + 1] || JOURNEY[JOURNEY.length - 1];

    const head = el('span', null);
    head.textContent = 'ステージ ' + (stage + 1) + ' / 10 ・ ' + next.name + ' へ';
    label.appendChild(head);
    label.appendChild(comboBadge());
    label.appendChild(el('span', null, done + ' / ' + goal + ' せいかい'));
    wrap.appendChild(label);

    // 星（到達地点）はバーの上に配置
    const route = el('div', 'sa-route');
    JOURNEY.slice(1).forEach((body, i) => {
      const no = i + 1;   // ステージ番号 1..10
      const stop = el('span', 'sa-route-stop');
      // 直前に到着した天体は、アイコンの上に「〇〇に とうちゃく!」を出す
      if (no === s.arrivedStage) {
        stop.appendChild(el('span', 'sa-route-bubble', body.name + ' に とうちゃく!'));
      }
      stop.appendChild(bodyMarker(body, 'sa-route-img'));
      if (no <= stage) stop.classList.add('is-done');
      else if (no === stage + 1) stop.classList.add('is-now');
      route.appendChild(stop);
    });
    wrap.appendChild(route);
    s.arrivedStage = null;   // 一度出したら消す

    const bar = el('div', 'sa-track');
    const fill = el('div', 'sa-track-fill');
    const pct = (done / goal) * 100;
    fill.style.width = pct + '%';
    // 出発点はいつも地球★（ステージが進んでも左端は地球のまま）
    bar.appendChild(bodyMarker(JOURNEY[0], 'sa-track-start'));
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
    s.marks.push(ok);
    showAnswerEffect(ok);
    if (ok) {
      btn.classList.add('is-correct');
      s.correct += 1;
      playCorrect();
      // さくらんぼ算は「分けたあと」の流れまで見せるのが学びどころ。
      // まえを わける ときは 10をつくる数が前に来る（4 + 8 → 2 + 8 = 10）。2026-09-28 修正
      feedback.textContent = q.layout === 'cherry'
        ? (q.side === 'front' ? q.need + ' + ' + q.b : q.a + ' + ' + q.need)
          + ' = ' + q.target + '、' + q.target + ' + ' + q.rest + ' = ' + q.total + '!'
        : pick(PRAISE_OK);
      feedback.classList.add('is-ok');
    } else {
      btn.classList.add('is-wrong');
      buttons.forEach((b) => {
        if (b.dataset.v === String(q.answer)) b.classList.add('is-correct');
      });
      playWrong();
      // 分けるのは まえを わける なら前の数。玉の並び（図の左から）と同じ順に言う
      feedback.textContent = q.layout === 'cherry'
        ? (q.side === 'front'
          ? q.a + ' は ' + q.rest + ' と ' + q.need + ' に わけるよ'
          : q.b + ' は ' + q.need + ' と ' + q.rest + ' に わけるよ')
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
      // 10問正解ごとに次の天体へ到着（次の画面で、その天体アイコンの上に「到着!」を出す）
      if (ok && s.correct % ENDLESS_STAGE === 0 && s.correct < ENDLESS_MAX) {
        s.arrivedStage = s.correct / ENDLESS_STAGE;
        setTimeout(playFanfare, 400);
      }
    }
    saveProgress();

    setTimeout(() => { if (session) nextQuestion(); }, 1200);
  }

  // 画面中央に短く出す答え合わせ演出。次の問題を邪魔しないようDOMは自動で片づける。
  function showAnswerEffect(ok) {
    const old = document.querySelector('.sa-answer-effect');
    if (old) old.remove();
    const effect = el('div', 'sa-answer-effect ' + (ok ? 'is-correct' : 'is-wrong'));
    effect.setAttribute('role', 'status');
    effect.setAttribute('aria-live', 'polite');
    const burst = el('div', 'sa-answer-burst');
    burst.setAttribute('aria-hidden', 'true');
    if (ok) ['★', '●', '★', '●', '★', '●', '★', '●'].forEach((mark, i) => {
      const particle = el('span', 'sa-answer-particle', mark);
      particle.style.setProperty('--i', i);
      burst.appendChild(particle);
    });
    const badge = el('div', 'sa-answer-badge');
    const mascot = el('img', 'sa-answer-icon');
    mascot.src = ok ? '/assets/images/sansu/icons/answer-maru.webp' : '/assets/images/sansu/icons/answer-batsu.webp';
    mascot.alt = ok ? 'まる' : 'ばつ';
    mascot.width = 240; mascot.height = 240;
    badge.appendChild(mascot);
    badge.appendChild(el('strong', 'sa-answer-title', ok ? 'せいかい!' : 'おしい!'));
    // 問題は窓（dialog）で開くので、ページ本体に付けると窓の後ろに隠れて見えなかった（2026-09-28 修正）。
    // 窓が開いていれば窓の中に出す
    effect.appendChild(burst); effect.appendChild(badge);
    (document.querySelector('dialog.nk-modal[open]') || document.body).appendChild(effect);
    setTimeout(() => effect.classList.add('is-leaving'), 850);
    setTimeout(() => effect.remove(), 1150);
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
        ENDLESS_MAX + 'もん せいかい! ' + goal.name + ' に とうちゃく! うちゅうの おうさまだ!'));
    } else {
      const rec = challengeRecord(s.mode.id, s.diff.id);
      rec.plays += 1;
      if (s.correct > rec.bestCorrect) rec.bestCorrect = s.correct;
      saveProgress();

      const stars = starsFor(s.correct);
      const score = el('p', 'sa-result-score');
      score.innerHTML = CHALLENGE_LENGTH + 'もん ちゅう <strong>' + s.correct + '</strong> もん せいかい!';
      card.appendChild(score);
      // 1もんずつ、せいかいは ★・まちがいは ☆ で10こ ならべる（2026-09-23。3段階の星から変更）
      const row = el('div', 'sa-result-marks');
      row.setAttribute('aria-label', CHALLENGE_LENGTH + 'もん ちゅう ' + s.correct + 'もん せいかい');
      for (let i = 0; i < CHALLENGE_LENGTH; i++) {
        const ok = s.marks[i] === true;
        const mark = el('span', 'sa-result-mark' + (ok ? ' is-ok' : ''), ok ? '★' : '☆');
        mark.setAttribute('aria-hidden', 'true');
        row.appendChild(mark);
      }
      card.appendChild(row);
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
    menu.addEventListener('click', () => { session = null; backFromPlay(); });
    actions.appendChild(menu);

    card.appendChild(actions);
    app.appendChild(card);
  }

  history.replaceState({ nkStep: 1 }, '');
  renderMenu(1);
})();
