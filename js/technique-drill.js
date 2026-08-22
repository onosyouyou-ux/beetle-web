/* ============================================================
   technique-drill.js — テスト技法ドリル
   仕様をその場で組み立てて出題するので、問題は毎回ちがう。
   答えは全部その場で計算できるものだけを扱う（採点に迷いが出ないため）。
   計算も採点もブラウザ内で完結し、サーバーには何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('td-app');
  if (!app) return;

  var SET_LENGTH = 10;

  var MODES = [
    { id: 'all', name: 'ぜんぶ', note: '4技法から順に' },
    { id: 'boundary', name: '境界値分析', note: '境目のとり方' },
    { id: 'equivalence', name: '同値分割', note: '同じ扱いの区分' },
    { id: 'decision', name: 'デシジョンテーブル', note: '組み合わせの数' },
    { id: 'pairwise', name: 'ペアワイズ', note: '全網羅と下限' }
  ];

  var state = { modeId: 'all', session: null };

  /* ---------- 小道具 ---------- */

  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function pick(a) { return a[randInt(0, a.length - 1)]; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function nums(list) { return list.join('、'); }

  // 選択肢は「正解 ＋ ありがちな間違い」で作る。
  // 足りなければ近い数字で埋めるが、正解と重複しないようにする。
  function fillNumberOptions(correct, wrongs) {
    var opts = [correct];
    shuffle(wrongs.slice()).forEach(function (w) {
      if (opts.length < 4 && w > 0 && opts.indexOf(w) < 0) opts.push(w);
    });
    var d = 1, guard = 0;
    while (opts.length < 4 && guard++ < 100) {
      var c = correct + (guard % 2 ? d : -d);
      if (c > 0 && opts.indexOf(c) < 0) opts.push(c);
      if (guard % 2 === 0) d++;
    }
    return shuffle(opts);
  }

  /* ---------- 境界値分析 ---------- */

  var BOUNDARY_SUBJECTS = [
    { label: '注文個数', unit: '個' },
    { label: 'パスワードの文字数', unit: '文字' },
    { label: '予約人数', unit: '人' },
    { label: 'クーポンの割引率', unit: '%' },
    { label: '会員ポイントの利用数', unit: 'pt' },
    { label: '商品名の文字数', unit: '文字' }
  ];

  function qBoundary() {
    var s = pick(BOUNDARY_SUBJECTS);
    var min = pick([0, 1, 1, 1, 5, 10]);
    var max = min + pick([9, 19, 29, 49, 99, 254]);
    var spec = '「' + s.label + 'は ' + min + ' 以上 ' + max + ' 以下の整数」';

    if (Math.random() < 0.5) {
      // 値そのものを選ばせる（2値の境界値分析）
      var correct = [min - 1, min, max, max + 1];
      var wrongSets = [
        [min, min + 1, max - 1, max],                       // 内側だけ取ってしまう
        [min - 1, min, min + 1, max - 1, max, max + 1],     // 3値と取りちがえる
        [min, max],                                         // 境界そのものだけ
        [min - 1, max + 1]                                  // 外側だけ
      ];
      var opts = shuffle([correct].concat(wrongSets.slice(0, 3)));
      return {
        tech: '境界値分析',
        ask: spec + 'のとき、<b>2値の境界値分析</b>でとる値はどれ？',
        options: opts.map(function (o) { return { key: o.join(','), text: nums(o) }; }),
        answerKey: correct.join(','),
        why: '2値は「境界そのもの」と「その1つ外側」を取ります。下の境界で ' + (min - 1) + ' と ' + min +
          '、上の境界で ' + max + ' と ' + (max + 1) + ' の計4値。' +
          (min === 0 ? '下限が0なので外側は -1 になります（マイナスを弾く仕様かも確認どころ）。' : '')
      };
    }

    // 件数を答えさせる（2値 or 3値）
    var three = Math.random() < 0.5;
    var n = three ? 6 : 4;
    return {
      tech: '境界値分析',
      ask: spec + 'のとき、<b>' + (three ? '3値' : '2値') + 'の境界値分析</b>でとる値は何件？',
      options: fillNumberOptions(n, [three ? 4 : 6, 2, 8, 3]).map(function (v) {
        return { key: String(v), text: v + '件' };
      }),
      answerKey: String(n),
      why: three
        ? '3値は境界の「手前・境界・その先」を取ります。下で ' + (min - 1) + '/' + min + '/' + (min + 1) +
          '、上で ' + (max - 1) + '/' + max + '/' + (max + 1) + ' の6件。'
        : '2値は境界とその1つ外側だけ。下で ' + (min - 1) + '/' + min + '、上で ' + max + '/' + (max + 1) + ' の4件。'
    };
  }

  /* ---------- 同値分割 ---------- */

  var EQ_CASES = [
    {
      subject: '入園料',
      unit: '歳',
      bands: [['幼児', 0, 5], ['小人', 6, 12], ['大人', 13, 64], ['シニア', 65, 120]]
    },
    {
      subject: '送料',
      unit: '円',
      bands: [['通常送料', 0, 2999], ['割引送料', 3000, 9999], ['送料無料', 10000, 99999]]
    },
    {
      subject: '会員ランク',
      unit: 'pt',
      bands: [['レギュラー', 0, 999], ['シルバー', 1000, 4999], ['ゴールド', 5000, 19999], ['プラチナ', 20000, 99999]]
    },
    {
      subject: '配送区分',
      unit: 'g',
      bands: [['ミニレター', 1, 25], ['定形', 26, 50], ['定形外', 51, 999], ['宅配', 1000, 30000]]
    }
  ];

  function inBand(b) { return randInt(b[1], b[2]); }

  function qEquivalence() {
    var c = pick(EQ_CASES);
    var specLines = c.bands.map(function (b) {
      return b[1] + '〜' + b[2] + c.unit + ' は「' + b[0] + '」';
    }).join('／');
    var spec = '「' + c.subject + 'は ' + specLines + '」';

    if (Math.random() < 0.5) {
      // 同じ区分に入る値を選ばせる
      var idx = randInt(0, c.bands.length - 1);
      var band = c.bands[idx];
      var target = inBand(band);
      var correct = inBand(band);
      var guard = 0;
      while (correct === target && guard++ < 50) correct = inBand(band);
      if (correct === target) {          // 幅が1しかない区分に当たったときの保険
        return qEquivalence();
      }
      // 誤答は「ほかの区分の値」から3つ。区分が3つしかない仕様もあるので、
      // 区分を1つずつ配るのではなく、値が3つ揃うまで引き直す
      // （区分ごとに1つ配る作りだと、3区分の仕様で選択肢が3つになっていた）
      var others = c.bands.filter(function (b, i) { return i !== idx; });
      var wrongs = [], guard2 = 0;
      while (wrongs.length < 3 && guard2++ < 300) {
        var v = inBand(pick(others));
        if (v === correct || v === target || wrongs.indexOf(v) >= 0) continue;
        wrongs.push(v);
      }
      var opts = shuffle([correct].concat(wrongs));
      return {
        tech: '同値分割',
        ask: spec + '。<b>' + target + c.unit + ' と同じ区分</b>に入る値はどれ？',
        options: opts.map(function (v) { return { key: String(v), text: v + c.unit }; }),
        answerKey: String(correct),
        why: target + c.unit + ' は「' + band[0] + '（' + band[1] + '〜' + band[2] + c.unit + '）」の区分。' +
          correct + c.unit + ' も同じ区分なので、同じ扱いを受けます。同値分割では区分ごとに代表1件を選べば足ります。'
      };
    }

    // 区分の数を答えさせる
    var n = c.bands.length;
    return {
      tech: '同値分割',
      ask: spec + '。<b>有効同値クラス</b>はいくつに分けられる？',
      options: fillNumberOptions(n, [n + 1, n - 1, n * 2]).map(function (v) {
        return { key: String(v), text: v + 'クラス' };
      }),
      answerKey: String(n),
      why: '仕様に出てくる区分がそのまま有効同値クラスです（' +
        c.bands.map(function (b) { return b[0]; }).join('・') + ' の' + n + 'つ）。' +
        'このほかに「範囲外の値」＝無効同値クラスがあり、そちらは別に確認します。'
    };
  }

  /* ---------- デシジョンテーブル ---------- */

  var DT_CONDITIONS = [
    '会員である', 'クーポンを持っている', '在庫がある', '初回購入である',
    '送料無料の対象', 'キャンペーン期間中', '予約済みである', '本人確認が済んでいる'
  ];
  var DT_MULTI = [
    { name: '会員ランク', vals: ['一般', 'シルバー', 'ゴールド'] },
    { name: '支払方法', vals: ['カード', '代引き', 'コンビニ', '後払い'] },
    { name: '配送指定', vals: ['指定なし', '日時指定', '置き配'] },
    { name: '端末', vals: ['PC', 'スマホ'] }
  ];

  function qDecision() {
    if (Math.random() < 0.55) {
      // 真偽の条件だけ → 2のn乗
      var n = randInt(2, 5);
      var conds = shuffle(DT_CONDITIONS.slice()).slice(0, n);
      var ans = Math.pow(2, n);
      return {
        tech: 'デシジョンテーブル',
        ask: '条件が「' + conds.join('」「') + '」の' + n + 'つ（それぞれ Yes / No）。' +
          '<b>すべての組み合わせ</b>を書き出すと規則（列）は何通り？',
        options: fillNumberOptions(ans, [n * 2, Math.pow(2, n - 1), Math.pow(2, n + 1), n + 2]).map(function (v) {
          return { key: String(v), text: v + '通り' };
        }),
        answerKey: String(ans),
        why: '条件が' + n + 'つで、それぞれ Yes / No の2通り。2の' + n + '乗で ' + ans + ' 通りです。' +
          '実際の表では、あり得ない組み合わせを削ったり無関係な条件を「－」でまとめたりして減らします。'
      };
    }

    // 多値の条件が混ざる → 掛け算
    var k = randInt(2, 3);
    var picked = shuffle(DT_MULTI.slice()).slice(0, k);
    var boolN = randInt(0, 2);
    var boolConds = shuffle(DT_CONDITIONS.slice()).slice(0, boolN);
    var parts = picked.map(function (p) { return p.name + '（' + p.vals.join('・') + ' の' + p.vals.length + '通り）'; })
      .concat(boolConds.map(function (b) { return '「' + b + '」（Yes / No の2通り）'; }));
    var ans2 = picked.reduce(function (a, p) { return a * p.vals.length; }, 1) * Math.pow(2, boolN);
    var sumWrong = picked.reduce(function (a, p) { return a + p.vals.length; }, 0) + boolN * 2;
    return {
      tech: 'デシジョンテーブル',
      ask: '条件が ' + parts.join('、') + '。<b>すべての組み合わせ</b>は何通り？',
      options: fillNumberOptions(ans2, [sumWrong, ans2 * 2, Math.round(ans2 / 2)]).map(function (v) {
        return { key: String(v), text: v + '通り' };
      }),
      answerKey: String(ans2),
      why: '各条件の取りうる値の数を掛け合わせます。' +
        picked.map(function (p) { return p.vals.length; }).concat(boolN ? Array(boolN).fill(2) : []).join(' × ') +
        ' ＝ ' + ans2 + ' 通り。足し算ではなく掛け算になるところが、組み合わせが爆発する理由です。'
    };
  }

  /* ---------- ペアワイズ ---------- */

  var PW_FACTORS = [
    { name: 'OS', vals: ['Windows', 'macOS', 'iOS', 'Android'] },
    { name: 'ブラウザ', vals: ['Chrome', 'Safari', 'Edge'] },
    { name: '会員種別', vals: ['未会員', '一般', 'プレミアム'] },
    { name: '決済手段', vals: ['カード', '代引き', 'コンビニ'] },
    { name: '言語', vals: ['日本語', '英語'] },
    { name: '画面', vals: ['PC', 'タブレット', 'スマホ'] }
  ];

  function qPairwise() {
    var k = randInt(3, 4);
    var fs = shuffle(PW_FACTORS.slice()).slice(0, k).map(function (f) {
      var n = randInt(2, f.vals.length);
      return { name: f.name, n: n };
    });
    var spec = fs.map(function (f) { return f.name + f.n + '種'; }).join(' × ');
    var total = fs.reduce(function (a, f) { return a * f.n; }, 1);

    if (Math.random() < 0.5) {
      return {
        tech: 'ペアワイズ',
        ask: '「' + spec + '」の組み合わせテスト。<b>全網羅</b>だと何件？',
        options: fillNumberOptions(total, [
          fs.reduce(function (a, f) { return a + f.n; }, 0),
          total * 2, Math.round(total / 2)
        ]).map(function (v) { return { key: String(v), text: v + '件' }; }),
        answerKey: String(total),
        why: '全網羅は各因子の水準数の掛け算。' + fs.map(function (f) { return f.n; }).join(' × ') +
          ' ＝ ' + total + ' 件です。因子が1つ増えるだけで件数が跳ね上がるので、ここを削るのがペアワイズの役目です。'
      };
    }

    // 2因子間網羅の理論上の下限＝いちばん大きい2つの水準数の積
    var sorted = fs.map(function (f) { return f.n; }).sort(function (a, b) { return b - a; });
    var lower = sorted[0] * sorted[1];
    return {
      tech: 'ペアワイズ',
      ask: '「' + spec + '」をペアワイズ（2因子間網羅）で削るとき、' +
        '<b>理論上これ以上少なくできない件数</b>はいくつ？',
      options: fillNumberOptions(lower, [total, sorted[0], lower + sorted[0]]).map(function (v) {
        return { key: String(v), text: v + '件' };
      }),
      answerKey: String(lower),
      why: '水準数がいちばん多い2つの因子だけを見ても、その全組み合わせ ' + sorted[0] + ' × ' + sorted[1] +
        ' ＝ ' + lower + ' 通りは必ず1回ずつ要ります。だから ' + lower + ' 件が下限です' +
        '（全網羅の ' + total + ' 件に対して、実際の生成結果はこの下限より少し多いあたりに落ち着きます）。'
    };
  }

  /* ---------- 出題 ---------- */

  var GENERATORS = {
    boundary: qBoundary,
    equivalence: qEquivalence,
    decision: qDecision,
    pairwise: qPairwise
  };
  var ALL_IDS = ['boundary', 'equivalence', 'decision', 'pairwise'];

  function makeSet() {
    var qs = [];
    for (var i = 0; i < SET_LENGTH; i++) {
      var id = state.modeId === 'all' ? ALL_IDS[i % ALL_IDS.length] : state.modeId;
      qs.push(GENERATORS[id]());
    }
    return state.modeId === 'all' ? shuffle(qs) : qs;
  }

  /* ---------- 画面 ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderMenu() {
    app.innerHTML = '';
    var wrap = el('div', 'td-menu');

    var sec = el('section', 'td-group');
    sec.appendChild(el('h3', 'td-group-title', '技法をえらぶ'));
    var grid = el('div', 'td-choices');
    MODES.forEach(function (m) {
      var btn = el('button', 'td-choice');
      btn.type = 'button';
      btn.appendChild(el('span', 'td-choice-label', m.name));
      btn.appendChild(el('span', 'td-choice-note', m.note));
      if (state.modeId === m.id) btn.classList.add('is-on');
      btn.addEventListener('click', function () { state.modeId = m.id; renderMenu(); });
      grid.appendChild(btn);
    });
    sec.appendChild(grid);
    wrap.appendChild(sec);

    wrap.appendChild(el('p', 'td-note', '1セット10問。仕様はその場で作るので、同じ問題は出ません。'));

    var start = el('button', 'td-start', 'スタート');
    start.type = 'button';
    start.addEventListener('click', startSession);
    wrap.appendChild(start);

    app.appendChild(wrap);
  }

  function startSession() {
    state.session = { qs: makeSet(), index: 0, correct: 0, locked: false, missed: [] };
    renderPlay();
  }

  function renderPlay() {
    var s = state.session;
    var q = s.qs[s.index];
    s.locked = false;   // 問題を出すたびに解除する（忘れると2問目以降が押せない）
    app.innerHTML = '';
    var wrap = el('div', 'td-play');

    var head = el('div', 'td-play-head');
    head.appendChild(el('span', 'td-play-count', (s.index + 1) + ' / ' + s.qs.length));
    head.appendChild(el('span', 'td-play-score', '正解 ' + s.correct));
    wrap.appendChild(head);

    var bar = el('div', 'td-bar');
    var fill = el('div', 'td-bar-fill');
    fill.style.width = (s.index / s.qs.length * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    wrap.appendChild(el('span', 'td-tech', q.tech));

    var ask = el('p', 'td-ask');
    ask.innerHTML = q.ask;
    wrap.appendChild(ask);

    var options = el('div', 'td-options');
    q.options.forEach(function (o) {
      var b = el('button', 'td-opt', o.text);
      b.type = 'button';
      b.dataset.key = o.key;
      b.addEventListener('click', function () { choose(o, b, options); });
      options.appendChild(b);
    });
    wrap.appendChild(options);

    wrap.appendChild(el('div', 'td-feedback'));

    var back = el('button', 'td-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  function choose(chosen, btn, options) {
    var s = state.session;
    if (s.locked) return;
    s.locked = true;
    var q = s.qs[s.index];
    var ok = chosen.key === q.answerKey;
    if (ok) s.correct++; else s.missed.push({ q: q, chosen: chosen });

    Array.prototype.forEach.call(options.querySelectorAll('.td-opt'), function (b) {
      b.disabled = true;
      if (b.dataset.key === q.answerKey) b.classList.add('is-correct');
    });
    if (!ok) btn.classList.add('is-wrong');

    var fb = app.querySelector('.td-feedback');
    fb.className = 'td-feedback ' + (ok ? 'is-ok' : 'is-ng');
    var head = el('p', 'td-fb-head', ok ? '正解' : '不正解 — 正解は ' +
      q.options.filter(function (o) { return o.key === q.answerKey; })[0].text);
    fb.appendChild(head);
    fb.appendChild(el('p', 'td-fb-why', q.why));

    var next = el('button', 'td-next', s.index + 1 >= s.qs.length ? '結果を見る →' : '次の問題 →');
    next.type = 'button';
    next.addEventListener('click', function () {
      s.index++;
      if (s.index >= s.qs.length) renderResult(); else renderPlay();
    });
    fb.appendChild(next);
    next.focus();
  }

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    var wrap = el('div', 'td-result');
    var pct = Math.round(s.correct / s.qs.length * 100);

    wrap.appendChild(el('p', 'td-result-score', s.qs.length + '問中 ' + s.correct + '問 正解（' + pct + '%）'));
    wrap.appendChild(el('p', 'td-result-msg',
      pct === 100 ? '全問正解。仕様を見て件数がすぐ出るなら、テスト設計の見積もりも速くなります。'
        : pct >= 80 ? 'あと少し。落とした技法だけカタログで読み直すと固まります。'
          : pct >= 50 ? '半分は入っています。技法ごとに絞って繰り返すのが早いです。'
            : 'まずは1技法だけを選んで、解説を読みながら回してみてください。'));

    if (s.missed.length) {
      var box = el('div', 'td-missed');
      box.appendChild(el('h3', null, 'まちがえた問題（' + s.missed.length + '問）'));
      s.missed.forEach(function (m) {
        var item = el('div', 'td-missed-item');
        item.appendChild(el('span', 'td-missed-tech', m.q.tech));
        var a = el('p', 'td-missed-ask');
        a.innerHTML = m.q.ask;
        item.appendChild(a);
        item.appendChild(el('p', 'td-missed-why', m.q.why));
        box.appendChild(item);
      });
      wrap.appendChild(box);
    }

    var link = el('p', 'td-result-link');
    link.innerHTML = '技法そのものの説明は <a href="/tools/test-techniques/">テスト技法カタログ</a>、' +
      'ペアワイズの表をその場で作るなら <a href="/tools/pairwise/">ペアワイズ生成器</a> をどうぞ。';
    wrap.appendChild(link);

    var again = el('button', 'td-start', 'もう一度');
    again.type = 'button';
    again.addEventListener('click', startSession);
    wrap.appendChild(again);

    var back = el('button', 'td-back', '← メニューに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  renderMenu();
})();
