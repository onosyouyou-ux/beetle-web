/* ============================================================
   katakana.js — カタカナのれんしゅう（3モード・1セット10問）
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
      return { type: 'dotchi', show: x.k, answer: 'kata', word: x.w, hint: x.hint, cat: D.cats[x.c] ? D.cats[x.c].label : '' };
    });
    var hira = pick(D.wago, QUESTIONS - half).map(function (x) {
      return { type: 'dotchi', show: x.k, answer: 'hira', word: x.k, hint: x.hint, cat: 'ひらがな（かんじ）で 書くことば' };
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
          choices: shuffle([p.ka, p.kb]),
        });
      });
    }
    return qs;
  }

  var MODES = {
    dotchi: { label: 'どっちで かく？', sub: 'カタカナか ひらがなか を えらぶ', build: buildDotchi },
    naosu:  { label: 'カタカナに なおす', sub: 'ひらがなを カタカナに 書きかえる', build: buildNaosu },
    nigata: { label: 'にた字 みつけ',   sub: 'シとツ、ソとン を 見分ける',     build: buildNigata },
  };

  /* ---------- 画面 ---------- */

  function renderMenu() {
    root.innerHTML =
      '<div class="kt-menu">' +
        '<p class="kt-menu-lead">やりたい しゅぎょうを えらんでね（1かい 10もん）</p>' +
        '<div class="kt-modes">' +
          Object.keys(MODES).map(function (id) {
            return '<button type="button" class="kt-mode" data-mode="' + id + '">' +
              '<span class="kt-mode-t">' + esc(MODES[id].label) + '</span>' +
              '<span class="kt-mode-s">' + esc(MODES[id].sub) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="kt-rules">' +
          '<h2>カタカナで かく ことば は この4つ</h2>' +
          '<ol>' +
            '<li><b>がいこくから きた ことば</b><span>パン・ノート・ケーキ</span></li>' +
            '<li><b>がいこくの 国や 人の 名前</b><span>アメリカ・トム</span></li>' +
            '<li><b>おとや なきごえ</b><span>ワンワン・ガタンゴトン</span></li>' +
            '<li><b>いきものの 名前</b><span>カブトムシ・タンポポ</span></li>' +
          '</ol>' +
          '<p class="kt-rules-note">むかしから 日本に あることば（やま・いぬ・ごはん）は ひらがなや かんじで 書きます。</p>' +
        '</div>' +
      '</div>';

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
    var choices;

    if (q.type === 'dotchi') {
      choices = [
        { key: 'kata', label: 'カタカナ' },
        { key: 'hira', label: 'ひらがな' },
      ];
    } else {
      choices = q.choices.map(function (c) { return { key: c, label: c }; });
    }

    root.innerHTML =
      '<div class="kt-quiz">' +
        '<div class="kt-bar"><span>' + (state.i + 1) + ' / ' + QUESTIONS + '</span>' +
          '<span class="kt-score">' + state.ok + 'もん せいかい</span></div>' +
        '<div class="kt-q">' +
          '<p class="kt-q-lead">' + esc(questionLead(q)) + '</p>' +
          '<p class="kt-q-word' + (q.type === 'nigata' ? ' is-big' : '') + '">' + esc(q.show) + '</p>' +
        '</div>' +
        '<div class="kt-choices' + (q.type === 'dotchi' ? ' is-two' : '') + '">' +
          choices.map(function (c) {
            return '<button type="button" class="kt-choice" data-key="' + esc(c.key) + '">' + esc(c.label) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="kt-answer" id="kt-answer"></div>' +
      '</div>';

    Array.prototype.forEach.call(root.querySelectorAll('.kt-choice'), function (btn) {
      btn.addEventListener('click', function () { answer(btn.getAttribute('data-key'), btn); });
    });
  }

  function questionLead(q) {
    if (q.type === 'dotchi') return 'この ことばは どっちで 書く？';
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
    var score = root.querySelector('.kt-score');
    if (score) score.textContent = state.ok + 'もん せいかい';

    // 正解でも まちがいでも「なぜ そう書くのか」を かならず出す
    var box = document.getElementById('kt-answer');
    box.className = 'kt-answer is-on' + (ok ? ' is-ok' : ' is-ng');
    box.innerHTML =
      '<p class="kt-a-head">' + (ok ? 'せいかい！' : 'おしい！') + '　<b>' + esc(q.word) + '</b></p>' +
      (q.cat ? '<p class="kt-a-cat">' + esc(q.cat) + '</p>' : '') +
      '<p class="kt-a-why">' + esc(q.hint) + '</p>' +
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
      '<div class="kt-result">' +
        '<p class="kt-result-score">' + QUESTIONS + 'もん ちゅう <b>' + state.ok + 'もん</b> せいかい</p>' +
        (missed.length
          ? '<div class="kt-missed">' +
              '<h2>まちがえた ' + (state.mode === 'nigata' ? '字' : 'ことば') + '</h2>' +
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
