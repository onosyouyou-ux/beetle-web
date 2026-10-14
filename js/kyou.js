/* ============================================================
   kyou.js — きょうの しゅぎょう（8本の修行を またいで 5もん。#143）
   日づけで 8本から 5本を えらび、1本 1もんずつ 4択で出す。
   問題も 日づけで決まるので、その日は だれが あけても 同じ 5もん（クラスで「きょうの 5もん」に使える）。

   問題の中身は 各アプリの データ（js/*-data.js）を そのまま読む。アプリ本体の JS は読まない
   （各アプリは 読みこむと すぐ メニューを描くので、部品として借りられない）。
   そのため 選択肢の作りかたは ここに 小さく持つ。むずかしさは どの修行も いちばん やさしい段にそろえる。

   盤面と けっか の見た目は かけざん修行の部品（kk-）を借りる。窓は nk-modal.js、
   見出しは NinjaHead、まちがえたときの「つぎへ」は NkWrongNext（どれも ninja-links.js）。
   きろくは この端末の localStorage だけ（サーバーには送らない）。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('kk-app');
  if (!app || !window.NinjaLinks) return;

  var COUNT = 5;
  var STORE = 'nk-kyou';
  var APPS = NinjaLinks.APPS;

  /* ---------- 日づけで決まる くじ ---------- */

  function today() { return new Date().toLocaleDateString('sv-SE'); }
  function seedOf(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // mulberry32。同じ日づけなら 同じ並びになる
  function makeRand(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = Math.random;
  var randInt = function (a, b) { return Math.floor(rand() * (b - a + 1)) + a; };
  var pick = function (a) { return a[randInt(0, a.length - 1)]; };
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // こたえ1つ＋まちがい3つ。同じ字の選択肢は 入れない
  function fourOptions(answer, wrongs) {
    var opts = [{ v: answer, ok: true }], seen = {};
    seen[answer] = true;
    wrongs.forEach(function (v) {
      if (v == null || seen[v] || opts.length >= 4) return;
      seen[v] = true;
      opts.push({ v: v, ok: false });
    });
    return shuffle(opts);
  }
  function nearNumbers(ans, min, max) {
    var out = [];
    shuffle([-1, 1, -2, 2, -3, 3, 10, -10]).forEach(function (d) {
      var v = ans + d;
      if (v >= min && v <= max) out.push(String(v));
    });
    return out;
  }

  /* ---------- 修行ごとの 1もん ----------
     返す形：{ prompt: 札の字, ask: 問いの字 または askHtml, options, answer, why } */

  var MAKERS = {
    // かんじ：小1の ことば → よみかた。まちがいは にごる・小さい っ・のばす音 を1か所かえた形と、ほかの ことばの よみ
    kanji: function () {
      var DATA = window.KANJI_DATA;
      if (!DATA) return null;
      var pool = DATA.filter(function (e) { return e.g === 1; });
      var e = pick(pool), pair = pick(e.w);
      var yomi = pair[1];
      var others = [];
      pool.forEach(function (x) {
        x.w.forEach(function (p) { if (p[1] !== yomi && Math.abs(p[1].length - yomi.length) <= 1) others.push(p[1]); });
      });
      return {
        prompt: 'よみかたは?', ask: pair[0],
        options: fourOptions(yomi, nearYomi(yomi).slice(0, 2).concat(shuffle(others))),
        answer: yomi, why: pair[0] + ' は「' + yomi + '」と よむよ'
      };
    },
    // カタカナ：ひらがな → カタカナ。まちがいは 形の にている字（シ・ツ など）を1か所かえた形
    katakana: function () {
      var D = window.KATAKANA_DATA;
      if (!D || !D.words) return null;
      var w = pick(D.words);
      var others = D.words.filter(function (x) { return x.w !== w.w && Math.abs(x.w.length - w.w.length) <= 1; })
        .map(function (x) { return x.w; });
      return {
        prompt: 'カタカナで かくと?', ask: w.k,
        options: fourOptions(w.w, nearKana(w.w).concat(shuffle(others))),
        answer: w.w, why: w.hint || ''
      };
    },
    // ローマ字：レベル1〜3の ことば → ヘボン式。まちがいは 母音を1つ かえた形（訓令式は まちがいに しない）
    romaji: function () {
      var D = window.ROMAJI_DATA;
      if (!D || !D.words || !D.mora) return null;
      var pool = D.words.filter(function (x) { return x.lv <= 3; });
      for (var n = 0; n < 20; n++) {
        var w = pick(pool);
        var moras = Array.from(w.k).map(function (c) { return D.mora[c] && D.mora[c][0]; });
        if (moras.some(function (m) { return !m; })) continue;
        var answer = moras.join('');
        var wrongs = [];
        moras.forEach(function (m, i) {
          if (!/[aiueo]$/.test(m)) return;
          'aiueo'.split('').forEach(function (v) {
            if (m.slice(-1) === v) return;
            var a = moras.slice();
            a[i] = m.slice(0, -1) + v;
            wrongs.push(a.join(''));
          });
        });
        return {
          prompt: 'ローマじで かくと?', ask: w.k,
          options: fourOptions(answer, shuffle(wrongs)),
          answer: answer, why: w.hint || ''
        };
      }
      return null;
    },
    // フォニックス：3もじの ことば → よみかた。まちがいは 1もじ ちがいの ことばの よみ
    phonics: function () {
      var D = window.PHONICS_DATA;
      if (!D || !D.cvc || !D.yomi) return null;
      var c = pick(D.cvc.filter(function (x) { return D.yomi[x.w]; }));
      return {
        prompt: 'よみかたは?', ask: c.w,
        options: fourOptions(D.yomi[c.w], shuffle(c.near.map(function (x) { return D.yomi[x]; }))),
        answer: D.yomi[c.w], why: c.w + ' は「' + c.ja + '」の こと'
      };
    },
    // とけい：ちょうど と 30ぷん。まちがいは みじかい はりを となりの数で よんだ形
    tokei: function () {
      var h = randInt(1, 12), m = pick([0, 30]);
      var t = function (hh, mm) { hh = (hh + 11) % 12 + 1; return mm ? hh + 'じ30ぷん' : hh + 'じ'; };
      return {
        prompt: 'なんじ?', askHtml: clockSvg(h, m), askKind: 'clock',
        options: fourOptions(t(h, m), shuffle([t(h + 1, m), t(h - 1, m), t(h, 30 - m), t(h + 1, 30 - m)])),
        answer: t(h, m),
        why: m ? 'ながい はりが 6だから 30ぷん。みじかい はりは ' + t(h, 0) + 'を すぎた ところ' : 'ながい はりが 12だから ちょうど'
      };
    },
    // さんすう：10までの たしざん・ひきざん
    sansu: function () {
      var plus = rand() < .5, a, b, ans;
      if (plus) { a = randInt(1, 9); b = randInt(1, 10 - a); ans = a + b; }
      else { a = randInt(2, 10); b = randInt(1, a - 1); ans = a - b; }
      return {
        prompt: 'こたえは?', ask: a + (plus ? ' + ' : ' − ') + b,
        options: fourOptions(String(ans), nearNumbers(ans, 0, 10)),
        answer: String(ans), why: a + (plus ? ' + ' : ' − ') + b + ' = ' + ans
      };
    },
    // かけざん：九九（1〜9の だん）。まちがいは となりの だん・ひとつ ずれ
    kuku: function () {
      var DATA = window.KUKU_DATA;
      if (!DATA) return null;
      var e = pick(DATA);
      var near = [];
      [-1, 1, -2, 2].forEach(function (d) {
        if (e.b + d >= 1 && e.b + d <= 9) near.push(String(e.a * (e.b + d)));
        if (e.a + d >= 1 && e.a + d <= 9) near.push(String((e.a + d) * e.b));
      });
      return {
        prompt: 'こたえは?', ask: e.a + ' × ' + e.b,
        options: fourOptions(String(e.ans), shuffle(near).concat(nearNumbers(e.ans, 1, 81))),
        answer: String(e.ans), why: e.q + ' ' + e.y + '（' + e.a + ' × ' + e.b + ' = ' + e.ans + '）'
      };
    },
    // さくらんぼざん：くりあがりの ある たしざん。せつめいは 10を つくる 分けかた
    sakuranbo: function () {
      var a = randInt(6, 9), b = randInt(11 - a, 9), ans = a + b, need = 10 - a;
      return {
        prompt: 'こたえは?', ask: a + ' + ' + b,
        options: fourOptions(String(ans), nearNumbers(ans, 10, 18)),
        answer: String(ans),
        why: a + ' は あと ' + need + ' で 10。' + b + ' を ' + need + ' と ' + (b - need) + ' に わけて、10 と ' + (b - need) + ' で ' + ans
      };
    }
  };

  // にごる／にごらない・小さい っ・のばす音 を1か所かえる（かんじ修行と同じ考え。子どもが じっさいに まちがえる形）
  var VOICE = { 'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご','さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ',
    'た':'だ','て':'で','と':'ど','は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ' };
  var UNVOICE = {};
  Object.keys(VOICE).forEach(function (k) { UNVOICE[VOICE[k]] = k; });
  function nearYomi(y) {
    var c = Array.from(y), out = [];
    var add = function (a) { var v = a.join(''); if (v !== y && a[0] !== 'っ' && a[0] !== 'ん' && out.indexOf(v) < 0) out.push(v); };
    c.forEach(function (ch, i) {
      var vo = VOICE[ch] || UNVOICE[ch];
      if (vo) { var a = c.slice(); a[i] = vo; add(a); }
      if (ch === 'っ') { var b = c.slice(); b.splice(i, 1); add(b); }
      if ((ch === 'う' || ch === 'い') && i > 0) { var e = c.slice(); e.splice(i, 1); add(e); }
    });
    return shuffle(out);
  }

  // カタカナの 形の にている字（カタカナ修行の「にた字」と同じ組）と、ー・ッ の つけわすれ
  var LOOKALIKE = { 'シ':'ツ','ツ':'シ','ソ':'ン','ン':'ソ','ク':'ケ','ケ':'ク','ワ':'ウ','ウ':'ワ','ヌ':'ス','ス':'ヌ',
    'コ':'ユ','ユ':'コ','チ':'テ','テ':'チ','ア':'マ','マ':'ア','メ':'ナ','ナ':'メ' };
  function nearKana(w) {
    var c = Array.from(w), out = [];
    var add = function (a) { var v = a.join(''); if (v !== w && out.indexOf(v) < 0) out.push(v); };
    c.forEach(function (ch, i) {
      if (LOOKALIKE[ch]) { var a = c.slice(); a[i] = LOOKALIKE[ch]; add(a); }
      if (ch === 'ー' || ch === 'ッ') { var b = c.slice(); b.splice(i, 1); add(b); }
      if (ch === 'ッ') { var d = c.slice(); d[i] = 'ツ'; add(d); }
    });
    return shuffle(out);
  }

  // とけいの絵（とけい修行の clockSvg を ちぢめたもの。ちょうど・30ぷん だけなので 外がわの ぷん の数字は 出さない）
  function clockSvg(h, m) {
    var f = function (n) { return Math.round(n * 10) / 10; };
    var cx = 110, cy = 110, R = 92, i, a, s;
    s = '<svg class="ky-clock" viewBox="0 0 220 220" role="img" aria-label="とけい">';
    s += '<circle cx="110" cy="110" r="104" fill="#f6ede0" stroke="#d9c7ab" stroke-width="4"/>';
    s += '<circle cx="110" cy="110" r="92" fill="#fffdf8" stroke="#c9b696" stroke-width="2"/>';
    for (i = 0; i < 60; i++) {
      a = (i * 6 - 90) * Math.PI / 180;
      var big = i % 5 === 0, r1 = R - (big ? 12 : 6);
      s += '<line x1="' + f(cx + Math.cos(a) * r1) + '" y1="' + f(cy + Math.sin(a) * r1) + '" x2="' + f(cx + Math.cos(a) * R) +
        '" y2="' + f(cy + Math.sin(a) * R) + '" stroke="' + (big ? '#8a7a5e' : '#cbbfa8') + '" stroke-width="' + (big ? 3 : 1.6) + '" stroke-linecap="round"/>';
    }
    for (i = 1; i <= 12; i++) {
      a = (i * 30 - 90) * Math.PI / 180;
      s += '<text x="' + f(cx + Math.cos(a) * (R - 27)) + '" y="' + f(cy + Math.sin(a) * (R - 27) + 8) + '" text-anchor="middle" class="ky-num">' + i + '</text>';
    }
    var ha = ((h % 12) * 30 + m * 0.5 - 90) * Math.PI / 180;
    s += '<line x1="110" y1="110" x2="' + f(cx + Math.cos(ha) * R * 0.5) + '" y2="' + f(cy + Math.sin(ha) * R * 0.5) + '" stroke="#c0503b" stroke-width="11" stroke-linecap="round"/>';
    var ma = (m * 6 - 90) * Math.PI / 180;
    s += '<line x1="110" y1="110" x2="' + f(cx + Math.cos(ma) * R * 0.78) + '" y2="' + f(cy + Math.sin(ma) * R * 0.78) + '" stroke="#2f5d8a" stroke-width="7" stroke-linecap="round"/>';
    s += '<circle cx="110" cy="110" r="7" fill="#3a3630"/></svg>';
    return s;
  }

  /* ---------- きょうの 5もん ---------- */

  function buildToday() {
    rand = makeRand(seedOf('kyou:' + today()));
    var ids = shuffle(NinjaLinks.ORDER.filter(function (id) { return MAKERS[id]; }));
    var list = [];
    for (var i = 0; i < ids.length && list.length < COUNT; i++) {
      var q = MAKERS[ids[i]]();
      if (q && q.options.length === 4) { q.app = ids[i]; list.push(q); }
    }
    rand = Math.random;
    return list;
  }

  /* ---------- きろく ----------
     done … できた日（YYYY-MM-DD → 正解数）。れんぞく の日数を出すのに使う。60日ぶんだけ残す */
  function loadRec() {
    try { var r = JSON.parse(localStorage.getItem(STORE) || '{}'); return { done: r.done || {} }; } catch (e) { return null; }
  }
  function saveDone(score) {
    var r = loadRec();
    if (!r) return;
    var d = today();
    r.done[d] = Math.max(score, r.done[d] || 0);
    var keys = Object.keys(r.done).sort();
    keys.slice(0, Math.max(0, keys.length - 60)).forEach(function (k) { delete r.done[k]; });
    try { localStorage.setItem(STORE, JSON.stringify(r)); } catch (e) {}
  }
  function streak(r) {
    if (!r) return 0;
    var n = 0, d = new Date();
    if (r.done[d.toLocaleDateString('sv-SE')] == null) d.setDate(d.getDate() - 1);  // きょう まだでも きのうまでの れんぞくは 見せる
    while (r.done[d.toLocaleDateString('sv-SE')] != null) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* ---------- 画面 ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var session = null;

  function dateLabel() {
    var d = new Date();
    return (d.getMonth() + 1) + 'がつ ' + d.getDate() + 'にち';
  }

  // メニュー：きょうの 5本を ならべて見せ、スタートだけ置く（えらぶものは無い）
  function renderMenu() {
    NkModal.close();
    session = null;
    app.innerHTML = '';
    var list = buildToday();
    var r = loadRec();
    var doneToday = r && r.done[today()] != null;

    var wrap = el('div', 'kk-menu ky-menu');
    wrap.appendChild(el('h2', 'kk-group-title', dateLabel() + 'の しゅぎょう'));
    var ol = el('ol', 'ky-lineup');
    list.forEach(function (q, i) {
      var li = el('li', 'ky-lineup-item');
      li.appendChild(el('span', 'ky-lineup-n', String(i + 1)));
      li.appendChild(el('span', 'ky-lineup-name', APPS[q.app].name));
      li.appendChild(el('span', 'ky-lineup-note', APPS[q.app].note));
      ol.appendChild(li);
    });
    wrap.appendChild(ol);

    var st = streak(r);
    if (doneToday) wrap.appendChild(el('p', 'ky-status is-done', '✓ きょうは できた！（' + r.done[today()] + ' / ' + list.length + 'もん）' + (st > 1 ? '　' + st + 'にち れんぞく！' : '')));
    else if (st > 0) wrap.appendChild(el('p', 'ky-status', 'きのうまで ' + st + 'にち れんぞく。きょうも やろう！'));

    var btn = el('button', 'kk-start', doneToday ? 'もういちど やる' : 'スタート');
    btn.type = 'button';
    btn.addEventListener('click', function () { start(list); });
    wrap.appendChild(btn);

    var back = el('a', 'kk-back nk-applist', '← アプリいちらんに もどる');
    back.href = '/edu-tools.html#kids';
    wrap.appendChild(back);

    app.appendChild(wrap);
    app.appendChild(NinjaLinks.el('kyou'));
  }

  function backToMenu() {
    if (history.state && history.state.nkStep === 'play') history.back();
    else renderMenu();
  }
  window.addEventListener('popstate', function () {
    if (!history.state || history.state.nkStep !== 'menu') return;
    renderMenu();
  });

  function start(list) {
    if (!(history.state && history.state.nkStep === 'play')) history.pushState({ nkStep: 'play' }, '');
    NkModal.open(app, { onClose: backToMenu });
    session = { list: list, total: list.length, index: 0, correct: 0, locked: false, missed: [] };
    if (window.NkTrack) NkTrack('mode_select', { app: 'kyou', mode: 'kyou', level: 'none' });
    renderPlay();
  }

  function renderPlay() {
    var s = session;
    if (s.index >= s.total) return renderResult();
    var q = s.list[s.index];
    s.locked = false;
    app.innerHTML = '';
    var wrap = el('div', 'kk-play ky-play');

    var head = el('div', 'kk-play-head nk-head');
    head.innerHTML = NinjaHead.inner(s.index, s.total, s.correct, 'きょうの しゅぎょう・' + APPS[q.app].name);
    wrap.appendChild(head);

    var bar = el('div', 'kk-bar');
    var fill = el('div', 'kk-bar-fill');
    fill.style.width = (s.index / s.total * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    wrap.appendChild(el('p', 'kk-ask-label', q.prompt));
    var ask = el('div', 'kk-ask ky-ask ky-ask-' + q.app);
    if (q.askHtml) {
      var stage = el('div', 'ky-ask-clock');
      stage.innerHTML = q.askHtml;
      ask.appendChild(stage);
    } else {
      var main = el('p', 'kk-ask-main', q.ask);
      if (Array.from(q.ask).length > 5) main.classList.add('is-long');
      ask.appendChild(main);
    }
    wrap.appendChild(ask);

    // 数字の修行（さんすう・かけざん・さくらんぼざん）は かけざん修行と同じ 大きな字。
    // ことばの修行は字を ひとまわり小さくし、ながい選択肢が1つでも あれば 4つとも そろえて小さくする
    if (!/^\d+$/.test(q.answer)) wrap.classList.add('is-text');
    var longest = Math.max.apply(null, q.options.map(function (o) { return Array.from(o.v).length; }));
    var options = el('div', 'kk-options' + (longest > 5 ? ' is-long' : ''));
    q.options.forEach(function (o) {
      var b = el('button', 'kk-opt');
      b.type = 'button';
      var label = el('span', 'nk-answer-label', o.v);
      b.appendChild(label);
      b.addEventListener('click', function () { choose(o, b, options, q); });
      options.appendChild(b);
    });
    wrap.appendChild(options);
    wrap.appendChild(el('div', 'kk-feedback'));
    app.appendChild(wrap);
  }

  function choose(chosen, btn, options, q) {
    var s = session;
    if (s.locked) return;
    s.locked = true;
    if (chosen.ok) s.correct++;
    else s.missed.push(APPS[q.app].name + '：' + (q.ask || 'とけい') + ' → ' + q.answer);
    Array.prototype.forEach.call(options.querySelectorAll('.kk-opt'), function (b, i) {
      b.disabled = true;
      if (q.options[i].ok) b.classList.add('is-correct');
    });
    if (!chosen.ok) btn.classList.add('is-wrong');
    NinjaHead.score(app, s.correct);

    var fb = app.querySelector('.kk-feedback');
    fb.className = 'kk-feedback ' + (chosen.ok ? 'is-ok' : 'is-ng');
    fb.textContent = (chosen.ok ? 'せいかい! ' : '正解は ') + q.answer;
    var go = function () { if (session !== s) return; s.index++; renderPlay(); };
    if (!chosen.ok) {
      NkWrongNext({ fb: fb, options: options, go: go, lines: ['正解は ' + q.answer, q.why] });
      return;
    }
    setTimeout(go, 1400);
  }

  function renderResult() {
    var s = session;
    app.innerHTML = '';
    saveDone(s.correct);
    if (window.NkTrack) NkTrack('set_complete', { app: 'kyou', mode: 'kyou', level: 'none', score: s.correct, total: s.total });
    var wrap = el('div', 'kk-result');
    if (s.correct === s.total) wrap.classList.add('is-perfect');
    var rate = s.correct / s.total;
    var stars = rate >= 1 ? 3 : rate >= .8 ? 2 : rate >= .5 ? 1 : 0;
    wrap.appendChild(el('p', 'kk-result-stars', '★★★☆☆☆'.slice(3 - stars, 6 - stars)));
    wrap.appendChild(el('p', 'kk-result-score', s.total + 'もんちゅう ' + s.correct + 'もん せいかい!'));
    if (s.missed.length) {
      wrap.appendChild(el('p', 'kk-result-msg', 'まちがえた もんだい'));
      var list = el('div', 'kk-missed');
      s.missed.forEach(function (m) { list.appendChild(el('span', 'kk-missed-item', m)); });
      wrap.appendChild(list);
    } else {
      wrap.appendChild(el('p', 'kk-result-msg', 'ぜんもん せいかい! きょうの しゅぎょう かんりょう!'));
    }
    var st = streak(loadRec());
    if (st > 1) wrap.appendChild(el('p', 'kk-result-table', st + 'にち れんぞく！ あしたも やろう'));
    else wrap.appendChild(el('p', 'kk-result-table', 'あしたは べつの 5もんが でるよ'));

    var again = el('button', 'kk-start', 'もういちど');
    again.type = 'button';
    again.addEventListener('click', function () { start(s.list); });
    wrap.appendChild(again);
    var back = el('button', 'kk-back', '← しゅぎょう いちらんに もどる');
    back.type = 'button';
    back.addEventListener('click', backToMenu);
    wrap.appendChild(back);
    app.appendChild(wrap);
  }

  history.replaceState({ nkStep: 'menu' }, '');
  renderMenu();
})();
