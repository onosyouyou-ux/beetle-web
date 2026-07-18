// スマホ幅ではツールカードの説明文を折りたたみ、▼で開閉する（CSSはtest-tools.cssのアコーディオンブロックとセット）。
// カード全体が<a>のため、▼のタップではpreventDefaultして遷移させない。
(function () {
  document.querySelectorAll('.tool-card').forEach(function (card) {
    var top = card.querySelector('.tool-card-top');
    var desc = card.querySelector('.tool-desc');
    if (!top || !desc) return;
    var btn = document.createElement('span');
    btn.className = 'tool-desc-toggle';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', '説明を開く');
    function toggle(e) {
      e.preventDefault();
      e.stopPropagation();
      var open = card.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? '説明を閉じる' : '説明を開く');
    }
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') toggle(e);
    });
    top.appendChild(btn);
  });
})();
