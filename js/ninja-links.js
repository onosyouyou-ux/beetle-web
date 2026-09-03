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
    sansu:    { name: 'さんすう',         note: 'けいさんを する',     img: 'nk-link-sansu.webp',    href: '/tools/sansu-app/' }
  };

  /* どのアプリから、どの3つを、どの順で出すか */
  var RELATED = {
    kanji:    ['katakana', 'romaji', 'tokei'],
    katakana: ['kanji', 'romaji', 'sansu'],
    romaji:   ['phonics', 'katakana', 'kanji'],
    phonics:  ['romaji', 'katakana', 'kanji'],
    tokei:    ['sansu', 'kanji', 'katakana'],
    sansu:    ['tokei', 'kanji', 'katakana']
  };

  var TITLE = 'ほかの しゅぎょう';
  var IMG_BASE = '/assets/images/ninja/';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* HTML文字列を返す（innerHTML で組み立てているアプリ用） */
  function html(currentId) {
    var ids = RELATED[currentId] || [];
    if (!ids.length) return '';
    return '<section class="nk-links">' +
      '<h2 class="nk-links-title">' + esc(TITLE) + '</h2>' +
      '<div class="nk-links-list">' +
        ids.map(function (id) {
          var a = APPS[id];
          if (!a) return '';
          return '<a class="nk-link" href="' + esc(a.href) + '">' +
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

  global.NinjaLinks = { html: html, el: el, APPS: APPS, RELATED: RELATED };
})(window);
