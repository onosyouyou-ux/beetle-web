/* 修行アプリの問題画面を「窓（ポップアップ）」で開く（2026-09-27）。
   子どもが触っていると、メニュー → 問題 → けっか と同じ場所の中身が入れ替わるだけで
   どこにいるのか分からなくなっていた。問題と けっか は窓の中に出し、閉じれば元のメニューに戻る形にする。

   しくみ：アプリの箱（#tk-app など）をそのまま窓の中へ移し、閉じたら元の場所へ戻す。
   箱の見た目は #tk-app などを基準に書かれているので、箱ごと動かせばCSSはそのまま効く。
   元の場所には、開いた時点のメニューの写しを置いておく（暗くした後ろに見えるだけで、さわれない）。

   各アプリからは2か所だけ呼ぶ：
   - プレイに入るとき  NkModal.open(app, { onClose: メニューへもどる関数 })
   - メニューを描くとき NkModal.close()
   「とじる」「Esc」は onClose を呼ぶだけ。履歴の後始末は各アプリの「もどる」と同じ道を通す。 */
(function (global) {
  'use strict';

  var dlg = null;
  var titleEl = null;
  var bodyEl = null;
  var app = null;
  var holder = null;
  var onClose = null;

  function requestClose() {
    if (onClose) onClose();
  }

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'nk-modal';

    var bar = document.createElement('div');
    bar.className = 'nk-modal-bar';
    titleEl = document.createElement('p');
    titleEl.className = 'nk-modal-title';
    titleEl.id = 'nk-modal-title';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'nk-modal-close';
    close.innerHTML = '<span aria-hidden="true">✕</span> とじる';
    close.addEventListener('click', requestClose);
    bar.appendChild(titleEl);
    bar.appendChild(close);

    bodyEl = document.createElement('div');
    bodyEl.className = 'nk-modal-body';

    dlg.appendChild(bar);
    dlg.appendChild(bodyEl);
    dlg.setAttribute('aria-labelledby', 'nk-modal-title');
    // Esc で閉じるときも「とじる」と同じ道を通す（dialog にまかせると履歴が残る）
    dlg.addEventListener('cancel', function (e) {
      e.preventDefault();
      requestClose();
    });
  }

  function pageTitle() {
    var h1 = document.querySelector('.app-paper h1');
    return h1 ? h1.textContent.trim() : '';
  }

  function open(appEl, opts) {
    onClose = opts && opts.onClose;
    if (app) return; // もう開いている（「もういちど」など）
    if (!dlg) build();
    app = appEl;

    // 後ろに残すメニューの写し。id もそのまま写して見た目をそろえる（さわれないので重複は実害なし）
    holder = appEl.cloneNode(true);
    holder.classList.add('nk-modal-holder');
    holder.setAttribute('aria-hidden', 'true');
    holder.inert = true;
    appEl.parentNode.insertBefore(holder, appEl);
    // 窓は元の箱と同じ親の中に置き、親クラスに書かれた見た目も効くようにする
    holder.parentNode.insertBefore(dlg, holder.nextSibling);

    titleEl.textContent = pageTitle();
    bodyEl.appendChild(appEl);
    document.documentElement.classList.add('nk-modal-open');
    if (!dlg.open) dlg.showModal();
    bodyEl.scrollTop = 0;
  }

  function close() {
    if (!app) return;
    holder.parentNode.replaceChild(app, holder);
    app = null;
    holder = null;
    if (dlg.open) dlg.close();
    document.documentElement.classList.remove('nk-modal-open');
  }

  global.NkModal = {
    open: open,
    close: close,
    isOpen: function () { return !!app; }
  };
})(window);
