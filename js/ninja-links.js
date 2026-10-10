/* 修行アプリ間の相互リンク（2026-09-03・チケット#16）。
   ボタンは1枚絵（/assets/images/ninja/nk-link-*.webp）で、アプリ名と説明は絵に入っている。
   そのため読み上げは alt が担当する（name と note から組み立てる）。
   リンク定義はこのファイル1箇所だけに持つこと。各アプリのJSに複製しない。 */
(function (global) {
  'use strict';

  var IMG_W = 960;
  var IMG_H = 380;

  var APPS = {
    kanji:    { name: 'かんじ修行',       note: 'かんじの よみかた',   img: 'nk-link-kanji.webp',    href: '/tools/kanji/' },
    katakana: { name: 'カタカナ修行',     note: 'カタカナを おぼえる', img: 'nk-link-katakana.webp', href: '/tools/katakana/' },
    romaji:   { name: 'ローマ字修行',     note: 'ローマ字を おぼえる', img: 'nk-link-romaji.webp',   href: '/tools/romaji/' },
    phonics:  { name: 'フォニックス修行', note: 'えいごの おと',       img: 'nk-link-phonics.webp',  href: '/tools/phonics/' },
    tokei:    { name: 'とけい修行',       note: 'とけいを よむ',       img: 'nk-link-tokei.webp',    href: '/tools/tokei/' },
    sansu:    { name: 'さんすう',         note: 'けいさんを する',     img: 'nk-link-sansu.webp',    href: '/tools/sansu-app/' },
    kuku:     { name: 'かけざん修行',     note: 'くくを となえる',     img: 'nk-link-kuku.webp',     href: '/tools/kuku/' },
    sakuranbo:{ name: 'さくらんぼざん',   note: 'さくらんぼで 10を つくる', img: 'nk-link-sakuranbo.webp', href: '/tools/sakuranbo/' }
  };

  /* 全部を、いつも同じ順で出す（2026-09-03改定）。
     いま開いている修行も外さない。
     いま開いているものは aria-current="page" を付けて「ここにいる」と分かるようにする。

     並び順は3列×2行に置いたときの絵の色で決める（2026-09-09改定）。
     1枚絵の地色は さんすう277° / ローマ字274° / フォニックス114° / カタカナ185° /
     とけい20° / かんじ6° で、紫どうし・暖色どうしが2組ある。この2組を対角に置く：

       さんすう(紫)  カタカナ(シアン)  かんじ(赤)
       とけい(橙)    フォニックス(緑)  ローマ字(紫)

     となり合う色の差は最小71°、ななめでも89°。旧順は ローマ字 の真下が さんすう で
     紫が縦に並んでいた。

     7本目の かけざん(青210°) は3段目の中央に置く（2026-09-16）。真上が フォニックス(緑)で差96°、
     ななめ上が とけい・ローマ字。同じ青系の カタカナ(185°) とは離れる。
     既存6本の並びは変えない（3段目の中央寄せは ninja-kids.css の .nk-link:last-child 側）。

     8本目の さくらんぼざん(紫) を足して3段目は2本に（2026-09-29）。2本は段の中央に寄せ、
     さくらんぼざん を左・かけざん を右に置く。逆にすると さくらんぼざん が ローマ字(紫) の
     ななめ下に来て紫が並ぶ。左なら上は とけい(橙)・フォニックス(緑)。 */
  var ORDER = ['sansu', 'katakana', 'kanji', 'tokei', 'phonics', 'romaji', 'sakuranbo', 'kuku'];

  var TITLE = 'しゅぎょう いちらん';
  var IMG_BASE = '/assets/images/ninja/';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* まきもの（修行をまたぐ ごほうび）と きょうの しゅぎょう（レビュー10/9）。
     どの修行でも 1セット おわる（けっか を出す）と、その修行の まきもの が1本もらえる。8本 あつめると 免許皆伝。
     きろくは この端末の localStorage だけ（サーバーには送らない）。使えないときは 何も出さない。
     きょうの しゅぎょう は 日づけで決まる おすすめ1本（いま開いている修行は えらばない） */
  var SCROLL_KEY = 'nk-scrolls';
  function today() { return new Date().toLocaleDateString('sv-SE'); }
  function loadScrolls() {
    try { return JSON.parse(localStorage.getItem(SCROLL_KEY) || '{}') || {}; } catch (e) { return null; }
  }
  function addScroll(app, perfect) {
    var r = loadScrolls();
    if (!r || !APPS[app]) return;
    var x = r[app] || { sets: 0 };
    x.sets += 1;
    if (perfect) x.perfect = true;
    x.last = today();
    r[app] = x;
    try { localStorage.setItem(SCROLL_KEY, JSON.stringify(r)); } catch (e) {}
  }
  function todayPick(currentId) {
    var list = ORDER.filter(function (id) { return id !== currentId; });
    var d = today(), h = 0;
    for (var i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) % 9973;
    return list[h % list.length];
  }

  /* HTML文字列を返す（innerHTML で組み立てているアプリ用） */
  function html(currentId) {
    var r = loadScrolls();
    var got = r ? ORDER.filter(function (id) { return r[id] && r[id].sets > 0; }).length : 0;
    var pick = r ? todayPick(currentId) : null;
    var head = '';
    if (r) {
      head = '<p class="nk-scrolls-sum' + (got === ORDER.length ? ' is-all' : '') + '">' +
        '<img src="' + IMG_BASE + 'tokei-ui/scroll.webp" width="28" height="28" alt="">' +
        (got === ORDER.length
          ? 'まきもの ' + got + 'ほん ぜんぶ あつめた！ めんきょかいでん！'
          : 'あつめた まきもの <b>' + got + '</b> / ' + ORDER.length + 'ほん') +
        '<span>どの しゅぎょうでも 1かい さいごまで やると 1ほん もらえるよ</span></p>';
    }
    return '<section class="nk-links">' +
      '<h2 class="nk-links-title">' + esc(TITLE) + '</h2>' +
      head +
      '<div class="nk-links-list">' +
        ORDER.map(function (id) {
          var a = APPS[id];
          if (!a) return '';
          var here = id === currentId ? ' aria-current="page"' : '';
          var s = r && r[id];
          var badge = '';
          if (id === pick) {
            badge += '<span class="nk-link-today">' + (s && s.last === today() ? '✓ きょうの しゅぎょう できた！' : 'きょうの しゅぎょう') + '</span>';
          }
          if (s && s.sets > 0) {
            badge += '<span class="nk-link-scroll' + (s.perfect ? ' is-gold' : '') + '" title="まきもの">' +
              '<img src="' + IMG_BASE + 'tokei-ui/scroll.webp" width="28" height="28" alt="">' +
              (s.sets > 1 ? '×' + Math.min(s.sets, 99) : '') + '</span>';
          }
          return '<a class="nk-link' + (badge ? ' has-badge' : '') + '" href="' + esc(a.href) + '"' + here + '>' +
            '<img class="nk-link-img" src="' + esc(IMG_BASE + a.img) + '"' +
              ' width="' + IMG_W + '" height="' + IMG_H + '"' +
              ' alt="' + esc(a.name + '（' + a.note + '）' + (s && s.sets > 0 ? '・まきもの あり' : '') + (id === pick ? '・きょうの しゅぎょう' : '')) + '">' +
            badge +
          '</a>';
        }).join('') +
      '</div>' +
    '</section>';
  }
  global.NkScrolls = { add: addScroll };

  /* DOM要素を返す（appendChild で組み立てているアプリ用） */
  function el(currentId) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html(currentId);
    return wrap.firstChild;
  }

  global.NinjaLinks = { html: html, el: el, APPS: APPS, ORDER: ORDER };

  /* プレイ中の見出し：「第○問 / 全○問」「できた！ ○問」と 進みぐあいの目盛り。
     とけい修行の形を 全修行アプリで そろえる（2026-09-23）。
     外側の箱（.kj-play-head / .kt-bar など）は各アプリが持ち、中身だけを返す */
  var HEAD_ICON = '/assets/images/ninja/tokei-ui/';
  // label：えらんだ しゅぎょう（例「かんじを よむ しゅぎょう・小1コース」）。いちばん上に出す
  function headInner(index, total, ok, label) {
    var marks = '';
    for (var i = 0; i < total; i++) {
      marks += '<i class="' + (i < index ? 'is-done' : i === index ? 'is-current' : '') + '"></i>';
    }
    // えらんだ しゅぎょう は別の帯にし、その下に 第○問・できた！・目盛り の箱を置く
    return (label ? '<span class="nk-head-picked">' + esc(label) + '</span>' : '') +
      '<span class="nk-head-bar">' +
      '<span class="nk-head-count">' +
        '<img class="nk-head-icon" src="' + HEAD_ICON + 'scroll.webp" width="28" height="28" alt="">' +
        '<span>第' + (index + 1) + '問 / 全' + total + '問</span>' +
      '</span>' +
      '<span class="nk-head-score">' +
        '<img class="nk-head-icon is-shuriken" src="' + HEAD_ICON + 'shuriken.webp" width="28" height="28" alt="">' +
        '<span class="nk-score-text">できた！ ' + ok + '問</span>' +
      '</span>' +
      '<span class="nk-progress-marks" aria-hidden="true">' + marks + '</span>' +
      '</span>';
  }
  function headScore(root, ok) {
    var t = root.querySelector('.nk-score-text');
    if (t) t.textContent = 'できた！ ' + ok + '問';
  }
  global.NinjaHead = { inner: headInner, score: headScore };

  /* かく しゅぎょう の「おおきく かく」ボタン（2026-09-29。かんじ・カタカナ）。
     押すと盤面に .is-bigpad が付き、書くところが右カラムの上から下まで広がって、
     はんてい（はんてい後は かけた／まちがった）がその真下に移る。並べかえは各アプリの CSS 側。
     canvas は大きさが変わると線を保ったまま描き直すので、書いている途中で押してもよい。
     選んだ大きさは次の問題にも引きつぐ（localStorage。使えないときは毎回ふつうの大きさ） */
  var BIG_KEY = 'nk-bigpad';
  var ICON_GROW = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M14 4h6v6" /><path d="m20 4-6 6" /><path d="M10 20H4v-6" /><path d="m4 20 6-6" /></svg>';
  var ICON_SHRINK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M20 10h-6V4" /><path d="m14 10 6-6" /><path d="M4 14h6v6" /><path d="m10 14-6 6" /></svg>';

  function bigPad(board, pad) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nk-zoom';
    function set(on) {
      board.classList.toggle('is-bigpad', on);
      var label = on ? 'もとの おおきさに もどす' : 'おおきく かく';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.innerHTML = on ? ICON_SHRINK : ICON_GROW;
    }
    btn.addEventListener('click', function () {
      var on = !board.classList.contains('is-bigpad');
      try { localStorage.setItem(BIG_KEY, on ? '1' : '0'); } catch (e) {}
      set(on);
    });
    var saved = false;
    try { saved = localStorage.getItem(BIG_KEY) === '1'; } catch (e) {}
    set(saved);
    pad.appendChild(btn);
  }
  global.NkBigPad = bigPad;
})(window);

/* 盤面の下の読み物（#howto）をアコーディオンにする（2026-09-24）。
   「あそびかた」と、カタカナ・ローマ字・フォニックスの解説の箱を、見出しを押すと開く <details> にする。
   HTML はそのまま（検索にも本文が残る）にして、読み込み時に包み直す。
   おうちのかたへ の案内（.nk-doc-ref）は包まずに出したままにする */
// 解説の箱は各アプリの JS が中身を書き込む（ローマ字など）ので、ページのスクリプトが全部終わってから包む
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var doc = document.getElementById('howto');
  if (!doc || doc.querySelector('.nk-acc')) return;

  function wrap(summaryEl, bodyEls, cls) {
    var d = document.createElement('details');
    d.className = 'nk-acc' + (cls ? ' ' + cls : '');
    var s = document.createElement('summary');
    s.className = 'nk-acc-sum';
    summaryEl.parentNode.insertBefore(d, summaryEl);
    s.appendChild(summaryEl);
    d.appendChild(s);
    bodyEls.forEach(function (el) { d.appendChild(el); });
  }

  // 解説の箱（.kt-rules など）：「ポイント」という見出しのアコーディオンにし、開くと箱の中身が出る。
  // 箱そのものは残す（id で探して書き込むアプリがある）。アコーディオンなので箱の枠は CSS で消す（2026-09-24）
  Array.prototype.forEach.call(doc.querySelectorAll(':scope > [class$="-rules"]'), function (box) {
    if (!box.firstElementChild) return;
    var h = document.createElement('h2');
    h.textContent = 'ポイント';
    wrap(box, [], 'is-box');
    var d = box.parentNode.parentNode; // details（wrap で box は summary の中に入る）
    d.querySelector('summary').replaceChild(h, box);
    d.appendChild(box);
  });

  // あそびかた：見出し（h2）と、その後ろの手順（[class$="-steps"]）
  var h2 = doc.querySelector(':scope > h2');
  if (h2) {
    var body = [];
    var n = h2.nextElementSibling;
    while (n && !n.classList.contains('nk-doc-ref')) { body.push(n); n = n.nextElementSibling; }
    wrap(h2, body, 'is-howto');
  }
});

/* 修行アプリの GA4 カスタムイベント（2026-10-01・#97）。
   mode_select … 練習を選んで始めたとき（app・mode・level）
   set_complete … 1セット終わって けっか を出したとき（app・mode・level・score・total）
   送るのは アプリ名・練習の種類・むずかしさ・正解数だけ。名前・答えの中身・書いた字は送らない。
   GA のタグが無いページ・手元の確認・内部の点検（ga-disable）では何も起きない／送られない */
(function (global) {
  'use strict';
  global.NkTrack = function (event, params) {
    // けっか を出したら その修行の まきもの を1本（GA が無くても きろくする。端末の中だけ）
    if (event === 'set_complete' && params && global.NkScrolls) {
      try { global.NkScrolls.add(params.app, params.total > 0 && params.score >= params.total); } catch (e) {}
    }
    try {
      if (typeof global.gtag === 'function') global.gtag('event', event, params);
    } catch (e) { /* 計測の失敗で アプリを止めない */ }
  };
})(window);

/* まちがえたときの「つぎへ」（2026-10-09 レビュー対応）。
   ✕の忍者は 0.8秒だけ出して消し、問題（★の図・時計）は見せたまま、
   こたえの欄の上に「こたえ＋せつめい＋つぎへ」を重ねて、子どもが押すまで待つ。
   自動で進めると、★の図や時計の せつめいを 見る前に 次の問題になっていた */
(function (global) {
  'use strict';
  global.NkWrongNext = function (o) {
    setTimeout(function () {
      if (!o.options || !o.options.isConnected) return;
      o.fb.classList.remove('is-ng');
      o.fb.textContent = '';
      var p = document.createElement('div');
      p.className = 'nk-next-panel';
      o.lines.forEach(function (t, i) {
        if (!t) return;
        var line = document.createElement('p');
        line.className = i === 0 ? 'nk-next-answer' : 'nk-next-why';
        line.textContent = t;
        p.appendChild(line);
      });
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nk-next-btn';
      b.textContent = 'つぎへ →';
      b.addEventListener('click', o.go, { once: true });
      p.appendChild(b);
      o.options.classList.add('has-next');
      o.options.appendChild(p);
      b.focus({ preventScroll: true });
    }, 800);
  };
})(window);

/* 上に戻る ↑ ボタンが しゅぎょう いちらん のバナー（右端の矢印）や 更新日・案内リンクに かぶる（レビュー10/9）。
   ボタンの真下に それらが来ている間だけ ボタンを消す。通りすぎたら また出る。
   位置（bottom）は common.js が scroll のたびに決めるので、その後（次のフレーム）で判定する */
(function () {
  'use strict';
  var SEL = '.nk-link, .paper-release, .paper-about, .nk-teacher-ref, .nk-doc-ref, .nk-acc-sum';
  var queued = false;
  function check() {
    queued = false;
    var btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    var b = btn.getBoundingClientRect();
    var pad = 6;
    var over = function (r) {
      return r.width && r.left < b.right + pad && r.right > b.left - pad && r.top < b.bottom + pad && r.bottom > b.top - pad;
    };
    var hit = Array.prototype.some.call(document.querySelectorAll(SEL), function (e) {
      if (!over(e.getBoundingClientRect())) return false;
      // 文字の行（更新日・案内）は 箱が全幅なので、字の あるところだけで 見る
      if (!/^(P|DIV)$/.test(e.tagName)) return true;
      var range = document.createRange();
      range.selectNodeContents(e);
      return Array.prototype.some.call(range.getClientRects(), over);
    });
    btn.classList.toggle('nk-top-hide', hit);
  }
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(check);
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
})();
