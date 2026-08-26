/* ============================================================
   phonics.js — フォニックス修行（3モード・1セット10問）
   データは js/phonics-data.js（window.PHONICS_DATA）が単一のデータ源。

   中心は「文字の 名前」と「文字の 音」は ちがう、そして「ローマ字読み」とも ちがう と 分かること。
   だから こたえあわせでは かならず その2つの どちらかに ふれる一文を 出す。
   読み上げは ブラウザの 音声合成（en-US）。サーバーには 何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var D = window.PHONICS_DATA;
  var root = document.getElementById('pn-app');
  if (!root || !D) return;

  var QUESTIONS = 10;
  var state = null;

  /* ---------- 読み上げ（えいごよんで！と同じ作り） ---------- */

  function enVoice() {
    if (!window.speechSynthesis) return null;
    var vs = window.speechSynthesis.getVoices().filter(function (v) { return v.lang.indexOf('en') === 0; });
    return vs.length ? vs[0] : null;
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.85;   // 子どもが 音を 聞き取れる はやさ
    u.pitch = 1.1;
    var v = enVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

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

  // 同じ見た目の選択肢が2つ並ぶと「どっちも正解では？」になるので、必ず落とす
  function uniq(arr) {
    var seen = {};
    return arr.filter(function (v) {
      if (seen[v]) return false;
      seen[v] = true;
      return true;
    });
  }

  /* ---------- 出題づくり ---------- */

  // 1. もじの おと：文字を見て「名前」ではなく「音」を えらぶ
  function buildOto() {
    return pick(D.letters, QUESTIONS).map(function (x) {
      // c と k はどちらも「ク」のように、別の文字でも音が同じことがある。
      // 音で重複を落としてから2つ取らないと、同じ選択肢が2つ並ぶ
      var used = {};
      used[x.oto] = true;
      used[x.name] = true;
      var others = shuffle(D.letters.slice()).filter(function (y) {
        if (y.l === x.l || used[y.oto]) return false;
        used[y.oto] = true;
        return true;
      });
      // まちがい選択肢に **その文字の「名前」** を まぜる（ここが つまずきの 正体）
      var wrongs = others.slice(0, 2).map(function (y) { return y.oto; });
      return {
        type: 'oto',
        show: x.l,
        speak: x.ex,
        word: x.oto,
        cat: 'もじの おと',
        hint: '「' + x.l + '」の 名前は ' + x.name + '。でも 音は ' + x.oto + '。' + x.ex + '（' + x.ja + '）の はじめの 音です。',
        choices: shuffle(uniq([x.oto, x.name].concat(wrongs))),
      };
    });
  }

  // 2. つなげて よむ：c - a - t を つなげると？
  function buildTsunage() {
    return pick(D.cvc, QUESTIONS).map(function (x) {
      return {
        type: 'tsunage',
        show: x.w.split('').join(' - '),
        speak: x.w,
        word: x.w,
        cat: 'つなげて よむ',
        hint: x.w.split('').map(function (c) {
          var hit = D.letters.filter(function (y) { return y.l === c; })[0];
          return hit ? hit.oto : c;
        }).join('・') + ' を つなげて「' + x.w + '」（' + x.ja + '）。',
        choices: shuffle(uniq([x.w].concat(x.near.slice(0, 3)))),
      };
    });
  }

  // 3. まほうの e：ローマ字読みとの ちがいを 正面から 出す
  function buildMahou() {
    return pick(D.mahou, QUESTIONS).map(function (x) {
      return {
        type: 'mahou',
        show: x.w,
        speak: x.w,
        word: x.yomi,
        cat: 'まほうの e',
        hint: 'さいごの e は 読みません。でも まえの 母音を 名前の 音に かえます。' +
              'ローマ字読みだと「' + x.romaji + '」ですが、英語では「' + x.yomi + '」（' + x.ja + '）。',
        choices: shuffle(uniq([x.yomi, x.romaji, x.eYomi])),
      };
    });
  }

  var MODES = {
    oto:     { label: 'もじの おと',   sub: '名前は エー、でも 音は ア',      build: buildOto },
    tsunage: { label: 'つなげて よむ', sub: 'c - a - t を つなげると？',      build: buildTsunage },
    mahou:   { label: 'まほうの e',    sub: 'name は「ナメ」じゃない',        build: buildMahou },
  };

  /* ---------- 画面 ---------- */

  function renderMenu() {
    root.innerHTML =
      '<div class="pn-menu">' +
        '<p class="pn-menu-lead">やりたい しゅぎょうを えらんでね（1かい 10もん）</p>' +
        '<div class="pn-modes">' +
          Object.keys(MODES).map(function (id) {
            return '<button type="button" class="pn-mode" data-mode="' + id + '">' +
              '<span class="pn-mode-t">' + esc(MODES[id].label) + '</span>' +
              '<span class="pn-mode-s">' + esc(MODES[id].sub) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="pn-rules">' +
          '<h2>ABC が 言えても 単語が 読めない わけ</h2>' +
          '<ol>' +
            '<li><b>名前と 音は ちがう</b><span>b の 名前は「ビー」、音は「ブ」。単語を 読むのに いるのは 音のほう</span></li>' +
            '<li><b>ローマ字とは ちがう</b><span>ローマ字なら name は「ナメ」。でも 英語は「ネイム」</span></li>' +
            '<li><b>音を つなげる</b><span>ク・ア・トゥ → cat。1つずつ 読めても つなげられないと 単語に ならない</span></li>' +
          '</ol>' +
        '</div>' +
      '</div>';

    Array.prototype.forEach.call(root.querySelectorAll('.pn-mode'), function (btn) {
      btn.addEventListener('click', function () { start(btn.getAttribute('data-mode')); });
    });
  }

  function start(mode) {
    // 音声合成は 1回 使っておかないと 声の 一覧が 読み込まれない ブラウザがある
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
    state = { mode: mode, qs: MODES[mode].build(), i: 0, ok: 0, missed: [] };
    renderQuestion();
  }

  function renderQuestion() {
    var q = state.qs[state.i];

    root.innerHTML =
      '<div class="pn-quiz">' +
        '<div class="pn-bar"><span>' + (state.i + 1) + ' / ' + QUESTIONS + '</span>' +
          '<span class="pn-score">' + state.ok + 'もん せいかい</span></div>' +
        '<div class="pn-q">' +
          '<p class="pn-q-lead">' + esc(questionLead(q)) + '</p>' +
          '<p class="pn-q-word">' + esc(q.show) + '</p>' +
        '</div>' +
        '<div class="pn-choices">' +
          q.choices.map(function (c) {
            return '<button type="button" class="pn-choice" data-key="' + esc(c) + '">' + esc(c) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="pn-answer" id="pn-answer"></div>' +
      '</div>';

    Array.prototype.forEach.call(root.querySelectorAll('.pn-choice'), function (btn) {
      btn.addEventListener('click', function () { answer(btn.getAttribute('data-key'), btn); });
    });
  }

  function questionLead(q) {
    if (q.type === 'oto') return 'この もじの「音」は どれ？';
    if (q.type === 'tsunage') return 'つなげて よむと どの ことば？';
    return 'えいごでは なんと よむ？';
  }

  function answer(key, btn) {
    var q = state.qs[state.i];
    var ok = key === q.word;

    Array.prototype.forEach.call(root.querySelectorAll('.pn-choice'), function (b) {
      b.disabled = true;
      if (b.getAttribute('data-key') === q.word) b.classList.add('is-correct');
    });
    if (!ok) {
      btn.classList.add('is-wrong');
      state.missed.push(q);
    } else {
      state.ok++;
    }

    var score = root.querySelector('.pn-score');
    if (score) score.textContent = state.ok + 'もん せいかい';

    // 正解でも まちがいでも「なぜ そう読むのか」を かならず出す＋その場で 音を きける
    var box = document.getElementById('pn-answer');
    box.className = 'pn-answer is-on' + (ok ? ' is-ok' : ' is-ng');
    box.innerHTML =
      '<p class="pn-a-head">' + (ok ? 'せいかい！' : 'おしい！') + '　<b>' + esc(q.word) + '</b></p>' +
      '<p class="pn-a-cat">' + esc(q.cat) + '</p>' +
      '<p class="pn-a-why">' + esc(q.hint) + '</p>' +
      '<div class="pn-a-btns">' +
        '<button type="button" class="pn-sub" id="pn-listen">🔊 ' + esc(q.speak) + ' を きく</button>' +
        '<button type="button" class="pn-next" id="pn-next">' +
          (state.i + 1 >= QUESTIONS ? 'けっかを 見る' : 'つぎの もんだい') + '</button>' +
      '</div>';

    document.getElementById('pn-listen').addEventListener('click', function () { speak(q.speak); });
    document.getElementById('pn-next').addEventListener('click', next);
    speak(q.speak);
  }

  function next() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.i++;
    if (state.i >= QUESTIONS) renderResult();
    else renderQuestion();
  }

  function renderResult() {
    var missed = state.missed;
    root.innerHTML =
      '<div class="pn-result">' +
        '<p class="pn-result-score">' + QUESTIONS + 'もん ちゅう <b>' + state.ok + 'もん</b> せいかい</p>' +
        (missed.length
          ? '<div class="pn-missed">' +
              '<h2>まちがえた ところ</h2>' +
              missed.map(function (q) {
                return '<div class="pn-missed-item"><b>' + esc(q.show) + '</b>' +
                  '<span>' + esc(q.hint) + '</span></div>';
              }).join('') +
              '<p class="pn-missed-note">声に 出して 読んでみると おぼえやすいです。</p>' +
            '</div>'
          : '<p class="pn-allok">ぜんもん せいかい！ すごい。</p>') +
        '<div class="pn-result-btns">' +
          '<button type="button" class="pn-next" id="pn-again">もう いちど</button>' +
          '<button type="button" class="pn-sub" id="pn-menu">べつの しゅぎょう</button>' +
        '</div>' +
      '</div>';

    document.getElementById('pn-again').addEventListener('click', function () { start(state.mode); });
    document.getElementById('pn-menu').addEventListener('click', renderMenu);
  }

  renderMenu();
})();
