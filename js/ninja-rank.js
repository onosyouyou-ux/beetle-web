/* 修行アプリの「忍者ランク」（#173。2026-10-15）。
   正解と とく はやさ から 1000点満点のスコアを出し、24段階のランクにする。
   アプリごとに「とうたつした いちばん上のランク」だけを この端末に のこし、修行画面に バッジで出す。
   バッジを押すと、そのランクの絵だけを大きく出す（スコアなどの数字は出さない。ユーザー決定）。

   各アプリからは4か所だけ呼ぶ：
   - 始めるとき          NinjaRank.begin()
   - 問題を出したとき    NinjaRank.ask()
   - こたえたとき        NinjaRank.answered()
   - けっか を描くとき   NinjaRank.finish(app, 正解数, 問題数) … けっかに差しこむ要素を返す
   バッジは アプリの箱の前に NinjaRank.mount(app, 箱) で1回だけ置く（箱は窓へ移るが、バッジは紙面に残る）。

   はやさ は「問題が出てから こたえるまで」だけを はかる。こたえあわせを読んでいる間は数えない。 */
(function (global) {
  'use strict';

  // ランクの絵（assets/images/ninja/ranks/rank-01.webp〜rank-24.webp）がそろったら true にする。
  // false のあいだは、絵のかわりに 札（ふだ）の形で ランク名を出す
  var IMAGES_READY = false;
  var IMAGE_DIR = '/assets/images/ninja/ranks/';

  // 1もん あたりの 基準の秒数。これより はやければ はやさ点は満点。
  // ふつうに といたときの はやさに合わせる（実測して直す）
  var BASE_SEC = {
    sansu: 5, sakuranbo: 8, kuku: 3, tokei: 6,
    kanji: 4, katakana: 4, romaji: 6, phonics: 5
  };
  var DEFAULT_BASE = 5;
  var MAX_SEC = 60;  // 1もんで数える時間の上限。席を立ったまま放っておいた分で こわれないように

  // 24段階。min は そのランクに必要なスコア、need は 追加の条件（acc90＝正解率90%以上／perfect＝全問正解／god＝全問正解＋はやさ点390以上）
  var RANKS = [
    { name: '村人', kana: 'むらびと', min: 0 },
    { name: '忍者見習い', kana: 'にんじゃみならい', min: 25 },
    { name: '弟子入り', kana: 'でしいり', min: 50 },
    { name: '雑用係', kana: 'ざつようがかり', min: 75 },
    { name: '下忍・初段', kana: 'げにん・しょだん', min: 100 },
    { name: '下忍・二段', kana: 'げにん・にだん', min: 150 },
    { name: '下忍・三段', kana: 'げにん・さんだん', min: 200 },
    { name: '中忍・初段', kana: 'ちゅうにん・しょだん', min: 250 },
    { name: '中忍・二段', kana: 'ちゅうにん・にだん', min: 300 },
    { name: '中忍・三段', kana: 'ちゅうにん・さんだん', min: 350 },
    { name: '上忍・初段', kana: 'じょうにん・しょだん', min: 400 },
    { name: '上忍・二段', kana: 'じょうにん・にだん', min: 435 },
    { name: '上忍・三段', kana: 'じょうにん・さんだん', min: 470 },
    { name: '斥候', kana: 'せっこう', min: 505 },
    { name: '隠密', kana: 'おんみつ', min: 540 },
    { name: '影武者', kana: 'かげむしゃ', min: 575 },
    { name: '忍頭', kana: 'しのびがしら', min: 610 },
    { name: '副頭領', kana: 'ふくとうりょう', min: 650 },
    { name: '頭領', kana: 'とうりょう', min: 715, need: 'acc90' },
    { name: '里長', kana: 'さとおさ', min: 780, need: 'acc90' },
    { name: '伝説の忍', kana: 'でんせつの しのび', min: 850, need: 'perfect' },
    { name: '天下無双', kana: 'てんかむそう', min: 900, need: 'perfect' },
    { name: '神出鬼没', kana: 'しんしゅつきぼつ', min: 950, need: 'perfect' },
    { name: '忍神', kana: 'しのびがみ', min: 990, need: 'god' }
  ];

  /* ---- スコアとランク（画面に依存しない。tests/ninja-rank.test.mjs で境界を確かめる） ---- */

  // ok: 正解数、total: 問題数、avgSec: 1もんの平均秒数、baseSec: 基準の秒数
  function score(ok, total, avgSec, baseSec) {
    var rate = total > 0 ? Math.max(0, Math.min(1, ok / total)) : 0;
    var accuracy = Math.round(rate * 600);
    var quick = avgSec > 0 ? Math.min(1, baseSec / avgSec) : 0;
    // 正解率を掛けて、でたらめに はやく押しただけでは点が入らないようにする
    var speed = Math.round(400 * quick * rate);
    return { rate: rate, accuracy: accuracy, speed: speed, total: accuracy + speed };
  }

  function meets(need, s) {
    if (!need) return true;
    if (need === 'acc90') return s.rate >= 0.9;
    if (need === 'perfect') return s.rate >= 1;
    if (need === 'god') return s.rate >= 1 && s.speed >= 390;
    return false;
  }

  // 1始まりのランク番号。スコアが届いていても条件を満たさなければ、満たせる いちばん上で止める
  function rankFor(s) {
    for (var i = RANKS.length - 1; i > 0; i--) {
      if (s.total >= RANKS[i].min && meets(RANKS[i].need, s)) return i + 1;
    }
    return 1;
  }

  /* ---- この端末に のこす（アプリごとの最高ランク番号だけ） ---- */

  var KEY = 'nk-rank-v1';
  function load() {
    try {
      var v = JSON.parse(global.localStorage.getItem(KEY) || '{}');
      return v && typeof v === 'object' ? v : {};
    } catch (e) { return {}; }
  }
  function best(app) {
    var n = load()[app];
    return n >= 1 && n <= RANKS.length ? n : 0;
  }
  function saveBest(app, n) {
    try {
      var v = load();
      v[app] = n;
      global.localStorage.setItem(KEY, JSON.stringify(v));
    } catch (e) { /* 保存できない端末（プライベートなど）でも遊べるように */ }
  }

  /* ---- はやさ を はかる ---- */

  var timing = { sum: 0, count: 0, t0: 0 };
  function now() { return global.performance && performance.now ? performance.now() : Date.now(); }
  function begin() { timing = { sum: 0, count: 0, t0: 0 }; }
  // 同じ問題で描き直しても（ヒントを出す等）、最初に出した時刻のまま
  function ask() { if (!timing.t0) timing.t0 = now(); }
  function answered() {
    if (!timing.t0) return;
    timing.sum += Math.min(MAX_SEC, (now() - timing.t0) / 1000);
    timing.count += 1;
    timing.t0 = 0;
  }

  /* ---- 画面 ---- */

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function rubyName(r) { return '<ruby>' + r.name + '<rt>' + r.kana + '</rt></ruby>'; }

  // ランクの絵。絵がまだ無いあいだは 札の形
  function art(n, big) {
    var r = RANKS[n - 1];
    if (IMAGES_READY) {
      return '<img class="nr-art' + (big ? ' is-big' : '') + '" src="' + IMAGE_DIR + 'rank-' + pad(n) + '.webp" alt="' + r.name + '">';
    }
    return '<div class="nr-card' + (big ? ' is-big' : '') + (n >= 19 ? ' is-gold' : '') + '" role="img" aria-label="' + r.name + '">' +
      '<span class="nr-card-name">' + rubyName(r) + '</span>' +
      '<span class="nr-card-stamp" aria-hidden="true">認定</span>' +
    '</div>';
  }

  // 絵だけを大きく出す窓
  var viewer = null;
  function openView(n) {
    if (!viewer) {
      viewer = document.createElement('dialog');
      viewer.className = 'nr-view';
      viewer.addEventListener('click', function (e) {
        if (e.target === viewer || e.target.closest('.nr-view-close')) viewer.close();
      });
      document.body.appendChild(viewer);
    }
    viewer.innerHTML = (n
      ? art(n, true)
      : '<p class="nr-view-empty">しゅぎょうを すると<br>ランクが もらえるよ！</p>') +
      '<button type="button" class="nr-view-close"><span aria-hidden="true">✕</span> とじる</button>';
    if (viewer.showModal) viewer.showModal(); else viewer.setAttribute('open', '');
  }

  var badges = {};
  function paintBadge(app) {
    var b = badges[app];
    if (!b) return;
    var n = best(app);
    b.innerHTML = n
      ? '<span class="nr-badge-label">あなたの ランク</span><span class="nr-badge-name">' + rubyName(RANKS[n - 1]) + '</span>'
      : '<span class="nr-badge-label">あなたの ランク</span><span class="nr-badge-name is-none">まだ なし</span>';
    b.setAttribute('aria-label', 'あなたの ランク：' + (n ? RANKS[n - 1].name : 'まだ なし'));
  }

  function mount(app, box) {
    if (!box || !box.parentNode || badges[app]) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nr-badge';
    b.addEventListener('click', function () { openView(best(app)); });
    box.parentNode.insertBefore(b, box);
    badges[app] = b;
    paintBadge(app);
  }

  // けっか画面に差しこむ要素を返す。最高ランクを こえたら のこして「ランクアップ！」
  function finish(app, ok, total) {
    var avg = timing.count ? timing.sum / timing.count : 0;
    var s = score(ok, total, avg, BASE_SEC[app] || DEFAULT_BASE);
    var n = rankFor(s);
    var prev = best(app);
    var up = n > prev;
    if (up) { saveBest(app, n); paintBadge(app); }

    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'nr-result' + (up ? ' is-up' : '');
    el.innerHTML =
      '<span class="nr-result-label">こんかいの ランク</span>' +
      '<span class="nr-result-name">' + rubyName(RANKS[n - 1]) + '</span>' +
      (up ? '<span class="nr-result-up">' + (prev ? 'ランクアップ！' : 'ランク げっと！') + '</span>' : '');
    el.addEventListener('click', function () { openView(n); });
    return el;
  }

  global.NinjaRank = {
    begin: begin, ask: ask, answered: answered, finish: finish, mount: mount,
    // テスト用
    score: score, rankFor: rankFor, RANKS: RANKS, BASE_SEC: BASE_SEC
  };
})(typeof window !== 'undefined' ? window : globalThis);
