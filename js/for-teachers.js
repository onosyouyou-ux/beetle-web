/* 先生向けのご案内：「リンクをコピー」ボタン（#96）。
   コピーするのは utm を付けない素のURL（ロイロノートや連絡帳に貼ったとき、子どもにも読める形にする） */
(function () {
  'use strict';

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.ft-copy');
    if (!btn) return;
    var label = btn.dataset.label || btn.textContent;
    btn.dataset.label = label;
    copy(btn.dataset.url).then(function (ok) {
      btn.textContent = ok ? 'コピーしました' : 'コピーできませんでした';
      btn.classList.toggle('is-done', ok);
      setTimeout(function () {
        btn.textContent = label;
        btn.classList.remove('is-done');
      }, 2000);
    });
  });
})();
