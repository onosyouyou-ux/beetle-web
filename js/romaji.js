/* ============================================================
   romaji.js — ローマ字修行（3モード・1セット10問）
   データは js/romaji-data.js（window.ROMAJI_DATA）が単一のデータ源。

   このアプリの中心は「いま学校で習うのはヘボン式（2025年12月の内閣告示で基本に）、
   まえの教科書は訓令式で、どちらも間違いではない」と分かること。
   だから「うつ」モードは **どちらの書き方でも正解にする**。
   採点はすべてブラウザの中で行い、サーバーには何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var D = window.ROMAJI_DATA;
  var root = document.getElementById('rj-app');
  if (!root || !D) return;

  var QUESTIONS = 10;
  var SMALL_Y = 'ゃゅょ';
  var VOWEL_HEAD = 'aiueoy'; // 「ん」のあとが この音で 始まると n だけでは 区切れない

  var state = null;
  // よむ・うつ・かく は もとからの 32語だけで出す（2026-10-07。レベル しゅぎょう用に 100語へ ふやしたが、
  // 実際に使われているので いままでの しゅぎょうの 手ざわりは 変えない）
  var STD = D.words.filter(function (w) { return w.std; });

  /* ---------- ちいさな どうぐ ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pick(arr, n) { return shuffle(arr.slice()).slice(0, n); }

  /* ---------- かな → モーラ（拗音は2文字で1つ、っ は そのまま） ---------- */

  function toMora(kana) {
    var out = [];
    for (var i = 0; i < kana.length; i++) {
      var c = kana[i];
      var next = kana[i + 1];
      if (next && SMALL_Y.indexOf(next) >= 0) {
        out.push(c + next);
        i++;
      } else {
        out.push(c);
      }
    }
    return out;
  }

  /* ---------- モーラ → ありうる ローマ字（ヘボン式・訓令式の どちらも） ----------
     ・ちいさい「っ」は つぎの 音の さいしょの 字を かさねる（kitte・gakkou）
     ・「ん」は n。ただし つぎが 母音や y で 始まるときは nn か n'（sin'you） */

  function romanizations(kana) {
    var mora = toMora(kana);
    var results = [''];

    for (var i = 0; i < mora.length; i++) {
      var m = mora[i];
      var variants;

      if (m === 'っ') {
        // つぎの 音を 見て、その さいしょの 字を かさねる
        var nextMora = mora[i + 1];
        var nextRomas = nextMora ? (D.mora[nextMora] || []) : [];
        var heads = {};
        nextRomas.forEach(function (r) { heads[r.charAt(0)] = true; });
        variants = Object.keys(heads);
        if (!variants.length) variants = [''];
      } else if (m === 'ん') {
        var after = mora[i + 1];
        var afterRomas = after ? (D.mora[after] || []) : [];
        var needsMark = afterRomas.some(function (r) { return VOWEL_HEAD.indexOf(r.charAt(0)) >= 0; });
        variants = needsMark ? ['nn', "n'"] : ['n', 'nn'];
      } else {
        variants = D.mora[m];
        if (!variants) return [];  // 表にない かな は 出題しない
      }

      var grown = [];
      results.forEach(function (base) {
        variants.forEach(function (v) { grown.push(base + v); });
      });
      // 組み合わせが 増えすぎないように 上限を つける
      results = grown.slice(0, 400);
    }
    return results;
  }

  /* 見せる用のローマ字（style: 'kunrei' か 'hepburn'）。
     かな1つぶんずつの かたまり（shinbun → shi・n・bu・n）で返す。
     「よむ」の問題は この かたまりごとに 下線を引き、どこまでが 1つの かな かを 見せる（2026-09-30） */
  function renderParts(kana, style) {
    var mora = toMora(kana);
    var out = [];
    for (var i = 0; i < mora.length; i++) {
      var m = mora[i];
      if (m === 'っ') {
        var nextRomas = D.mora[mora[i + 1]] || [''];
        out.push(pickStyle(nextRomas, style).charAt(0));
      } else if (m === 'ん') {
        var afterRomas = D.mora[mora[i + 1]] || [];
        var needsMark = afterRomas.some(function (r) { return VOWEL_HEAD.indexOf(r.charAt(0)) >= 0; });
        out.push(needsMark ? "n'" : 'n');
      } else {
        out.push(pickStyle(D.mora[m] || [''], style));
      }
    }
    return out;
  }

  function render(kana, style) { return renderParts(kana, style).join(''); }

  /* mora の配列は 先頭がヘボン式（いま習う形）、2つ目以降が訓令式など まえの書き方 */
  function pickStyle(variants, style) {
    if (style === 'kunrei') return variants[variants.length > 1 ? 1 : 0];
    return variants[0];
  }

  /* ---------- 出題づくり ---------- */

  // list を わたすと レベル しゅぎょう用（2026-10-07）。ランダムを使わず、
  // 書き方（ヘボン式／訓令式を1問ごとに交互）・まちがいの選択肢（同じレベルの ことば）・選択肢の並びも 固定する
  function buildYomu(list) {
    var fixed = !!list;
    return (list || pick(STD, QUESTIONS)).map(function (x, i) {
      var style = fixed ? (i % 2 ? 'kunrei' : 'hepburn') : (Math.random() < 0.5 ? 'kunrei' : 'hepburn');
      var wrongs = fixed
        ? [1, 3, 6].map(function (d) { return list[(i + d) % list.length].k; })
        : pick(STD.filter(function (y) { return y.k !== x.k; }), 3).map(function (y) { return y.k; });
      var choices = [x.k].concat(wrongs);
      if (fixed) choices = choices.slice(4 - i % 4).concat(choices.slice(0, 4 - i % 4));  // 正解の位置を 1問ごとに ずらす
      else shuffle(choices);
      return {
        type: 'yomu',
        show: render(x.k, style),
        parts: renderParts(x.k, style),
        word: x.k,
        hint: x.hint,
        cat: style === 'hepburn' ? 'ヘボンしき（いま がっこうで ならう かきかた）' : 'くんれいしき（まえの きょうかしょの かきかた）',
        choices: choices,
      };
    });
  }

  function buildUtsu(list) {
    return (list || pick(STD, QUESTIONS)).map(function (x) {
      var kunrei = render(x.k, 'kunrei');
      var hepburn = render(x.k, 'hepburn');
      // 「やさい」のように shi/chi/tsu を ふくまない ことばは 2つの 書き方が 同じになる。
      // その ときに 'yasai / yasai' と 並べると、ちがいが あるように 見えて まぎらわしい。
      var same = kunrei === hepburn;
      // 「ほんや」のように「ん」の あとが あ行・や行 だと hon'ya / honnya の 2とおりが せいかい。
      // 訓令式と ヘボン式が 同じでも「ひとつだけ」とは言えないので、2つとも 見せる（2026-09-27）
      var nMark = hepburn.indexOf("n'") >= 0;
      var word = !same ? hepburn + ' / ' + kunrei
        : nMark ? hepburn + ' / ' + hepburn.replace(/n'/g, 'nn')
          : hepburn;
      return {
        type: 'utsu',
        show: x.k,
        word: word,
        answers: romanizations(x.k),
        hint: x.hint,
        cat: same && !nMark ? 'かきかたは ひとつだけ' : 'どちらの かきかたでも せいかい',
      };
    });
  }

  function buildFutatsu() {
    var qs = [];
    while (qs.length < QUESTIONS) {
      shuffle(D.futatsu.slice()).forEach(function (p) {
        if (qs.length >= QUESTIONS) return;
        // いつも「あたらしい かきかた」を問う（2026-10-01 ユーザー指示）。
        // まえの かきかた（くんれいしき）を答えさせると、これから使わない形を覚えさせることになるため
        qs.push({
          type: 'futatsu',
          show: p.kana,
          lead: 'あたらしい かきかた（ヘボンしき）は どっち？',
          word: p.hepburn,
          hint: D.whyTwo.replace('{kunrei}', p.kunrei).replace('{hepburn}', p.hepburn) + '　例：' + p.ex,
          cat: '2とおりの かきかた',
          choices: shuffle([p.hepburn, p.kunrei]),
        });
      });
    }
    return qs;
  }

  // かくモードは「うつ」と同じ出題（ことば・正解・解説）を そのまま使う。
  // ちがうのは 答えかた（キーボード か 手書き）だけ。
  function buildKaku(list) {
    return buildUtsu(list).map(function (q) { q.type = 'kaku'; return q; });
  }

  // レベル しゅぎょう（2026-10-07）。えらんだ レベルの 10語を データの並びのまま 出す。
  // シャッフルしないので、おなじ レベルを えらべば クラス全員が おなじ問題を おなじ順番で とける。
  // 答えかたは よむ・うつ・かく から えらぶ（LEVEL_KINDS）
  var LEVEL_KINDS = ['yomu', 'utsu', 'kaku'];
  function buildLevel(lv, kind) {
    return MODES[kind].build(D.words.filter(function (w) { return w.lv === lv; }));
  }

  var MODES = {
    yomu:    { label: 'ローマ字を よむ',   sub: 'ローマ字を みて ことばを あてる', build: buildYomu },
    utsu:    { label: 'キーボードで うつ', sub: 'ひらがなを ローマ字で うつ',  build: buildUtsu },
    kaku:    { label: 'ローマ字を かく',   sub: 'ひらがなを ローマ字で かいて まるつけ', build: buildKaku },
    futatsu: { label: 'ふたつの かきかた',   sub: 'shi と si、どちらも ただしい',      build: buildFutatsu },
  };

  /* ---------- 画面 ---------- */

  /* ふたつの書き方の対応表。盤面ではなく、下の解説エリアに1回だけ描く。
     しゅぎょう中も残るので、迷ったら下を見て確かめられる。 */
  function renderRules() {
    var box = document.getElementById('rj-rules');
    if (!box) return;
    box.innerHTML =
      '<h2>ローマ字には かきかたが 2つ あります</h2>' +
      '<table class="rj-table"><thead><tr><th>かな</th><th>いま（ヘボン式）</th><th>まえ（訓令式）</th></tr></thead><tbody>' +
        D.futatsu.map(function (p) {
          return '<tr><td>' + esc(p.kana) + '</td><td>' + esc(p.hepburn) + '</td><td>' + esc(p.kunrei) + '</td></tr>';
        }).join('') +
      '</tbody></table>' +
      '<p class="rj-rules-note">2025年12月22日に くにの きまり（内閣告示）が 70年ぶりに かわり、いま がっこうで ならうのは ヘボン式が 基本です。まえの きょうかしょの 訓令式も まちがいでは ありません。キーボードで うつときは どちらでも おなじ ひらがなが 出ます。</p>';
  }

  function modeButtons(ids, cls) {
    return '<div class="rj-modes' + (cls ? ' ' + cls : '') + '">' +
      ids.map(function (id) {
        return '<button type="button" class="rj-mode" data-mode="' + id + '">' +
          '<span class="rj-mode-t">' + esc(MODES[id].label) + '</span>' +
          '<span class="rj-mode-s">' + esc(MODES[id].sub) + '</span>' +
        '</button>';
      }).join('') +
    '</div>';
  }

  function renderMenu() {
    NkModal.close();
    root.innerHTML =
      '<div class="rj-menu">' +
        '<p class="rj-menu-lead">やりたい しゅぎょうを えらんでね！</p>' +
        // 2026-10-07：いままでの4つは「ランダム しゅぎょう」として そのまま。下に「レベル しゅぎょう」を足した
        '<p class="rj-menu-group">ランダム しゅぎょう（いままで どおり）</p>' +
        modeButtons(['yomu', 'utsu', 'kaku', 'futatsu']) +
        '<p class="rj-menu-group">レベル しゅぎょう（みんなで おなじ もんだい）</p>' +
        // よむ・うつ・かく を そのまま カードで ならべる（2026-10-07。1まい はさむと 1手 ふえるので）
        '<div class="rj-modes is-level">' +
          LEVEL_KINDS.map(function (id) {
            return '<button type="button" class="rj-mode rj-kind" data-kind="' + id + '">' +
              '<span class="rj-mode-t">' + esc(MODES[id].label) + '</span>' +
              '<span class="rj-mode-s">レベル1〜10</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        // アプリ一覧へ もどるリンク（2026-09-24。ヒーローの「アプリ一覧」ボタンから移した）
        '<a class="rj-back nk-applist" href="/edu-tools.html#kids">← アプリいちらんに もどる</a>' +
      '</div>' +
      NinjaLinks.html('romaji');

    Array.prototype.forEach.call(root.querySelectorAll('.rj-mode'), function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-kind');
        if (kind) {
          levelKind = kind;
          history.pushState({ nkStep: 'level', kind: kind }, '');
          renderLevels();
        } else {
          start(btn.getAttribute('data-mode'));
        }
      });
    });
  }

  var levelKind = null;

  /* レベル しゅぎょう の2まいめ。レベルを えらんで「スタート」。
     画面に来たときは 何も えらんでいない。えらぶまで スタートは おせない */
  function renderLevels() {
    NkModal.close();
    if (!levelKind) levelKind = (history.state && history.state.kind) || 'utsu';
    root.innerHTML =
      '<div class="rj-menu">' +
        '<p class="rj-menu-lead">' + esc(MODES[levelKind].label) + '：レベルを えらんでね！</p>' +
        '<div class="rj-levels">' +
          D.levels.map(function (name, i) {
            return '<button type="button" class="rj-level" data-lv="' + (i + 1) + '">' +
              '<span class="rj-level-t">レベル' + (i + 1) + '</span>' +
              '<span class="rj-level-s">' + esc(name) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<p class="rj-level-note">おなじ レベルなら、みんな おなじ もんだいが おなじ じゅんばんで でるよ。せーので はじめよう！</p>' +
        '<button type="button" class="rj-next rj-start" id="rj-start" disabled>スタート</button>' +
        '<button type="button" class="rj-back">← しゅぎょうを えらびなおす</button>' +
      '</div>';

    var lv = 0;
    var startBtn = document.getElementById('rj-start');
    Array.prototype.forEach.call(root.querySelectorAll('.rj-level'), function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(root.querySelectorAll('.rj-level'), function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        lv = Number(btn.getAttribute('data-lv'));
        startBtn.disabled = false;
      });
    });
    startBtn.addEventListener('click', function () { if (lv) start('level', lv, levelKind); });
    root.querySelector('.rj-back').addEventListener('click', function () { history.back(); });
  }

  // ブラウザ・スマホの「戻る」でメニューへ戻れるようにする（2026-09-27）。
  // プレイに入るとき履歴を1つ積む。積んでいないと「戻る」でページごと離れ、
  // 直前に開いていた別の修行アプリへ飛んでしまう
  function pushPlay() {
    if (!(history.state && history.state.nkStep === 'play')) history.pushState({ nkStep: 'play' }, '');
    // 問題と けっか は窓（ポップアップ）の中に出す。「とじる」はメニューへもどると同じ（2026-09-27）
    NkModal.open(root, { onClose: backToMenu });
  }
  // 画面の「← もどる」「べつの しゅぎょう」も history.back() にそろえ、ブラウザの戻ると同じ動きにする
  function backToMenu() {
    if (history.state && history.state.nkStep === 'play') history.back();
    else renderMenu();
  }
  window.addEventListener('popstate', function () {
    // ページ内リンク（#faq など）の履歴は state を持たないので、画面はそのままにする
    if (history.state && history.state.nkStep === 'menu') renderMenu();
    else if (history.state && history.state.nkStep === 'level') { levelKind = history.state.kind; renderLevels(); }
  });

  function start(mode, lv, kind) {
    pushPlay();
    state = { mode: mode, lv: lv || 0, kind: kind, qs: lv ? buildLevel(lv, kind) : MODES[mode].build(), i: 0, ok: 0, missed: [] };
    // レベル しゅぎょう は mode を level:よむ のように わける
    if (window.NkTrack) NkTrack('mode_select', { app: 'romaji', mode: lv ? 'level:' + kind : mode, level: lv ? 'lv' + lv : 'none' });
    renderQuestion();
  }

  function renderQuestion() {
    var q = state.qs[state.i];

    var body;
    if (q.type === 'kaku') {
      body =
        '<div class="rj-write">' +
          '<div class="rj-strip">' +
            '<canvas class="rj-canvas" role="img" aria-label="ローマ字を かく ところ"></canvas>' +
            // けしゴムは書くところの右上。ボタンを横に並べると「はんてい」が小さくなる
            '<button type="button" class="rj-eraser" id="rj-clear" title="ぜんぶ けす" aria-label="ぜんぶ けす">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M8.6 20H20" />' +
      '<path d="M15.4 4.6 4.6 15.4a2 2 0 0 0 0 2.8l1.2 1.2a2 2 0 0 0 2.8 0L19.4 8.6a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0Z" />' +
      '<path d="m10 10 4 4" />' +
      '</svg>' +
            '</button>' +
          '</div>' +
          '<p class="rj-model" id="rj-model"></p>' +
        '</div>';
    } else if (q.type === 'utsu') {
      body =
        '<div class="rj-type">' +
          '<input type="text" id="rj-input" class="rj-input" autocomplete="off" autocapitalize="off" ' +
            'autocorrect="off" spellcheck="false" placeholder="ローマ字で うってね" aria-label="ローマ字を入力">' +
          '<button type="button" class="rj-next" id="rj-send">こたえる</button>' +
        '</div>';
    } else {
      body =
        '<div class="rj-choices' + (q.type === 'futatsu' ? ' is-two' : '') + '">' +
          q.choices.map(function (c) {
            return '<button type="button" class="rj-choice" data-key="' + esc(c) + '"><span class="nk-answer-label">' + esc(c) + '</span></button>';
          }).join('') +
        '</div>';
    }

    root.innerHTML =
      '<div class="rj-quiz">' +
        '<div class="rj-bar nk-head">' + NinjaHead.inner(state.i, QUESTIONS, state.ok, state.lv ? MODES[state.kind].label + '・レベル' + state.lv : MODES[state.mode].label) + '</div>' +
        '<div class="rj-q">' +
          '<p class="rj-q-lead">' + esc(q.lead || questionLead(q)) + '</p>' +
          '<p class="rj-q-word' + (q.type === 'futatsu' ? ' is-big' : '') + '"' +
            (q.parts ? ' aria-label="' + esc(q.show) + '">' + q.parts.map(function (p) {
              return '<span class="rj-mora" aria-hidden="true">' + esc(p) + '</span>';
            }).join('') : '>' + esc(q.show)) + '</p>' +
          // 「キーボードで うつ」のヒント（2026-10-07 復活）。押すと うつ ローマ字を出し、見ながら打つ。
          // 前回（9/27に撤去）は出すと欄が縦に伸びて重なったので、ボタンと答えを同じ高さの枠で入れかえる
          (q.type === 'utsu'
            ? '<div class="rj-hint-slot"><button type="button" class="rj-hint-btn" id="rj-hint-btn">ヒント</button></div>'
            : '') +
        '</div>' +
        body +
        (q.type === 'kaku'
          ? '<div class="rj-write-tools" id="rj-tools">' +
              '<button type="button" class="rj-tool rj-judge" id="rj-judge">はんてい</button>' +
            '</div>'
          : '') +
        '<div class="rj-answer" id="rj-answer"></div>' +
        '<button type="button" class="rj-back">← もんだいせんたくに もどる</button>' +
      '</div>';

    root.querySelector('.rj-back').addEventListener('click', backToMenu);

    if (q.type === 'kaku') {
      var pen = setupCanvas(root.querySelector('.rj-canvas'));
      document.getElementById('rj-clear').addEventListener('click', pen.clear);
      document.getElementById('rj-judge').addEventListener('click', function () { revealKaku(q, pen); });
      return;
    }

    if (q.type === 'utsu') {
      var input = document.getElementById('rj-input');
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); answerTyped(); }
      });
      document.getElementById('rj-send').addEventListener('click', answerTyped);
      document.getElementById('rj-hint-btn').addEventListener('click', function () {
        var slot = this.parentNode;
        slot.innerHTML = '<p class="rj-hint">' + esc(q.word) + '</p>';
        input.focus();
      });
      input.focus();
    } else {
      Array.prototype.forEach.call(root.querySelectorAll('.rj-choice'), function (btn) {
        btn.addEventListener('click', function () { answerChoice(btn.getAttribute('data-key'), btn); });
      });
    }
  }

  function questionLead(q) {
    if (q.type === 'yomu') return 'なんと よむ？';
    if (q.type === 'utsu') return 'この ことばを ローマ字で うってね';
    if (q.type === 'kaku') return 'この ことばを ローマ字で かいてね';
    return 'どっち？';
  }

  /* ---------- かく しゅぎょう ----------
     筆跡の自動判定はしない。書いたあと正解を出して、子どもが自分でまるをつける。
     まるをつけたあとは ほかのモードと同じ こたえあわせパネル（なぜ2とおりあるか）に合流する。 */

  function revealKaku(q, pen) {
    pen.lock();                 // 書いた字は残す（正解と見くらべるため）
    var eraser = root.querySelector('.rj-eraser');
    if (eraser) eraser.remove();

    var model = document.getElementById('rj-model');
    model.textContent = q.word; // ヘボン式 / 訓令式 の両方（うつモードと同じ表記）
    model.classList.add('is-on');

    // まるつけは「ぜんぶ けす／はんてい」と同じ行に置きかえる（行を足すと盤面からはみ出す）
    var tools = document.getElementById('rj-tools');
    tools.innerHTML = '';
    tools.classList.add('is-marks');
    [['ok', 'かけた'], ['ng', 'まちがった']].forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'rj-mark rj-mark-' + m[0];
      b.textContent = m[1];
      b.addEventListener('click', function () {
        if (tools.dataset.done === '1') return;
        tools.dataset.done = '1';
        finish(m[0] === 'ok', q, q.word);
      });
      tools.appendChild(b);
    });
  }

  /* canvas に指・ペン・マウスで線を引く。
     - touch-action:none（CSS）が無いと、タブレットで書こうとするとページがスクロールする
     - 画面の解像度ぶん引きのばさないと線がぼやける */
  function setupCanvas(canvas) {
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var drawing = false, locked = false;

    function fit() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (canvas.width === w && canvas.height === h) return;
      // 向きを変えても書いた線が消えないように、いったん退避してから描きなおす
      var keep = null;
      if (canvas.width && canvas.height) {
        keep = document.createElement('canvas');
        keep.width = canvas.width;
        keep.height = canvas.height;
        keep.getContext('2d').drawImage(canvas, 0, 0);
      }
      canvas.width = w;
      canvas.height = h;
      if (keep) ctx.drawImage(keep, 0, 0, w, h);
      // canvas の大きさを変えると描画設定は初期化されるので、毎回入れなおす
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#2b2723';
      ctx.lineWidth = Math.max(2.5, h / 22);   // 線の太さは高さ基準（横長なので幅だと太くなりすぎる）
    }

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (canvas.width / r.width),
        y: (e.clientY - r.top) * (canvas.height / r.height)
      };
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (locked) return;
      fit();
      drawing = true;
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y);   // ちょんと点を打っただけでも見えるように
      ctx.stroke();
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      e.preventDefault();
    });
    var end = function () { drawing = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    if (window.ResizeObserver) new ResizeObserver(fit).observe(canvas);
    requestAnimationFrame(fit);

    return {
      clear: function () {
        if (locked) return;
        fit();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
      lock: function () { locked = true; drawing = false; canvas.classList.add('is-locked'); }
    };
  }

  function answerChoice(key, btn) {
    var q = state.qs[state.i];
    var ok = key === q.word;

    Array.prototype.forEach.call(root.querySelectorAll('.rj-choice'), function (b) {
      b.disabled = true;
      if (b.getAttribute('data-key') === q.word) b.classList.add('is-correct');
    });
    if (!ok) btn.classList.add('is-wrong');
    finish(ok, q, q.word);
  }

  function answerTyped() {
    var q = state.qs[state.i];
    var input = document.getElementById('rj-input');
    if (!input) return;
    var typed = input.value.trim().toLowerCase().replace(/[\s　]/g, '').replace(/[‘’´`]/g, "'");
    if (!typed) { input.focus(); return; }

    var ok = q.answers.indexOf(typed) >= 0;
    input.disabled = true;
    input.classList.add(ok ? 'is-correct' : 'is-wrong');
    var send = document.getElementById('rj-send');
    if (send) send.disabled = true;
    finish(ok, q, q.word);
  }

  /* 正解でも まちがいでも「なぜ そう書くのか」を かならず出す */
  function finish(ok, q, shownAnswer) {
    if (ok) state.ok++;
    else state.missed.push(q);

    NinjaHead.score(root, state.ok);

    var box = document.getElementById('rj-answer');
    box.className = 'rj-answer is-on' + (ok ? ' is-ok' : ' is-ng');
    box.innerHTML =
      '<div class="nk-a-body">' +
      '<p class="rj-a-head">' + (ok ? 'せいかい！' : (q.type === 'kaku' ? 'つぎ がんばろう' : '正解は！')) + '　<b>' + esc(shownAnswer) + '</b></p>' +
      (q.cat ? '<p class="rj-a-cat">' + esc(q.cat) + '</p>' : '') +
      '<p class="rj-a-why">' + esc(q.hint) + '</p>' +
      '</div>' +
      '<button type="button" class="rj-next" id="rj-next">' +
        (state.i + 1 >= QUESTIONS ? 'けっかを 見る' : 'つぎの もんだい') + '</button>';

    document.getElementById('rj-next').addEventListener('click', next);
    document.getElementById('rj-next').focus();
  }

  function next() {
    state.i++;
    if (state.i >= QUESTIONS) renderResult();
    else renderQuestion();
  }

  function renderResult() {
    var missed = state.missed;
    if (window.NkTrack) NkTrack('set_complete', { app: 'romaji', mode: state.lv ? 'level:' + state.kind : state.mode, level: state.lv ? 'lv' + state.lv : 'none', score: state.ok, total: QUESTIONS });
    root.innerHTML =
      '<div class="rj-result' + (state.ok === QUESTIONS ? ' is-perfect' : '') + '">' +
        '<p class="rj-result-score">' + QUESTIONS + 'もん ちゅう <b>' + state.ok + 'もん</b> せいかい</p>' +
        (missed.length
          ? '<div class="rj-missed">' +
              '<h2>まちがえた ところ</h2>' +
              missed.map(function (q) {
                return '<div class="rj-missed-item"><b>' + esc(q.type === 'utsu' ? q.show : q.word) + '</b>' +
                  '<span>' + esc(q.type === 'utsu' ? q.word + ' — ' + q.hint : q.hint) + '</span></div>';
              }).join('') +
              '<p class="rj-missed-note">この ことばだけ ノートに 書いてみると おぼえやすいです。</p>' +
            '</div>'
          : '<p class="rj-allok">ぜんもん せいかい！ すごい。</p>') +
        '<div class="rj-result-btns">' +
          '<button type="button" class="rj-next" id="rj-again">もう いちど</button>' +
          '<button type="button" class="rj-sub" id="rj-menu">べつの しゅぎょう</button>' +
        '</div>' +
      '</div>';

    document.getElementById('rj-again').addEventListener('click', function () { start(state.mode, state.lv, state.kind); });
    document.getElementById('rj-menu').addEventListener('click', backToMenu);
  }

  renderRules();
  history.replaceState({ nkStep: 'menu' }, '');
  renderMenu();
})();
