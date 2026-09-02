/* ============================================================
   romaji.js — ローマ字修行（3モード・1セット10問）
   データは js/romaji-data.js（window.ROMAJI_DATA）が単一のデータ源。

   このアプリの中心は「訓令式（学校）とヘボン式（パソコン・パスポート）の2つがあり、
   どちらも正しい」と分かること。だから「うつ」モードは **どちらの書き方でも正解にする**。
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

  /* ---------- モーラ → ありうる ローマ字（訓令式・ヘボン式の どちらも） ----------
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

  /* 見せる用のローマ字（style: 'kunrei' か 'hepburn'） */
  function render(kana, style) {
    var mora = toMora(kana);
    var out = '';
    for (var i = 0; i < mora.length; i++) {
      var m = mora[i];
      if (m === 'っ') {
        var nextRomas = D.mora[mora[i + 1]] || [''];
        out += pickStyle(nextRomas, style).charAt(0);
      } else if (m === 'ん') {
        var afterRomas = D.mora[mora[i + 1]] || [];
        var needsMark = afterRomas.some(function (r) { return VOWEL_HEAD.indexOf(r.charAt(0)) >= 0; });
        out += needsMark ? "n'" : 'n';
      } else {
        out += pickStyle(D.mora[m] || [''], style);
      }
    }
    return out;
  }

  function pickStyle(variants, style) {
    if (style === 'hepburn') return variants[variants.length > 1 ? 1 : 0];
    return variants[0];
  }

  /* ---------- 出題づくり ---------- */

  function buildYomu() {
    return pick(D.words, QUESTIONS).map(function (x) {
      var style = Math.random() < 0.5 ? 'kunrei' : 'hepburn';
      var wrongs = pick(D.words.filter(function (y) { return y.k !== x.k; }), 3).map(function (y) { return y.k; });
      return {
        type: 'yomu',
        show: render(x.k, style),
        word: x.k,
        hint: x.hint,
        cat: style === 'kunrei' ? '訓令式（学校で ならう 書き方）' : 'ヘボン式（パソコン・パスポートの 書き方）',
        choices: shuffle([x.k].concat(wrongs)),
      };
    });
  }

  function buildUtsu() {
    return pick(D.words, QUESTIONS).map(function (x) {
      return {
        type: 'utsu',
        show: x.k,
        word: render(x.k, 'kunrei') + ' / ' + render(x.k, 'hepburn'),
        answers: romanizations(x.k),
        hint: x.hint,
        cat: 'どちらの 書き方でも 正解',
      };
    });
  }

  function buildFutatsu() {
    var qs = [];
    while (qs.length < QUESTIONS) {
      shuffle(D.futatsu.slice()).forEach(function (p) {
        if (qs.length >= QUESTIONS) return;
        var askKunrei = Math.random() < 0.5;
        qs.push({
          type: 'futatsu',
          show: p.kana,
          lead: askKunrei ? '学校で ならう 書き方（訓令式）は どっち？' : 'パソコンで つかう 書き方（ヘボン式）は どっち？',
          word: askKunrei ? p.kunrei : p.hepburn,
          hint: D.whyTwo.replace('{kunrei}', p.kunrei).replace('{hepburn}', p.hepburn) + '　例：' + p.ex,
          cat: '2とおりの 書き方',
          choices: shuffle([p.kunrei, p.hepburn]),
        });
      });
    }
    return qs;
  }

  var MODES = {
    yomu:    { label: 'ローマ字を よむ',   sub: 'ローマ字を 見て ことばを あてる', build: buildYomu },
    utsu:    { label: 'キーボードで うつ', sub: 'ひらがなを ローマ字で 入力する',  build: buildUtsu },
    futatsu: { label: 'ふたつの 書き方',   sub: 'si と shi、どちらも 正しい',      build: buildFutatsu },
  };

  /* ---------- 画面 ---------- */

  /* ふたつの書き方の対応表。盤面ではなく、下の解説エリアに1回だけ描く。
     しゅぎょう中も残るので、迷ったら下を見て確かめられる。 */
  function renderRules() {
    var box = document.getElementById('rj-rules');
    if (!box) return;
    box.innerHTML =
      '<h2>ローマ字には 書き方が 2つ あります</h2>' +
      '<table class="rj-table"><thead><tr><th>かな</th><th>学校（訓令式）</th><th>パソコン（ヘボン式）</th></tr></thead><tbody>' +
        D.futatsu.map(function (p) {
          return '<tr><td>' + esc(p.kana) + '</td><td>' + esc(p.kunrei) + '</td><td>' + esc(p.hepburn) + '</td></tr>';
        }).join('') +
      '</tbody></table>' +
      '<p class="rj-rules-note">どちらも 正しい 書き方です。テストで 出るのは 学校で ならう ほう、キーボードで うつときは どちらでも 入ります。</p>';
  }

  function renderMenu() {
    root.innerHTML =
      '<div class="rj-menu">' +
        '<p class="rj-menu-lead">やりたい しゅぎょうを えらんでね（1かい 10もん）</p>' +
        '<div class="rj-modes">' +
          Object.keys(MODES).map(function (id) {
            return '<button type="button" class="rj-mode" data-mode="' + id + '">' +
              '<span class="rj-mode-t">' + esc(MODES[id].label) + '</span>' +
              '<span class="rj-mode-s">' + esc(MODES[id].sub) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>';

    Array.prototype.forEach.call(root.querySelectorAll('.rj-mode'), function (btn) {
      btn.addEventListener('click', function () { start(btn.getAttribute('data-mode')); });
    });
  }

  function start(mode) {
    state = { mode: mode, qs: MODES[mode].build(), i: 0, ok: 0, missed: [] };
    renderQuestion();
  }

  function renderQuestion() {
    var q = state.qs[state.i];

    var body;
    if (q.type === 'utsu') {
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
            return '<button type="button" class="rj-choice" data-key="' + esc(c) + '">' + esc(c) + '</button>';
          }).join('') +
        '</div>';
    }

    root.innerHTML =
      '<div class="rj-quiz">' +
        '<div class="rj-bar"><span>' + (state.i + 1) + ' / ' + QUESTIONS + '</span>' +
          '<span class="rj-score">' + state.ok + 'もん せいかい</span></div>' +
        '<div class="rj-q">' +
          '<p class="rj-q-lead">' + esc(q.lead || questionLead(q)) + '</p>' +
          '<p class="rj-q-word' + (q.type === 'futatsu' ? ' is-big' : '') + '">' + esc(q.show) + '</p>' +
        '</div>' +
        body +
        '<div class="rj-answer" id="rj-answer"></div>' +
        '<button type="button" class="rj-back">← もんだいせんたくに もどる</button>' +
      '</div>';

    root.querySelector('.rj-back').addEventListener('click', renderMenu);

    if (q.type === 'utsu') {
      var input = document.getElementById('rj-input');
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); answerTyped(); }
      });
      document.getElementById('rj-send').addEventListener('click', answerTyped);
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
    return 'どっち？';
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

    var score = root.querySelector('.rj-score');
    if (score) score.textContent = state.ok + 'もん せいかい';

    var box = document.getElementById('rj-answer');
    box.className = 'rj-answer is-on' + (ok ? ' is-ok' : ' is-ng');
    box.innerHTML =
      '<div class="nk-a-body">' +
      '<p class="rj-a-head">' + (ok ? 'せいかい！' : 'おしい！') + '　<b>' + esc(shownAnswer) + '</b></p>' +
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
    root.innerHTML =
      '<div class="rj-result">' +
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

    document.getElementById('rj-again').addEventListener('click', function () { start(state.mode); });
    document.getElementById('rj-menu').addEventListener('click', renderMenu);
  }

  renderRules();
  renderMenu();
})();
