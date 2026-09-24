/* ============================================================
   katakana.js — カタカナ修行（3モード・1セット10問）
   データは js/katakana-data.js（window.KATAKANA_DATA）が単一のデータ源。

   このアプリの中心は「なぜ カタカナで 書くのか」を毎回 一文で見せること。
   正解でも まちがいでも、答え合わせの画面に かならず hint を出す。
   出題も採点もブラウザの中だけで行い、サーバーには何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var D = window.KATAKANA_DATA;
  var root = document.getElementById('kt-app');
  if (!root || !D) return;

  var QUESTIONS = 10;

  /* 形の にている字の 入れかえ（まちがい選択肢づくりに使う） */
  var SWAP = { 'シ': 'ツ', 'ツ': 'シ', 'ソ': 'ン', 'ン': 'ソ', 'ク': 'ワ', 'ワ': 'ク', 'ス': 'ヌ', 'ヌ': 'ス', 'ロ': 'コ', 'コ': 'ロ' };
  /* のばす音を 母音の字にしてしまう よくある まちがい */
  var VOWEL_OF = {
    'カ': 'ア', 'サ': 'ア', 'タ': 'ア', 'ナ': 'ア', 'ハ': 'ア', 'マ': 'ア', 'ヤ': 'ア', 'ラ': 'ア', 'ガ': 'ア', 'バ': 'ア', 'パ': 'ア',
    'キ': 'イ', 'シ': 'イ', 'チ': 'イ', 'ニ': 'イ', 'ヒ': 'イ', 'ミ': 'イ', 'リ': 'イ', 'ギ': 'イ', 'ビ': 'イ', 'ピ': 'イ',
    'ク': 'ウ', 'ス': 'ウ', 'ツ': 'ウ', 'ヌ': 'ウ', 'フ': 'ウ', 'ム': 'ウ', 'ユ': 'ウ', 'ル': 'ウ', 'グ': 'ウ', 'ブ': 'ウ', 'プ': 'ウ',
    'ケ': 'エ', 'セ': 'エ', 'テ': 'エ', 'ネ': 'エ', 'ヘ': 'エ', 'メ': 'エ', 'レ': 'エ', 'ゲ': 'エ', 'ベ': 'エ', 'ペ': 'エ',
    'コ': 'オ', 'ソ': 'オ', 'ト': 'オ', 'ノ': 'オ', 'ホ': 'オ', 'モ': 'オ', 'ヨ': 'オ', 'ロ': 'オ', 'ゴ': 'オ', 'ボ': 'オ', 'ポ': 'オ',
  };
  var BIG = { 'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ' };
  /* 前の字に くっついて はたらく字（ならべかえの 対象から 外す） */
  var SMALL = 'ャュョッァィゥェォー';
  /* だくてん・はんだくてんの つけまちがい（ジ→シ など。音でも見分けられる） */
  var DAKU = {
    'カ': 'ガ', 'ガ': 'カ', 'キ': 'ギ', 'ギ': 'キ', 'ク': 'グ', 'グ': 'ク', 'ケ': 'ゲ', 'ゲ': 'ケ', 'コ': 'ゴ', 'ゴ': 'コ',
    'サ': 'ザ', 'ザ': 'サ', 'シ': 'ジ', 'ジ': 'シ', 'ス': 'ズ', 'ズ': 'ス', 'セ': 'ゼ', 'ゼ': 'セ', 'ソ': 'ゾ', 'ゾ': 'ソ',
    'タ': 'ダ', 'ダ': 'タ', 'チ': 'ヂ', 'ヂ': 'チ', 'ツ': 'ヅ', 'ヅ': 'ツ', 'テ': 'デ', 'デ': 'テ', 'ト': 'ド', 'ド': 'ト',
    'ハ': 'バ', 'バ': 'パ', 'パ': 'ハ', 'ヒ': 'ビ', 'ビ': 'ピ', 'ピ': 'ヒ', 'フ': 'ブ', 'ブ': 'プ', 'プ': 'フ',
    'ヘ': 'ベ', 'ベ': 'ペ', 'ペ': 'ヘ', 'ホ': 'ボ', 'ボ': 'ポ', 'ポ': 'ホ',
  };

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

  function pick(arr, n) {
    return shuffle(arr.slice()).slice(0, n);
  }

  /* ---------- まちがい選択肢づくり（カタカナに なおす モード） ---------- */

  /* 1字だけ 入れかえた ことばを つくる */
  function mutate(chars, i, ch) {
    var c = chars.slice();
    c[i] = ch;
    return c.join('');
  }

  /* まちがい選択肢は「その子が ほんとうに 書きそうな まちがい」から 先に えらぶ。
     ならべる順は ねらいの つよい順：
       1 形の にている字（シ/ツ）→ 2 のばす音「ー」→ 3 ちいさい字 → 4 だくてん → 5 となりの字の 入れかえ
     どれも 作れないときだけ、さいごに ほかのことばで うめる。 */
  function makeWrongs(word) {
    var chars = word.split('');
    var tiers = [[], [], [], [], []];
    var i;

    for (i = 0; i < chars.length; i++) {
      if (SWAP[chars[i]]) tiers[0].push(mutate(chars, i, SWAP[chars[i]]));
      if (chars[i] === 'ー' && i > 0 && VOWEL_OF[chars[i - 1]]) tiers[1].push(mutate(chars, i, VOWEL_OF[chars[i - 1]]));
      if (BIG[chars[i]]) tiers[2].push(mutate(chars, i, BIG[chars[i]]));
      if (DAKU[chars[i]]) tiers[3].push(mutate(chars, i, DAKU[chars[i]]));
    }
    // となりの字を 入れかえる（「ブラジル」→「ブラルジ」）。
    // ちいさい字と「ー」は 前の字に くっついているので 動かさない
    // （動かすと「ャニーニャー」のような ありえない ならびが できてしまう）
    for (i = 0; i < chars.length - 1; i++) {
      if (chars[i] === chars[i + 1]) continue;
      if (SMALL.indexOf(chars[i]) >= 0 || SMALL.indexOf(chars[i + 1]) >= 0) continue;
      var sw = chars.slice();
      var t = sw[i]; sw[i] = sw[i + 1]; sw[i + 1] = t;
      tiers[4].push(sw.join(''));
    }

    var out = [];
    var seen = {};
    tiers.forEach(function (tier) {
      shuffle(tier).forEach(function (w) {
        if (out.length >= 3 || w === word || seen[w]) return;
        seen[w] = true;
        out.push(w);
      });
    });

    // ここまでで 足りなければ ほかのことばで うめる（ほぼ起きない）
    if (out.length < 3) {
      var others = D.words.filter(function (x) { return x.w !== word && x.w.length === word.length; });
      shuffle(others).forEach(function (x) {
        if (out.length >= 3 || seen[x.w]) return;
        seen[x.w] = true;
        out.push(x.w);
      });
    }
    return shuffle(out).slice(0, 3);
  }

  /* ---------- 出題づくり ---------- */

  function buildDotchi() {
    var half = Math.round(QUESTIONS / 2);
    var kata = pick(D.words, half).map(function (x) {
      return { type: 'dotchi', show: x.k, ex: x.ex, answer: 'kata', word: x.w, hint: x.hint, cat: D.cats[x.c] ? D.cats[x.c].label : '' };
    });
    var hira = pick(D.wago, QUESTIONS - half).map(function (x) {
      return { type: 'dotchi', show: x.k, ex: x.ex, answer: 'hira', word: x.k, hint: x.hint, cat: 'ひらがな（かんじ）で 書くことば' };
    });
    return shuffle(kata.concat(hira));
  }

  function buildNaosu() {
    return pick(D.words, QUESTIONS).map(function (x) {
      return {
        type: 'naosu',
        show: x.k,
        word: x.w,
        hint: x.hint,
        cat: D.cats[x.c] ? D.cats[x.c].label : '',
        choices: shuffle([x.w].concat(makeWrongs(x.w))),
      };
    });
  }

  function buildNigata() {
    var qs = [];
    while (qs.length < QUESTIONS) {
      shuffle(D.nigata.slice()).forEach(function (p) {
        if (qs.length >= QUESTIONS) return;
        var useA = Math.random() < 0.5;
        qs.push({
          type: 'nigata',
          show: useA ? p.a : p.b,
          word: useA ? p.ka : p.kb,
          hint: p.hint,
          cat: 'にている字',
          // 選択肢は ひらがなだけ にする（2026-09-14）。カタカナを ならべると
          // 問題の字と 形を 見くらべるだけで 答えが 出てしまい、読めるかの しゅぎょうに ならない。
          choices: shuffle([{ key: p.ka, label: p.ha }, { key: p.kb, label: p.hb }]),
        });
      });
    }
    return qs;
  }

  /* ---------- かく しゅぎょう（2026-09-14） ----------
     ひらがなを 見せて、カタカナ1字を 書く。
     筆跡の自動判定はしない。合っているのに × が出ると そこで手が止まるため、
     はんてい で お手本を出して、子どもが 自分で まるをつける（ローマ字修行と同じ作法）。 */

  /* 説明は 二重に持たない。形の にている字は「にた字みつけ」の 見分けかたを そのまま使う。 */
  function kakuHint(m) {
    for (var i = 0; i < D.nigata.length; i++) {
      var p = D.nigata[i];
      if (p.a === m.k || p.b === m.k) return p.hint;
    }
    if (m.g === 'small') return 'ちいさく 書く字。大きく 書くと ちがう字に なります（コップ → コツプ）。';
    if (m.g === 'daku') return '右上に 点を 2つ つけます。';
    if (m.g === 'handaku') return '右上に まるを つけます。';
    return 'ひらがなの「' + m.h + '」と おなじ おとの 字です。';
  }

  function buildKaku() {
    return pick(D.moji, QUESTIONS).map(function (m) {
      return { type: 'kaku', show: m.h, word: m.k, hint: kakuHint(m), cat: '' };
    });
  }

  function renderKaku(q) {
    root.innerHTML =
      '<div class="kt-quiz">' +
        '<div class="kt-bar nk-head">' + NinjaHead.inner(state.i, QUESTIONS, state.ok, MODES[state.mode].label) + '</div>' +
        '<div class="kt-q">' +
          '<p class="kt-q-lead">この 字を カタカナで かいてね</p>' +
          '<p class="kt-q-word is-big">' + esc(q.show) + '</p>' +
        '</div>' +
        '<div class="kt-write">' +
          '<div class="kt-pad">' +
            '<canvas class="kt-canvas" role="img" aria-label="カタカナを かく ところ"></canvas>' +
            // けしゴムは書くところの右上に重ねる。横に並べると「はんてい」が小さくなる
            '<button type="button" class="kt-eraser" id="kt-clear" title="ぜんぶ けす" aria-label="ぜんぶ けす">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
                '<path d="M8.6 20H20" />' +
                '<path d="M15.4 4.6 4.6 15.4a2 2 0 0 0 0 2.8l1.2 1.2a2 2 0 0 0 2.8 0L19.4 8.6a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0Z" />' +
                '<path d="m10 10 4 4" />' +
              '</svg>' +
            '</button>' +
          '</div>' +
          // お手本は はんてい後に出るが、場所は最初から空けておく（盤面が動かないように）
          '<p class="kt-model" id="kt-model"></p>' +
        '</div>' +
        '<div class="kt-write-tools" id="kt-tools">' +
          '<button type="button" class="kt-tool kt-judge" id="kt-judge">はんてい</button>' +
        '</div>' +
        '<div class="kt-answer" id="kt-answer"></div>' +
        '<button type="button" class="kt-back">← もんだいせんたくに もどる</button>' +
      '</div>';

    root.querySelector('.kt-back').addEventListener('click', renderMenu);
    var pen = setupCanvas(root.querySelector('.kt-canvas'));
    document.getElementById('kt-clear').addEventListener('click', pen.clear);
    document.getElementById('kt-judge').addEventListener('click', function () { revealKaku(q, pen); });
  }

  function revealKaku(q, pen) {
    pen.lock();                 // 書いた字は 残す（お手本と 見くらべるため）
    var eraser = root.querySelector('.kt-eraser');
    if (eraser) eraser.remove();

    var model = document.getElementById('kt-model');
    model.textContent = q.word;
    model.classList.add('is-on');

    // まるつけは「はんてい」と同じ行に置きかえる（行を足すと盤面からはみ出す）
    var tools = document.getElementById('kt-tools');
    tools.innerHTML = '';
    tools.classList.add('is-marks');
    [['ok', 'かけた'], ['ng', 'まちがった']].forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'kt-mark kt-mark-' + m[0];
      b.textContent = m[1];
      b.addEventListener('click', function () {
        if (tools.dataset.done === '1') return;
        tools.dataset.done = '1';
        finishKaku(m[0] === 'ok', q);
      });
      tools.appendChild(b);
    });
  }

  function finishKaku(ok, q) {
    if (ok) state.ok++;
    else state.missed.push(q);

    NinjaHead.score(root, state.ok);

    var box = document.getElementById('kt-answer');
    box.className = 'kt-answer is-on' + (ok ? ' is-ok' : ' is-ng');
    box.innerHTML =
      '<div class="nk-a-body">' +
      '<p class="kt-a-head">' + (ok ? 'よく かけた！' : 'つぎ がんばろう') + '　' +
        '<b>' + esc(q.show) + ' → ' + esc(q.word) + '</b></p>' +
      '<p class="kt-a-why">' + esc(q.hint) + '</p>' +
      '</div>' +
      '<button type="button" class="kt-next" id="kt-next">' +
        (state.i + 1 >= QUESTIONS ? 'けっかを 見る' : 'つぎの もんだい') + '</button>';

    document.getElementById('kt-next').addEventListener('click', next);
    document.getElementById('kt-next').focus();
  }

  /* canvas に 指・ペン・マウスで 線を引く。
     - touch-action:none（CSS）が 無いと、タブレットで書こうとすると ページがスクロールする
     - 画面の解像度ぶん 引きのばさないと 線がぼやける */
  function setupCanvas(canvas) {
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var drawing = false, locked = false;

    function fit() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (canvas.width === w && canvas.height === h) return;
      // 向きを変えても 書いた線が 消えないように、いったん退避してから 描きなおす
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
      // canvas の大きさを変えると 描画設定は 初期化されるので、毎回 入れなおす
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#2b2723';
      ctx.lineWidth = Math.max(3, w / 26);
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
      ctx.lineTo(p.x, p.y);   // ちょんと 点を打っただけでも 見えるように
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

  var MODES = {
    dotchi: { label: 'どっちで かく？', sub: 'カタカナか ひらがなか を えらぶ', build: buildDotchi },
    naosu:  { label: 'カタカナに なおす', sub: 'ひらがなを カタカナに 書きかえる', build: buildNaosu },
    nigata: { label: 'にた字 みつけ',   sub: 'シとツ、ソとン を 見分ける',     build: buildNigata },
    kaku:   { label: 'カタカナを かく', sub: 'ひらがなを 見て カタカナを かく',  build: buildKaku },
  };

  /* ---------- 画面 ---------- */

  function renderMenu() {
    root.innerHTML =
      '<div class="kt-menu">' +
        '<p class="kt-menu-lead">やりたい しゅぎょうを えらんでね！</p>' +
        '<div class="kt-modes">' +
          Object.keys(MODES).map(function (id) {
            return '<button type="button" class="kt-mode" data-mode="' + id + '">' +
              '<span class="kt-mode-t">' + esc(MODES[id].label) + '</span>' +
              '<span class="kt-mode-s">' + esc(MODES[id].sub) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      NinjaLinks.html('katakana');

    Array.prototype.forEach.call(root.querySelectorAll('.kt-mode'), function (btn) {
      btn.addEventListener('click', function () { start(btn.getAttribute('data-mode')); });
    });
  }

  function start(mode) {
    state = { mode: mode, qs: MODES[mode].build(), i: 0, ok: 0, missed: [] };
    renderQuestion();
  }

  function renderQuestion() {
    var q = state.qs[state.i];
    // かくモードは 選択肢が なく 画面の作りが ちがうので 別に組む
    if (q.type === 'kaku') { renderKaku(q); return; }
    var choices;

    if (q.type === 'dotchi') {
      choices = [
        { key: 'kata', label: 'カタカナ' },
        { key: 'hira', label: 'ひらがな' },
      ];
    } else if (q.type === 'nigata') {
      // すでに { key: 'ソ（そ）', label: 'そ' } の形。ラベルは ひらがなだけ
      choices = q.choices;
    } else {
      choices = q.choices.map(function (c) { return { key: c, label: c }; });
    }

    root.innerHTML =
      '<div class="kt-quiz">' +
        '<div class="kt-bar nk-head">' + NinjaHead.inner(state.i, QUESTIONS, state.ok, MODES[state.mode].label) + '</div>' +
        '<div class="kt-q">' +
          '<p class="kt-q-lead">' + esc(questionLead(q)) + '</p>' +
          '<p class="kt-q-word' + (q.type === 'nigata' ? ' is-big' : '') + (q.ex ? ' is-sentence' : '') + '">' +
            (q.ex ? sentence(q.ex, q.show, 'kt-target') : esc(q.show)) + '</p>' +
        '</div>' +
        '<div class="kt-choices' + (choices.length === 2 ? ' is-two' : '') + '">' +
          choices.map(function (c) {
            return '<button type="button" class="kt-choice" data-key="' + esc(c.key) + '"><span class="nk-answer-label">' + esc(c.label) + '</span></button>';
          }).join('') +
        '</div>' +
        '<div class="kt-answer" id="kt-answer"></div>' +
        '<button type="button" class="kt-back">← もんだいせんたくに もどる</button>' +
      '</div>';

    root.querySelector('.kt-back').addEventListener('click', renderMenu);

    Array.prototype.forEach.call(root.querySelectorAll('.kt-choice'), function (btn) {
      btn.addEventListener('click', function () { answer(btn.getAttribute('data-key'), btn); });
    });
  }

  // ことば1つだけ見せても どちらで書くか 決められない（「かぜ」だけでは 分からない）。
  // 例文の中に置いて、あてはめる ことばに 下線を引く。
  function sentence(ex, word, cls) {
    var parts = String(ex).split('{}');
    return esc(parts[0]) + '<u class="' + cls + '">' + esc(word) + '</u>' + esc(parts[1] || '');
  }

  function questionLead(q) {
    if (q.type === 'dotchi') return 'したせんの ことばは どっちで 書く？';
    if (q.type === 'naosu') return 'カタカナで 書くと どれ？';
    return 'この 字は どっち？';
  }

  function correctKey(q) {
    if (q.type === 'dotchi') return q.answer;
    return q.word;
  }

  function answer(key, btn) {
    var q = state.qs[state.i];
    var ok = key === correctKey(q);

    Array.prototype.forEach.call(root.querySelectorAll('.kt-choice'), function (b) {
      b.disabled = true;
      if (b.getAttribute('data-key') === correctKey(q)) b.classList.add('is-correct');
    });
    if (!ok) {
      btn.classList.add('is-wrong');
      state.missed.push(q);
    } else {
      state.ok++;
    }

    // せいかい数は その場で 出しなおす（つぎの もんだいまで 待たせない）
    NinjaHead.score(root, state.ok);

    // 正解でも まちがいでも「なぜ そう書くのか」を かならず出す
    var box = document.getElementById('kt-answer');
    box.className = 'kt-answer is-on' + (ok ? ' is-ok' : ' is-ng');
    box.innerHTML =
      '<div class="nk-a-body">' +
      '<p class="kt-a-head">' + (ok ? 'せいかい！' : 'おしい！') + '　' +
        (q.ex ? '<b>' + sentence(q.ex, q.word, 'kt-a-target') + '</b>' : '<b>' + esc(q.word) + '</b>') + '</p>' +
      (q.cat ? '<p class="kt-a-cat">' + esc(q.cat) + '</p>' : '') +
      '<p class="kt-a-why">' + esc(q.hint) + '</p>' +
      '</div>' +
      '<button type="button" class="kt-next" id="kt-next">' +
        (state.i + 1 >= QUESTIONS ? 'けっかを 見る' : 'つぎの もんだい') + '</button>';

    document.getElementById('kt-next').addEventListener('click', next);
    document.getElementById('kt-next').focus();
  }

  function next() {
    state.i++;
    if (state.i >= QUESTIONS) renderResult();
    else renderQuestion();
  }

  function renderResult() {
    var missed = state.missed;
    root.innerHTML =
      '<div class="kt-result' + (state.ok === QUESTIONS ? ' is-perfect' : '') + '">' +
        '<p class="kt-result-score">' + QUESTIONS + 'もん ちゅう <b>' + state.ok + 'もん</b> せいかい</p>' +
        (missed.length
          ? '<div class="kt-missed">' +
              '<h2>まちがえた ' + (state.mode === 'nigata' || state.mode === 'kaku' ? '字' : 'ことば') + '</h2>' +
              missed.map(function (q) {
                return '<div class="kt-missed-item"><b>' + esc(q.word) + '</b>' +
                  '<span>' + esc(q.hint) + '</span></div>';
              }).join('') +
              '<p class="kt-missed-note">この ことばだけ ノートに 書いてみると おぼえやすいです。</p>' +
            '</div>'
          : '<p class="kt-allok">ぜんもん せいかい！ すごい。</p>') +
        '<div class="kt-result-btns">' +
          '<button type="button" class="kt-next" id="kt-again">もう いちど</button>' +
          '<button type="button" class="kt-sub" id="kt-menu">べつの しゅぎょう</button>' +
        '</div>' +
      '</div>';

    document.getElementById('kt-again').addEventListener('click', function () { start(state.mode); });
    document.getElementById('kt-menu').addEventListener('click', renderMenu);
  }

  renderMenu();
})();
