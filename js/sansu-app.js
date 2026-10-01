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
  // さくらんぼざん も 6段（2026-10-03 ユーザー決定。それまでは ふつう・むずかしい・ちょうなんもん の3段）。
  // どれも くり上がり・くり下がり あり。やさしい段は「10を つくるのに たりない数」の小ささで分ける
  //   ちょうかんたん＝わける数が いつも 1（9 + 4・15 − 9・11 − 4）
  //   かんたん　　　＝わける数が 2・3（8 + 5・14 − 8・13 − 5）
  //   ふつう　　　　＝1けたどうし ぜんぶ／すこしむずかしい＝2けたと 1けた（28 + 5）
  //   むずかしい　　＝2けたどうし・つぎの10（38 + 25）／ちょうなんもん＝100 きじゅん（79 + 39）
  // id は さんすう と そろえて色分けの css を共用する
  const DIFFS = [
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

  // さくらんぼざん専用アプリ（2026-10-02 作りなおし。さんすう と同じ2段メニュー）。
  // 1段目：たしざん／ひきざん × うしろ／まえ を わける、2段目：ふつう・むずかしい・ちょうなんもん。
  //   たしざん うしろ：8 + 3 → 3 を 2 と 1（8 と あわせて 10）
  //   たしざん まえ　：4 + 8 → 4 を 2 と 2（ならった形：市販プリントの「まえの かずを わけて」）
  //   ひきざん うしろ：13 − 4 → 4 を 3 と 1（13 から 3 を ひいて 10。げんげんほう）
  //   ひきざん まえ　：13 − 8 → 13 を 10 と 3（10 から 8 を ひく。げんかほう）
  // 同じ数どうし（7 + 7）は どっちの 7 を わけるのか わからないので出さない（2026-10-02 ユーザー指示）。
  //
  // 答えは「分ける2つの数」をそのまま選ばせる（「2 と 1」。2026-09-28 ユーザー指示）。
  // need＝10の かたまりに使う玉、rest＝のこりの玉。needLeft で玉の並び（図の左から）を決め、答えの並びも同じにする。
  // まちがいの選択肢は「ほかの分け方」だけ。足しても元の数にならない組み合わせ（7 を 4 と 4）は出さない
  // （2026-10-02 ユーザー指示：分けたのに たして元にもどらないのは おかしい）。
  // 近い分け方（10の かたまりに使う玉が ±2 以内）を優先する。分け方が3つ以下の数（3・4）は ボタンも そのぶんだけ
  function toPairQuestion(q) {
    const left = q.needLeft;
    const split = q.split;
    const pair = (x) => (left ? x + ' と ' + (split - x) : (split - x) + ' と ' + x);
    const correct = pair(q.need);
    const others = [];
    for (let x = 1; x < split; x++) if (x !== q.need) others.push(x);
    const near = shuffle(others.filter((x) => Math.abs(x - q.need) <= 2));
    const far = shuffle(others.filter((x) => Math.abs(x - q.need) > 2));
    const opts = [correct].concat(near.concat(far).slice(0, 3).map(pair));
    q.answer = correct;
    q.options = shuffle(opts);
    q.ngText = split + ' は ' + correct + ' に わけるよ';
    // 正誤の解説：わけかた から こたえ までの流れを ぜんぶ書く（2026-10-02 ユーザー指示）
    q.explain = split + ' を ' + correct + ' に わけて、' + q.okText;
    q.steps = [split + ' を ' + correct + ' に わける'].concat(q.okText.replace('!', '').split('、'));
    // 2だんめ：わけたあと、式の こたえ（11 など）も選ばせる（2026-10-02 ユーザー指示：たす作業まで正解に入れる）。
    // 上限を20以上にして、10の かたまりを わすれた まちがい（11 → 1・21）も まぜる
    q.sumOptions = buildOptions(q.total, 1, Math.max(q.total + 10, 20));
    return q;
  }

  // 1の位が いくつ以上か（くり上がりを作るため、10を つくる ぶんより 大きくする）
  const onesOf = (n) => n % 10;

  // たしざん：大きいほう（big）を キリのいい数にし、小さいほう（small）を わける
  function makeCherryAdd(level, side) {
    let big, small;
    if (level === 'vs' || level === 's' || level === 'm') {
      // ちょうかんたん＝9（1 を もらう）／かんたん＝8・7（2・3 を もらう）／ふつう＝6〜9
      big = level === 'vs' ? 9 : level === 's' ? randInt(7, 8) : randInt(6, 9);
      // 同じ数は出さない（7 + 7 → どっちの 7 か わからない）。2 は 1 と 1 にしか分けられないので3から
      small = randInt(Math.max(3, 11 - big), big - 1);
    } else if (level === 'h') {
      do { big = randInt(11, 89); } while (onesOf(big) < 2);   // 1の位が0・1だと くり上がりが作れない
      small = randInt(Math.max(3, 11 - onesOf(big)), 9);
    } else if (level === 'h2') {
      // 2けた ＋ 2けた で つぎの10を つくる（38 + 25 → 25 を 2 と 23、38 + 2 = 40）。こたえは100まで
      do {
        big = randInt(12, 88);
        small = randInt(11, big - 1);
      } while (onesOf(big) < 2 || onesOf(small) < 10 - onesOf(big) || big + small > 99);
    } else {
      // ちょうなんもん：100 を きじゅんに する（79 + 39 → 39 を 21 と 18、79 + 21 = 100。2026-10-02 ユーザー指示）。
      // 2けた ＋ 2けた で こたえは かならず100を こえる。分けるのは いつも小さいほう（46 + 45 で 46 を わけるのは不自然）
      big = randInt(56, 98);
      small = randInt(Math.max(11, 101 - big), big - 1);
    }
    const target = level === 'l' ? 100 : (Math.floor(big / 10) + 1) * 10;
    const need = target - big;
    const front = side === 'front';
    const a = front ? small : big;
    const b = front ? big : small;
    return toPairQuestion({
      layout: 'cherry',
      op: '+',
      prompt: big + ' と あわせて ' + target + ' に なるように ' + small + ' を わけよう',
      cap: big + ' と あわせて ' + target,
      text: a + ' + ' + b,
      side: side, needLeft: !front,
      a: a, b: b, split: small, need: need, rest: small - need, total: a + b,
      okText: (front ? need + ' + ' + big : big + ' + ' + need) + ' = ' + target + '、'
        + target + ' + ' + (small - need) + ' = ' + (a + b) + '!'
    });
  }

  // ひきざん：くり下がりが ある組み合わせを作る（ひく数の1の位が、ひかれる数の1の位より大きい）
  // やさしい段は、まえを わける（げんかほう）なら「10 から ひく数」、うしろを わける（げんげんほう）なら「ひかれる数の1の位」を
  // 小さくする。ちょうかんたん＝15 − 9（10 − 9 = 1）・11 − 4（4 を 1 と 3）、かんたん＝14 − 8・13 − 5
  function drawSub(level, side) {
    const front = side === 'front';
    for (;;) {
      let a, b;
      // ひく数は3から（2 は 1 と 1 にしか分けられない）
      if (level === 'vs') { a = front ? randInt(11, 18) : 11; b = front ? 9 : randInt(3, 9); }
      else if (level === 's') { a = front ? randInt(11, 18) : randInt(12, 13); b = front ? randInt(7, 8) : randInt(3, 9); }
      else if (level === 'm') { a = randInt(11, 18); b = randInt(3, 9); }
      else if (level === 'h') { a = randInt(21, 98); b = randInt(3, 9); }
      // むずかしい：2けた − 2けた（62 − 25）
      else if (level === 'h2') { a = randInt(21, 99); b = randInt(11, a - 1); }
      // ちょうなんもん：100 を きじゅんに する（132 − 94。たしざん と そろえる）。こたえは100より小さい
      else { a = randInt(101, 198); b = randInt(11, 99); if (a - b < 100) return [a, b]; continue; }
      if (onesOf(b) > onesOf(a) && onesOf(a) >= 1) return [a, b];
    }
  }

  function makeCherrySub(level, side) {
    const [a, b] = drawSub(level, side);
    if (side === 'back') {
      // げんげんほう：うしろの数を「まえの数の1の位」と のこりに わけ、キリのいい数まで ひいてから のこりを ひく。
      // ちょうなんもん は 100 まで ひく（132 − 94 → 94 を 32 と 62）
      const need = level === 'l' ? a - 100 : onesOf(a);
      const base = a - need;
      return toPairQuestion({
        layout: 'cherry',
        op: '−',
        prompt: a + ' から ひいて ' + base + ' に なるように ' + b + ' を わけよう',
        cap: a + ' から ひいて ' + base,
        text: a + ' − ' + b,
        side: 'back', needLeft: true,
        a: a, b: b, split: b, need: need, rest: b - need, total: a - b,
        okText: a + ' − ' + need + ' = ' + base + '、' + base + ' − ' + (b - need) + ' = ' + (a - b) + '!'
      });
    }
    // げんかほう：まえの数から「ひく数を ひける キリのいい数」を とりだし、ひいた のこりを たす。
    // ちょうなんもん は 100 を とりだす（132 − 94 → 132 を 100 と 32）
    const block = level === 'l' ? 100 : Math.ceil(b / 10) * 10;
    const diff = block - b;
    return toPairQuestion({
      layout: 'cherry',
      op: '−',
      prompt: block + ' から ' + b + ' を ひけるように ' + a + ' を わけよう',
      // 「ここから ひく」だと どこから ひくのか 分かりにくかった。わけた 10 から ひいて、のこりを たす と書く。
      // わける前に「3 を たす」まで出すと こたえが わかるので、わけたあと（capDone）で書きたす（2026-10-03 ユーザー指示）
      cap: block + ' から ' + b + ' を ひく',
      capDone: block + ' から ' + b + ' を ひいて、' + (a - block) + ' を たす',
      text: a + ' − ' + b,
      side: 'front', needLeft: true,
      a: a, b: b, split: a, need: block, rest: a - block, total: a - b,
      okText: block + ' − ' + b + ' = ' + diff + '、' + diff + ' + ' + (a - block) + ' = ' + (a - b) + '!'
    });
  }

  // さくらんぼざん専用：1段目で しゅるい（3つ）、2段目で むずかしさ（2026-10-02 ユーザー指示。さんすう と同じ作り）。
  // たしざんは「小さいほうを わける」だけなので1まい。まえを わける（4 + 8）は1けたどうし（ちょうかんたん〜ふつう）にだけ まぜる
  // （2けたで まえを わける 5 + 28 は 教科書に出ず、子どもも 28 に 2 を たす と考える。ユーザーと決定）。
  // ひきざんは げんかほう（まえ）と げんげんほう（うしろ）で やりかたが ちがうので2まい。
  // カードの絵の場所には、どっちの数を わけるかが ひと目で わかる小さな式（demo）を出す（絵は使わない。2026-10-02 ユーザー指示）
  const CHERRY_LEVELS = ['vs', 's', 'm', 'h', 'h2', 'l'];
  const ONE_DIGIT = { vs: true, s: true, m: true };
  const MODES = SAKURANBO ? [
    { id: 'add', name: 'たしざん', note: 'ちいさい ほうの すうじを わける', ready: true,
      demo: { a: 8, b: 3, op: '+', side: 'back' }, levels: CHERRY_LEVELS,
      make: (d) => makeCherryAdd(d.id, ONE_DIGIT[d.id] && Math.random() < 0.5 ? 'front' : 'back'),
      diffNote: { vs: '9 ＋ 1けた（9 + 4）', s: '8・7 ＋ 1けた（8 + 5）', m: '1けた ＋ 1けた（6 + 5・4 + 8）',
        h: '2けた ＋ 1けた（28 + 5）', h2: '2けた ＋ 2けた（38 + 25）', l: '100を つくる・2けた ＋ 2けた（79 + 39）' } },
    { id: 'sub-front', name: 'ひきざん', note: 'まえの すうじを わける', ready: true,
      demo: { a: 13, b: 8, op: '−', side: 'front' }, levels: CHERRY_LEVELS,
      make: (d) => makeCherrySub(d.id, 'front'),
      diffNote: { vs: '9 を ひく（15 − 9）', s: '8・7 を ひく（14 − 8）', m: '10と いくつ − 1けた（13 − 6）',
        h: '2けた − 1けた（43 − 8）', h2: '2けた − 2けた（62 − 25）', l: '100から ひく・100を こえる かず − 2けた（132 − 94）' } },
    { id: 'sub-back', name: 'ひきざん', note: 'うしろの すうじを わける', ready: true,
      demo: { a: 13, b: 4, op: '−', side: 'back' }, levels: CHERRY_LEVELS,
      make: (d) => makeCherrySub(d.id, 'back'),
      diffNote: { vs: '11 から ひく（11 − 4）', s: '12・13 から ひく（13 − 5）', m: '10と いくつ − 1けた（16 − 7）',
        h: '2けた − 1けた（43 − 6）', h2: '2けた − 2けた（62 − 25）', l: '100から ひく・100を こえる かず − 2けた（132 − 94）' } }
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
      // さくらんぼざん は 2026-10-03 に 6段へ。それまでの h2（2けた と 1けた）は いまの h なので、せいせきを移す
      if (parsed && parsed.version === 2 && SAKURANBO && !parsed.sixLevels) {
        ['challenge', 'endless'].forEach((k) => {
          const old = parsed[k] || {};
          parsed[k] = {};
          Object.keys(old).forEach((key) => { parsed[k][key.replace(/:h2$/, ':h')] = old[key]; });
        });
        parsed.sixLevels = true;
      }
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
  // 効果音の ON／OFF（2026-10-02 ユーザー指示）。さんすう・さくらんぼざん で共通の設定にする
  const SOUND_KEY = 'sansuSound';
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { /* 読めなければ ON */ }

  // 問題画面の見出しの右に置く 🔊／🔇 ボタン
  function soundButton() {
    const btn = el('button', 'sa-sound');
    btn.type = 'button';
    const paint = () => {
      btn.textContent = soundOn ? '🔊' : '🔇';
      btn.setAttribute('aria-label', soundOn ? 'こうかおん オン（おすと けす）' : 'こうかおん オフ（おすと だす）');
      btn.setAttribute('aria-pressed', String(!soundOn));
      btn.classList.toggle('is-off', !soundOn);
    };
    paint();
    btn.addEventListener('click', () => {
      soundOn = !soundOn;
      try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch (e) { /* 保存できなくても その場は切りかわる */ }
      paint();
    });
    return btn;
  }

  let audioCtx = null;
  function playTone(freq, start, dur, type, gain) {
    if (!soundOn) return;
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
  let selection = { modeId: 'add', diffId: null, styleId: 'challenge' };
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
  // 2段。1段目で もんだいの形、2段目で むずかしさ＋スタート（さんすう 2026-09-30、さくらんぼざん 2026-10-02）
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
    const kinds = group('もんだいを えらぼう', MODES, 'modeId', (m) => ({
      label: m.name,
      note: m.note,
      disabled: !m.ready
    }), null, goMenu2);
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
    app.appendChild(el('p', 'sa-step-chosen', modeTitle(chosenMode) + '・' + chosenStyle.name));

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

    const back = el('button', 'sa-step-back', SAKURANBO ? '← もんだいの しゅるいに もどる' : '← たしざん・ひきざん に もどる');
    back.type = 'button';
    back.addEventListener('click', () => history.back());
    app.appendChild(back);
  }

  // さくらんぼざん の ひきざん は2枚あるので、わけかた まで短く言う（「ひきざん（まえを わける）」）。
  // 長いと スマホの見出しが2行に折れる
  function modeTitle(mode) {
    return SAKURANBO && mode.id !== 'add' ? mode.name + '（' + mode.note.replace('の すうじを', 'を') + '）' : mode.name;
  }

  function icon(name, cls) {
    const img = el('img', cls || 'sa-choice-icon');
    // 'route/〇〇' は とことん の天体（/assets/images/sansu/route/）
    img.src = '/assets/images/sansu/' + (name.indexOf('/') !== -1 ? name : 'icons/' + name) + '.png';
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }

  // しゅるいカード用の小さな式：わける数を赤くし、その下に さくらんぼを ぶら下げる。もう一方の数は うすくする
  function cherryDemo(d) {
    const wrap = el('span', 'sa-choice-demo');
    wrap.setAttribute('aria-hidden', 'true');
    const num = (n, split) => {
      if (!split) return el('span', 'sa-demo-num', String(n));
      const col = el('span', 'sa-demo-col');
      col.appendChild(el('span', 'sa-demo-num is-split', String(n)));
      col.insertAdjacentHTML('beforeend',
        '<svg class="sa-demo-cherry" viewBox="0 0 44 34" aria-hidden="true">' +
        '<path d="M22 1v7M22 8 11 21M22 8l11 13" stroke="#6fbf4a" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M23 3c4-3 9-2 11 0-3 3-8 3-11 0z" fill="#8fd16a"/>' +
        '<circle cx="11" cy="25" r="8" fill="#e8424f"/><circle cx="33" cy="25" r="8" fill="#e8424f"/>' +
        '<circle cx="8.5" cy="22" r="2.4" fill="#ffb3b3"/><circle cx="30.5" cy="22" r="2.4" fill="#ffb3b3"/></svg>');
      return col;
    };
    wrap.appendChild(num(d.a, d.side === 'front'));
    wrap.appendChild(el('span', 'sa-demo-op', d.op));
    wrap.appendChild(num(d.b, d.side === 'back'));
    return wrap;
  }

  function group(title, items, key, describe, extra, onPick) {
    const wrap = el('section', 'sa-group');
    wrap.appendChild(el('h3', 'sa-group-title', title));
    const grid = el('div', 'sa-choices');
    items.forEach((item) => {
      const info = describe(item);
      const btn = el('button', 'sa-choice');
      btn.type = 'button';
      btn.dataset.id = item.id;   // むずかしさの色分け（css の .sa-group-diff [data-id]）に使う
      if (item.icon) btn.appendChild(icon(item.icon));
      if (item.demo) btn.classList.add('has-art');
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
      // さくらんぼざん の小さな式は「たしざん」と「まえの すうじを わける」の あいだに置く（2026-10-02 ユーザー指示）
      if (item.demo) body.appendChild(cherryDemo(item.demo));
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
      selection.modeId = 'add';
      selection.diffId = 'm';
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
    if (window.NkTrack) NkTrack('mode_select', trackParams());
    nextQuestion();
  }

  // GA4 のイベントに付ける値（#97）。さくらんぼざんは むずかしさ が無いので level は あそびかた
  function trackParams() {
    return {
      app: SAKURANBO ? 'sakuranbo' : 'sansu',
      mode: session.mode.id,
      level: SAKURANBO ? session.style.id : session.diff.id + ':' + session.style.id
    };
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
    // さんすうは「たしざん・ふつう」で足りるので、わけかた の説明は さくらんぼざん だけ
    head.appendChild(el('span', 'sa-play-mode', modeTitle(s.mode) + '・' + s.diff.name + '・' + s.style.name));
    head.appendChild(soundButton());
    app.appendChild(head);

    app.appendChild(progressBar());

    const card = el('div', 'sa-card');
    // 上には「だい○もん」、問いかけ（こたえは どれ? など）は もんだいの枠の中に書く（2026-09-23）
    card.appendChild(el('p', 'sa-question-text', 'だい' + (s.index + 1) + 'もん'));

    const built = s.current.layout === 'cherry' ? cherryProblem(s.current) : plainProblem(s.current);
    built.node.classList.add('has-prompt');
    built.prompt = el('span', 'sa-problem-prompt', s.current.prompt);
    built.node.appendChild(built.prompt);
    card.appendChild(built.node);

    // 選択肢の上に「こたえを えらぼう」を出す（2026-09-28 ユーザー指示）。問題の枠と こたえの枠の役目を分けて見せる
    card.appendChild(el('p', 'sa-options-label', 'こたえを えらぼう'));
    const options = el('div', 'sa-options');
    const feedback = el('div', 'sa-feedback');
    feedback.innerHTML = '&nbsp;';

    fillOptions(options, s.current.options, feedback, built);
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

  function fillOptions(options, values, feedback, built) {
    options.innerHTML = '';
    values.forEach((val) => {
      const btn = el('button', 'sa-opt', String(val));
      btn.dataset.v = String(val);
      btn.type = 'button';
      btn.addEventListener('click', () => answer(val, btn, options, feedback, built));
      options.appendChild(btn);
    });
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
  // 10の かたまりに使う玉（is-target）の位置は needLeft で決まる（たしざんは もう一方の数の がわ）
  function cherryProblem(q) {
    const front = q.side === 'front';
    const split = q.split;
    // 3けたが出る ちょうなんもん は、スマホ幅で「= 108」が枠の外へ はみ出すので、css で式を小さくする
    const long = Math.max(q.a, q.b, q.total) >= 100;
    const node = el('div', 'sa-problem sa-problem-cherry' + (front ? ' is-front' : '') + (long ? ' is-long' : ''));

    const col = el('div', 'sa-cherry-col');
    col.appendChild(el('span', 'sa-term sa-cherry-top', String(split)));
    col.appendChild(el('div', 'sa-cherry-stem'));
    const pair = el('div', 'sa-cherry-pair');
    const targetSlot = el('div', 'sa-cherry-slot');
    const target = el('span', 'sa-cherry-ball is-target', '?');
    targetSlot.appendChild(target);
    const cap = el('span', 'sa-cherry-cap', q.cap);
    targetSlot.appendChild(cap);
    const restSlot = el('div', 'sa-cherry-slot');
    const rest = el('span', 'sa-cherry-ball', '?');
    restSlot.appendChild(rest);
    if (q.needLeft) { pair.appendChild(targetSlot); pair.appendChild(restSlot); }
    else { pair.appendChild(restSlot); pair.appendChild(targetSlot); }
    col.appendChild(pair);

    // 式は「数 + 数」のかたまり（sa-cherry-expr）にして枠のまん中に置き、
    // 答えたあとに出す「= 13」は そのかたまりの右に場所を取らずに付ける（sa-cherry-tail）。
    // 場所を取ると、答えた瞬間に式ぜんたいが左へ動いてガタガタに見えた（2026-09-28）
    const expr = el('span', 'sa-cherry-expr');
    if (front) {
      expr.appendChild(col);
      expr.appendChild(el('span', 'sa-op', q.op));
      expr.appendChild(el('span', 'sa-term', String(q.b)));
    } else {
      expr.appendChild(el('span', 'sa-term', String(q.a)));
      expr.appendChild(el('span', 'sa-op', q.op));
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
      // 1だんめを答えたら さくらんぼの中身を埋め、式に「= ?」を出す（2だんめで答える）
      revealSplit: () => {
        target.textContent = String(q.need);
        rest.textContent = String(q.rest);
        target.classList.add('is-filled');
        rest.classList.add('is-filled');
        if (q.capDone) cap.textContent = q.capDone;
        eq.classList.remove('sa-eq-late');
        total.classList.remove('sa-eq-late');
      },
      reveal: () => { total.textContent = String(q.total); }
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

  function answer(val, btn, options, feedback, built) {
    const s = session;
    if (s.locked) return;
    s.locked = true;

    const q = s.current;
    const buttons = options.querySelectorAll('.sa-opt');
    buttons.forEach((b) => { b.disabled = true; });

    // さくらんぼざん は1もん2だん：①わける → ②たす（ひく）。①は まちがえても正しい分け方を見せて②へ進む
    if (q.layout === 'cherry' && !q.splitDone) {
      q.splitDone = true;
      q.splitOk = val === q.answer;
      built.revealSplit();
      markButtons(buttons, btn, q.splitOk, q.answer);
      if (q.splitOk) playCorrect(); else playWrong();
      feedback.textContent = (q.splitOk ? 'そう! ' + q.split + ' は ' + q.answer : q.ngText) + '。つぎは こたえ!';
      feedback.classList.add(q.splitOk ? 'is-ok' : 'is-ng');
      setTimeout(() => {
        if (!session || session.current !== q) return;
        built.prompt.textContent = 'こたえは どれ?';
        feedback.classList.remove('is-ok', 'is-ng');
        feedback.innerHTML = '&nbsp;';
        fillOptions(options, q.sumOptions, feedback, built);
        s.locked = false;
      }, 1000);
      return;
    }

    if (built.reveal) built.reveal();   // 式のこたえを埋める
    const expected = q.layout === 'cherry' ? q.total : q.answer;
    // さくらんぼざん は ①わける と ②こたえ の両方が合って せいかい
    const ok = val === expected && (q.layout !== 'cherry' || q.splitOk);
    s.marks.push(ok);
    // さくらんぼざん は 選択肢の場所に 解説を出し、「つぎへ」を押すまで待つ（2026-10-02 ユーザー指示）。
    // 1.2秒で次へ進むと読む前に消えていた。絵に重ねると問題が見えなくなるので、選択肢と入れかえる。
    // まちがいの「おしい!」は出さない（解説で こたえが わかるため。ユーザー指示）
    const cherry = q.layout === 'cherry';
    showAnswerEffect(ok, cherry && !ok);
    if (cherry) {
      setTimeout(() => {
        if (!session || session.current !== q) return;
        showExplain(options, feedback, {
          ok: ok,
          head: ok ? 'せいかい! こたえは ' + expected : (val === expected ? 'こたえは あってる! わけかたを みてみよう' : 'こたえは ' + expected),
          steps: q.steps
        });
      }, 500);
    }
    markButtons(buttons, btn, val === expected, expected);
    if (ok) {
      s.correct += 1;
      playCorrect();
      // さくらんぼ算は「分けたあと」の流れまで見せるのが学びどころ（文は出題の okText）
      if (!cherry) {
        feedback.textContent = pick(PRAISE_OK);
        feedback.classList.add('is-ok');
      }
    } else {
      playWrong();
      if (!cherry) {
        feedback.textContent = pick(PRAISE_NG) + ' こたえは ' + q.answer;
        feedback.classList.add('is-ng');
      }
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

    if (!cherry) setTimeout(() => { if (session) nextQuestion(); }, 1200);
  }

  // 押したボタンに ○／× の色、まちがえたときは正しいボタンにも ○ の色を付ける
  function markButtons(buttons, btn, ok, expected) {
    btn.classList.add(ok ? 'is-correct' : 'is-wrong');
    if (!ok) buttons.forEach((b) => { if (b.dataset.v === String(expected)) b.classList.add('is-correct'); });
  }

  // 選択肢の場所を 解説（①わける ②10を つくる ③のこり）と「つぎへ」に入れかえる（さくらんぼざん）
  function showExplain(options, feedback, ex) {
    options.innerHTML = '';
    options.classList.add('is-explain');
    feedback.classList.remove('is-ok', 'is-ng');
    feedback.innerHTML = '&nbsp;';
    const label = app.querySelector('.sa-options-label');
    if (label) label.textContent = 'ときかた';
    const panel = el('div', 'sa-explain ' + (ex.ok ? 'is-ok' : 'is-ng'));
    panel.appendChild(el('p', 'sa-explain-head', ex.head));
    const list = el('ol', 'sa-explain-steps');
    ex.steps.forEach((t) => list.appendChild(el('li', null, t)));
    panel.appendChild(list);
    const next = el('button', 'sa-btn sa-btn-primary sa-explain-next', 'つぎへ →');
    next.type = 'button';
    next.addEventListener('click', () => { if (session) nextQuestion(); });
    panel.appendChild(next);
    options.appendChild(panel);
    next.focus({ preventScroll: true });
  }

  // 画面中央に短く出す答え合わせ演出。次の問題を邪魔しないようDOMは自動で片づける。
  // noTitle＝「おしい!」の文字を出さない（さくらんぼざん の まちがい）
  function showAnswerEffect(ok, noTitle) {
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
    if (!noTitle) badge.appendChild(el('strong', 'sa-answer-title', ok ? 'せいかい!' : 'おしい!'));
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
    if (window.NkTrack) {
      const tp = trackParams();
      tp.score = s.correct;
      tp.total = complete ? ENDLESS_MAX : CHALLENGE_LENGTH;
      NkTrack('set_complete', tp);
    }

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
