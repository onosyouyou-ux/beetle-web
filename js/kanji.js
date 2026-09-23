/* ============================================================
   kanji.js — かんじ修行（学年別）
   出題データは js/kanji-data.js（window.KANJI_DATA）だけを見る。
   学年を足すときはデータ側に追記すればよく、ここは変えなくてよい。
   出題も採点もブラウザ内で完結し、サーバーには何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('kj-app');
  if (!app || !window.KANJI_DATA) return;

  var DATA = window.KANJI_DATA;
  var TERMS = window.KANJI_TERMS || {};
  var SET_LENGTH = 10;
  // 自分で まるつけ したあと、つぎの問題へ進むまで（ミリ秒）。調整はここ1か所。
  var NEXT_DELAY = 2000;

  // データにある学年から選択肢を組み立てる（学年が増えたら自動で増える）。
  // g: 1〜6 は「小○コース」、g: 7 は「じゅけん とっくん」。
  // ぜんぶ まとめて は小1〜小6だけ（とっくんは中身の性質がちがうので混ぜない）。
  var JUKKEN = 7;
  // 学期の選択肢。KANJI_TERMS にある学年だけ作る（無ければ null で、学期の画面を出さない）
  function termsOf(g) {
    var t = TERMS[g];
    if (!t) return null;
    var list = Object.keys(t).sort().map(function (n) {
      return { id: 't' + n, name: n + 'がっきに ならう かんじ', note: Array.from(t[n]).length + 'じ', term: +n };
    });
    list.push({ id: 'all', name: 'ぜんぶ まとめて', note: DATA.filter(function (e) { return e.g === g; }).length + 'じ', term: 0 });
    return list;
  }

  var GRADES = (function () {
    var gs = [];
    DATA.forEach(function (e) { if (gs.indexOf(e.g) < 0) gs.push(e.g); });
    gs.sort(function (a, b) { return a - b; });
    var count = function (g) { return DATA.filter(function (e) { return e.g === g; }).length; };
    var school = gs.filter(function (g) { return g < JUKKEN; });
    var list = school.map(function (g) {
      return { id: 'g' + g, name: '小' + g + 'コース', note: count(g) + 'じ', grades: [g], terms: termsOf(g) };
    });
    if (school.length > 1) {
      var n = DATA.filter(function (e) { return e.g < JUKKEN; }).length;
      list.push({ id: 'all', name: 'ぜんぶ まとめて', note: '小1〜小' + school[school.length - 1] + '・' + n + 'じ', grades: school });
    }
    if (gs.indexOf(JUKKEN) >= 0) {
      list.push({ id: 'jukken', name: 'じゅけんとっくん', note: 'よみ・四字熟語', grades: [JUKKEN], cls: 'is-jukken' });
    }
    return list;
  })();

  var MODES = [
    // img はカードの絵（2026-09-22）
    { id: 'yomi', name: 'かんじを よむ しゅぎょう', note: 'かんじの ことば → よみかたを えらぶ', img: '/assets/images/ninja/modes/kanji-yomu.webp' },
    { id: 'kanji', name: 'かんじに する しゅぎょう', note: 'よみかた → かんじの ことばを えらぶ', img: '/assets/images/ninja/modes/kanji-kanji.webp' },
    { id: 'kaki', name: 'かんじを かく しゅぎょう', note: 'よみかた → かんじを かいて じぶんで まるつけ', img: '/assets/images/ninja/modes/kanji-kaki.webp' }
  ];

  var state = { gradeId: GRADES[0].id, modeId: 'yomi', termId: 'all', session: null };

  var randInt = function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var pick = function (a) { return a[randInt(0, a.length - 1)]; };

  function gradeOf(gradeId) {
    return GRADES.filter(function (x) { return x.id === gradeId; })[0] || GRADES[0];
  }

  function poolOf(gradeId, termId) {
    var g = gradeOf(gradeId);
    var pool = DATA.filter(function (e) { return g.grades.indexOf(e.g) >= 0; });
    var term = g.terms && g.terms.filter(function (t) { return t.id === termId; })[0];
    if (!term || !term.term) return pool;
    // 学期をしぼるときは、その学期までに習う字だけで書いたことばを使う
    // （2学期の「一」で「一年」を出すと、3学期に習う「年」がまじってしまう）
    var t = TERMS[g.grades[0]], mine = '', later = '';
    Object.keys(t).forEach(function (n) {
      if (+n === term.term) mine += t[n];
      else if (+n > term.term) later += t[n];
    });
    return pool.filter(function (e) { return mine.indexOf(e.k) >= 0; }).map(function (e) {
      var w = e.w.filter(function (pair) {
        return !Array.from(pair[0]).some(function (c) { return later.indexOf(c) >= 0; });
      });
      return { g: e.g, k: e.k, w: w.length ? w : e.w };
    });
  }

  /* ---------- 出題 ---------- */

  function makeQuestion(pool) {
    var entry = pick(pool);
    var wi = randInt(0, entry.w.length - 1);
    var word = entry.w[wi][0], yomi = entry.w[wi][1];

    // かくモードは選択肢を作らない。ことばの その字だけを ○ で伏せて見せることで、
    // 「だい」だけでは 大・台・第 のどれか決まらない問題を避ける。
    if (state.modeId === 'kaki') {
      // ことばが その漢字だけ（耳・山など）のときは、伏せ字が「○」1つになって
      // 何も伝えないので出さない。よみだけで問いとして成り立つ。
      var blank = word.split(entry.k).join('○');
      if (blank.replace(/○/g, '') === '') blank = '';
      return {
        askKind: 'kaki',
        ask: yomi,
        blank: blank,
        word: word,
        answer: entry.k,
        kanji: entry.k
      };
    }

    if (state.modeId === 'yomi') {
      var opts = [{ v: yomi, ok: true }];
      var seen = {};
      seen[yomi] = true;
      // ① 同じ漢字の別のことばの よみ（音と訓の取りちがえ）
      entry.w.forEach(function (pair, i) {
        if (i === wi || seen[pair[1]] || opts.length >= 4) return;
        seen[pair[1]] = true;
        opts.push({ v: pair[1], ok: false, why: 'おなじ かんじの べつの よみ' });
      });
      // ② おなじ長さの よみ（あてずっぽうで消せないようにする）
      var others = [];
      pool.forEach(function (e) {
        if (e.k === entry.k) return;
        e.w.forEach(function (pair) {
          if (!seen[pair[1]] && Math.abs(pair[1].length - yomi.length) <= 1) others.push(pair[1]);
        });
      });
      shuffle(others).forEach(function (v) {
        if (opts.length >= 4 || seen[v]) return;
        seen[v] = true;
        opts.push({ v: v, ok: false });
      });
      return { ask: word, askKind: 'word', options: shuffle(opts), answer: yomi, kanji: entry.k };
    }

    // よみ → ことば（かんじ）
    var kOpts = [{ v: word, ok: true }];
    var kSeen = {};
    kSeen[word] = true;
    var cand = [];
    pool.forEach(function (e) {
      e.w.forEach(function (pair) {
        if (kSeen[pair[0]]) return;
        // 同じよみのことば（日＝ひ／火＝ひ）を混ぜると正解が2つになってしまう
        if (pair[1] === yomi) return;
        // 同じ長さのことばを優先して、字数だけで当てられないようにする
        cand.push({ v: pair[0], sameLen: pair[0].length === word.length, sameKanji: e.k === entry.k });
      });
    });
    cand.sort(function (a, b) {
      return (b.sameKanji - a.sameKanji) * 2 + (b.sameLen - a.sameLen);
    });
    var head = shuffle(cand.slice(0, 24));
    head.forEach(function (c) {
      if (kOpts.length >= 4 || kSeen[c.v]) return;
      kSeen[c.v] = true;
      kOpts.push({ v: c.v, ok: false });
    });
    return { ask: yomi, askKind: 'yomi', options: shuffle(kOpts), answer: word, kanji: entry.k };
  }

  /* ---------- 画面 ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // メニューは段階式（2026-09-22）。といかた → コース →（学期のある学年だけ）がっき。
  // カードを押したら そのまま次の画面へ進む。スタートを押すのは最後の画面だけ。
  // ブラウザの「戻る」と画面の「← もどる」で1つ前のメニュー画面へ戻れるようにする（2026-09-23）。
  // メニューの画面ごとに履歴を1つ積み、戻る操作は history.back() にそろえる
  function goStep(step) {
    history.pushState({ nkStep: step }, '');
    renderMenuStep(step);
  }
  function currentStep() {
    var st = history.state && history.state.nkStep;
    return typeof st === 'number' ? st : 1;
  }
  window.addEventListener('popstate', function () {
    // ページ内リンク（#faq など）の履歴は state を持たないので、メニューはそのままにする
    if (!history.state || typeof history.state.nkStep !== 'number') return;
    renderMenuStep(history.state.nkStep);
  });
  // プレイも履歴に1つ積む。プレイ・けっか から メニューへ戻るときは、直前のメニュー画面へ
  function pushPlay() {
    if (!(history.state && history.state.nkStep === 'play')) history.pushState({ nkStep: 'play' }, '');
  }
  function renderMenu() {
    if (history.state && history.state.nkStep === 'play') history.back();
    else renderMenuStep(currentStep());
  }

  // その画面で押したカード。画面に来たときは何も選んでいない状態から始める（2026-09-23）。
  // 前の選択や初期値が「選択ずみ」で出ていると、押していないのに選ばれて見えるため。
  // スタートのある画面は、カードを押すまでスタートを押せない
  var picked = null;

  function renderMenuStep(step, keep) {
    if (!keep) picked = null;
    state.session = null;
    app.innerHTML = '';
    var wrap = el('div', 'kj-menu is-step');
    var btn;
    if (step === 1) {
      wrap.appendChild(group('しゅぎょうを えらぶ', MODES, 'modeId', 'kj-choices-column kj-choices-mode', 1));
      btn = startPlaceholder('kj-start');
    } else if (step === 2) {
      wrap.appendChild(el('p', 'kj-menu-picked', modeName()));
      // 見出しは出さない（縦が足りないため。2026-09-22）。並びは 小1〜3／小4〜6／ぜんぶ・とっくん の3段
      wrap.appendChild(group(null, GRADES, 'gradeId', 'kj-choices-grade', 2));
      // 学期の区切りがある学年は、押すと がっき の画面へ進むのでスタートは押せない
      btn = el('button', 'kj-start', 'スタート');
      btn.addEventListener('click', startSession);
      if (!picked) btn.disabled = true;
    } else {
      var grade = gradeOf(state.gradeId);
      wrap.appendChild(el('p', 'kj-menu-picked', modeName() + '・' + grade.name));
      wrap.appendChild(group('がっき', grade.terms, 'termId', 'kj-choices-column kj-choices-term', 3));
      wrap.appendChild(el('p', 'kj-menu-note', '※ がっきの くぎりは 光村図書の きょうかしょに あわせています'));
      btn = el('button', 'kj-start', 'スタート');
      btn.addEventListener('click', startSession);
      if (!picked) btn.disabled = true;
    }
    btn.type = 'button';
    wrap.appendChild(btn);
    // 1枚目にも もどるボタンの場所だけ取っておく（スタートの位置を3枚で そろえるため）
    var back = el('button', 'kj-back', step === 1 ? '←' : step === 2 ? '← といかたに もどる' : '← コースに もどる');
    back.type = 'button';
    if (step === 1) {
      back.classList.add('is-placeholder');
      back.tabIndex = -1;
      back.setAttribute('aria-hidden', 'true');
    } else {
      back.addEventListener('click', function () { history.back(); });
    }
    wrap.appendChild(back);
    app.appendChild(wrap);
    app.appendChild(NinjaLinks.el('kanji'));
  }

  // スタートの場所だけ取っておく見えないボタン（画面を行き来しても中身がずれないように）
  function startPlaceholder(cls) {
    var b = el('button', cls + ' is-placeholder', 'スタート');
    b.tabIndex = -1;
    b.setAttribute('aria-hidden', 'true');
    return b;
  }

  function modeName() {
    return MODES.filter(function (m) { return m.id === state.modeId; })[0].name;
  }

  function group(title, items, key, gridCls, step) {
    var sec = el('section', 'kj-group');
    if (title) sec.appendChild(el('h2', 'kj-group-title', title));
    var grid = el('div', 'kj-choices ' + gridCls);
    items.forEach(function (item) {
      var btn = el('button', 'kj-choice' + (item.cls ? ' ' + item.cls : ''));
      btn.type = 'button';
      if (item.img) {
        var img = el('img', 'kj-choice-img');
        img.src = item.img;
        img.alt = '';
        img.width = 160;
        img.height = 160;
        btn.appendChild(img);
      }
      btn.appendChild(el('span', 'kj-choice-label', item.name));
      btn.appendChild(el('span', 'kj-choice-note', item.note));
      if (picked && picked.key === key && picked.id === item.id) btn.classList.add('is-on');
      btn.addEventListener('click', function () {
        // 学年を変えたら、学期は「ぜんぶ まとめて」に戻す
        if (key === 'gradeId' && state.gradeId !== item.id) state.termId = 'all';
        state[key] = item.id;
        // 押したら次の画面へ。1枚目は必ず、2枚目は学期の画面がある学年だけ進む
        if (step === 1) return goStep(2);
        if (step === 2 && gradeOf(item.id).terms) return goStep(3);
        picked = { key: key, id: item.id };
        renderMenuStep(step, true);
      });
      grid.appendChild(btn);
    });
    sec.appendChild(grid);
    return sec;
  }

  function startSession() {
    pushPlay();
    state.session = { pool: poolOf(state.gradeId, state.termId), index: 0, correct: 0, locked: false, q: null, missed: [] };
    nextQuestion();
  }

  function nextQuestion() {
    var s = state.session;
    if (s.index >= SET_LENGTH) return renderResult();
    s.q = makeQuestion(s.pool);
    s.locked = false;
    s.marked = false;
    renderPlay();
  }

  function renderPlay() {
    var s = state.session, q = s.q;
    app.innerHTML = '';
    var wrap = el('div', 'kj-play');

    var head = el('div', 'kj-play-head nk-head');
    head.innerHTML = NinjaHead.inner(s.index, SET_LENGTH, s.correct);
    wrap.appendChild(head);

    var bar = el('div', 'kj-bar');
    var fill = el('div', 'kj-bar-fill');
    fill.style.width = (s.index / SET_LENGTH * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    if (q.askKind === 'kaki') {
      wrap.classList.add('is-kaki');   // 盤面の配分がほかのモードと違う
      buildKaki(wrap, q);
    } else {
      wrap.appendChild(el('p', 'kj-ask-label',
        q.askKind === 'word' ? 'なんと よむ?' : 'この よみの ことばは どれ?'));
      wrap.appendChild(el('p', q.askKind === 'word' ? 'kj-ask kj-ask-word' : 'kj-ask kj-ask-yomi', q.ask));

      var options = el('div', 'kj-options');
      q.options.forEach(function (o) {
        var b = el('button', 'kj-opt');
        // 四字熟語のよみ（ちょうれい ぼかい）など長いものは字を小さくして、ことばの途中で折らない
        if (o.v.length >= 7) b.classList.add(o.v.length >= 10 ? 'is-xlong' : 'is-long');
        b.appendChild(el('span', 'nk-answer-label', o.v));
        b.type = 'button';
        b.addEventListener('click', function () { choose(o, b, options); });
        options.appendChild(b);
      });
      wrap.appendChild(options);
    }
    wrap.appendChild(el('div', 'kj-feedback'));

    var back = el('button', 'kj-back', '← もんだいせんたくに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);
    app.appendChild(wrap);
  }

  function choose(chosen, btn, options) {
    var s = state.session;
    if (s.locked) return;
    s.locked = true;
    var q = s.q;
    if (chosen.ok) s.correct++;
    else s.missed.push(q.askKind === 'word' ? q.ask + '（' + q.answer + '）' : q.answer + '（' + q.ask + '）');

    Array.prototype.forEach.call(options.querySelectorAll('.kj-opt'), function (b, i) {
      b.disabled = true;
      if (q.options[i].ok) b.classList.add('is-correct');
    });
    if (!chosen.ok) btn.classList.add('is-wrong');

    var fb = app.querySelector('.kj-feedback');
    fb.className = 'kj-feedback ' + (chosen.ok ? 'is-ok' : 'is-ng');
    fb.textContent = chosen.ok
      ? 'せいかい! ' + (q.askKind === 'word' ? q.ask + ' → ' + q.answer : q.answer)
      : 'こたえは ' + q.answer + (chosen.why ? '（' + chosen.why + '）' : '');

    setTimeout(function () { if (state.session !== s) return; s.index++; nextQuestion(); }, chosen.ok ? 1000 : 1900);
  }

  /* ---------- かく しゅぎょう ----------
     手書きの自動判定はしない。書いたあとに正解を出して、子どもが自分でまるをつける。
     筆跡の自動判定は「合っているのに ×」が必ず出て、そこで手が止まってしまうため。 */

  function buildKaki(wrap, q) {
    wrap.appendChild(el('p', 'kj-ask-label', 'かんじで かこう'));

    var ask = el('div', 'kj-ask kj-ask-kaki');
    // 字の大きさは「問題エリアの幅 ÷ 字数」で決める（CSS側）。字数だけ渡す。
    // よみは1〜7文字とばらつくので、px を決め打ちにすると
    // 「しょうがっこう」が2行に折れて最後の1文字だけ next 行に残る。
    ask.style.setProperty('--kj-n', q.ask.length);
    ask.appendChild(el('p', 'kj-kaki-yomi', q.ask));
    if (q.blank) {
      // ○（これから書く字）だけ色と下線をつけて、どこを書くのか一目で分かるようにする
      var blankEl = el('p', 'kj-kaki-blank');
      q.blank.split('').forEach(function (ch) {
        blankEl.appendChild(el('span', ch === '○' ? 'kj-kaki-target' : null, ch));
      });
      ask.appendChild(blankEl);
    }
    wrap.appendChild(ask);

    var write = el('div', 'kj-write');
    var pad = el('div', 'kj-pad');
    var canvas = document.createElement('canvas');
    canvas.className = 'kj-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'かんじを かく ところ');
    pad.appendChild(canvas);
    write.appendChild(pad);

    // けしゴムは書くところの右上に置く（ボタンを横に並べると「はんてい」が小さくなる）
    var clear = el('button', 'kj-eraser');
    clear.type = 'button';
    clear.title = 'ぜんぶ けす';
    clear.setAttribute('aria-label', 'ぜんぶ けす');
    clear.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M8.6 20H20" />' +
      '<path d="M15.4 4.6 4.6 15.4a2 2 0 0 0 0 2.8l1.2 1.2a2 2 0 0 0 2.8 0L19.4 8.6a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0Z" />' +
      '<path d="m10 10 4 4" />' +
      '</svg>';
    pad.appendChild(clear);

    wrap.appendChild(write);

    // はんていは 問題と紙の下に全幅で置く（盤面の行をまたぐので .kj-play の直下に出す）
    var tools = el('div', 'kj-write-tools');
    var judge = el('button', 'kj-tool kj-judge-btn', 'はんてい');
    judge.type = 'button';
    tools.appendChild(judge);
    wrap.appendChild(tools);

    var pen = setupCanvas(canvas);
    clear.addEventListener('click', pen.clear);
    judge.addEventListener('click', function () { revealKaki(q, ask, tools, pen); });
  }

  /* 「はんてい」→ 正解を出して、自分でまるをつけてもらう */
  function revealKaki(q, ask, tools, pen) {
    var s = state.session;
    if (s.locked) return;
    s.locked = true;
    pen.lock();                 // 書いた字はそのまま残す（正解と見くらべるため）
    var eraser = app.querySelector('.kj-eraser');
    if (eraser) eraser.remove();

    ask.innerHTML = '';
    ask.appendChild(el('p', 'kj-kaki-answer', q.answer));
    ask.appendChild(el('p', 'kj-kaki-note', q.word + '（' + q.ask + '）'));
    ask.appendChild(el('p', 'kj-kaki-check', 'おなじ かたちに かけた?'));

    // けす・はんていと同じ行に置きかえる（行を足すと盤面の固定高さからはみ出す）
    tools.innerHTML = '';
    tools.classList.add('is-marks');
    [['ok', 'かけた'], ['ng', 'まちがった']].forEach(function (m) {
      var b = el('button', 'kj-mark kj-mark-' + m[0], m[1]);
      b.type = 'button';
      b.addEventListener('click', function () { markKaki(m[0] === 'ok', q); });
      tools.appendChild(b);
    });
  }

  function markKaki(ok, q) {
    var s = state.session;
    if (s.marked) return;
    s.marked = true;
    if (ok) s.correct++;
    else s.missed.push(q.answer + '（' + q.ask + '）');

    Array.prototype.forEach.call(app.querySelectorAll('.kj-mark'), function (b) { b.disabled = true; });

    var fb = app.querySelector('.kj-feedback');
    fb.className = 'kj-feedback ' + (ok ? 'is-ok' : 'is-ng');
    fb.textContent = ok ? 'よく かけました!' : 'つぎ がんばろう!';

    setTimeout(function () { if (state.session !== s) return; s.index++; nextQuestion(); }, NEXT_DELAY);
  }

  /* canvas に指・ペン・マウスで線を引く。
     - touch-action:none（CSS）が無いと、タブレットで書こうとするとページがスクロールする
     - 画面の解像度ぶん引きのばさないと線がぼやけて「きたない字」に見える */
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

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    var wrap = el('div', 'kj-result');
    // 全問正解のときだけ、お祝いの絵に差し替える（2026-09-03）
    if (s.correct === SET_LENGTH) wrap.classList.add('is-perfect');
    var stars = s.correct >= 10 ? 3 : s.correct >= 8 ? 2 : s.correct >= 5 ? 1 : 0;
    wrap.appendChild(el('p', 'kj-result-stars', '★★★☆☆☆'.slice(3 - stars, 6 - stars)));
    wrap.appendChild(el('p', 'kj-result-score', SET_LENGTH + 'もんちゅう ' + s.correct + 'もん せいかい!'));
    if (s.missed.length) {
      wrap.appendChild(el('p', 'kj-result-msg', 'まちがえた ことば'));
      var list = el('div', 'kj-missed');
      s.missed.forEach(function (m) { list.appendChild(el('span', 'kj-missed-item', m)); });
      wrap.appendChild(list);
    } else {
      wrap.appendChild(el('p', 'kj-result-msg', 'ぜんもん せいかい! かんじマスター!'));
    }

    var again = el('button', 'kj-start', 'もういちど');
    again.type = 'button';
    again.addEventListener('click', startSession);
    wrap.appendChild(again);

    var back = el('button', 'kj-back', '← もんだいせんたくに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);
    app.appendChild(wrap);
  }

  history.replaceState({ nkStep: 1 }, '');
  renderMenuStep(1);
})();
