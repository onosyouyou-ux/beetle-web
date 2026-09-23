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
    kuku:     { name: 'かけざん修行',     note: 'くくを となえる',     img: 'nk-link-kuku.webp',     href: '/tools/kuku/' }
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
     既存6本の並びは変えない（3段目の中央寄せは ninja-kids.css の .nk-link:last-child 側）。 */
  var ORDER = ['sansu', 'katakana', 'kanji', 'tokei', 'phonics', 'romaji', 'kuku'];

  var TITLE = 'しゅぎょう いちらん';
  var IMG_BASE = '/assets/images/ninja/';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* HTML文字列を返す（innerHTML で組み立てているアプリ用） */
  function html(currentId) {
    return '<section class="nk-links">' +
      '<h2 class="nk-links-title">' + esc(TITLE) + '</h2>' +
      '<div class="nk-links-list">' +
        ORDER.map(function (id) {
          var a = APPS[id];
          if (!a) return '';
          var here = id === currentId ? ' aria-current="page"' : '';
          return '<a class="nk-link" href="' + esc(a.href) + '"' + here + '>' +
            '<img class="nk-link-img" src="' + esc(IMG_BASE + a.img) + '"' +
              ' width="' + IMG_W + '" height="' + IMG_H + '"' +
              ' alt="' + esc(a.name + '（' + a.note + '）') + '">' +
          '</a>';
        }).join('') +
      '</div>' +
    '</section>';
  }

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
})(window);
