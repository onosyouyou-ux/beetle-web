// 使い方モーダル（2026-09-22追加）。
// ヘッダーの「使い方を見る」と各カードの「？」から開き、data-help の節までスクロールする
(function () {
  var modal = document.getElementById('helpModal');
  if (!modal || typeof modal.showModal !== 'function') return;
  var body = modal.querySelector('.help-body');

  function open(sec) {
    modal.showModal();
    var target = document.getElementById('help-' + sec);
    body.scrollTop = target && sec !== 'top' ? target.offsetTop - body.offsetTop - 8 : 0;
  }

  document.querySelectorAll('[data-help]').forEach(function (btn) {
    btn.addEventListener('click', function () { open(btn.dataset.help); });
  });
  modal.querySelector('.help-close').addEventListener('click', function () { modal.close(); });
  // 外側（背景）を押したら閉じる
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });
  // 目次はモーダルの中だけでスクロールさせる（URLに # を付けない）
  modal.querySelectorAll('.help-toc a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      open(a.getAttribute('href').slice(6));
    });
  });
})();
