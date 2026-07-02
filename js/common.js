async function loadPartial(id, url) {
  const el = document.getElementById(id);
  if (!el) return;
  const res = await fetch(url);
  el.innerHTML = await res.text();
}

document.addEventListener('DOMContentLoaded', () => {
  loadPartial('site-header', '/partials/header.html');
  loadPartial('site-footer', '/partials/footer.html').then(() => {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      const footer = document.querySelector('.site-footer');
      if (!footer) return;
      const footerTop = footer.getBoundingClientRect().top;
      if (window.scrollY > 200) {
        btn.classList.add('visible');
        btn.style.bottom = footerTop < window.innerHeight
          ? (window.innerHeight - footerTop + 8) + 'px'
          : '28px';
      } else {
        btn.classList.remove('visible');
        btn.style.bottom = '28px';
      }
    }, { passive: true });

    fetch('/version.json')
      .then(r => r.json())
      .then(d => {
        const el = document.getElementById('site-version');
        if (el) el.textContent = `v${d.v} · ${d.sha}`;
      })
      .catch(() => {});
  });
});

// カードの丸アイコンキャラ（ホバーでランダムなキャラがランダムな方向から飛び出す）
(function () {
  const peekImgEls = document.querySelectorAll('.service-peek-img');
  if (!peekImgEls.length) return;
  const peekImgs = Array.from({ length: 22 }, (_, i) =>
    `/assets/images/peek/peek-${String(i + 1).padStart(2, '0')}.jpg`);
  const peekDirs = ['translate(0,-110%)', 'translate(0,110%)', 'translate(-110%,0)', 'translate(110%,0)'];
  const peekCards = [];
  peekImgEls.forEach((img) => {
    const card = img.closest('a') || img.closest('.service-peek').parentElement;
    if (!card) return;
    peekCards.push(card);
    // data-peek-fixed 指定があればランダムにせず固定画像を使う（ブログ一覧＝著者アバター）
    const fixedSrc = img.closest('.service-peek').dataset.peekFixed || null;
    let hoverId = 0;
    card.addEventListener('mouseenter', () => {
      const id = ++hoverId;
      card.classList.add('peek-on');
      img.style.transition = 'none';
      img.style.transform = peekDirs[Math.floor(Math.random() * peekDirs.length)];
      img.style.opacity = '0';
      img.src = fixedSrc || peekImgs[Math.floor(Math.random() * peekImgs.length)];
      const start = () => {
        if (id !== hoverId) return;
        void img.offsetWidth;
        img.style.transition = 'transform .65s cubic-bezier(.34,1.56,.64,1), opacity .25s ease';
        img.style.transform = 'translate(0,0)';
        img.style.opacity = '1';
      };
      if (img.decode) { img.decode().then(start).catch(start); } else { start(); }
    });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('peek-on');
      img.style.opacity = '0';
    });
  });
  // 高速スクロールでmouseleaveが発火せず残るのを防ぐ
  window.addEventListener('scroll', () => {
    peekCards.forEach((card) => {
      if (!card.classList.contains('peek-on')) return;
      card.classList.remove('peek-on');
      const img = card.querySelector('.service-peek-img');
      if (img) img.style.opacity = '0';
    });
  }, { passive: true });
  const touchDevice = window.matchMedia('(hover: none)').matches;
  // 先読み（ホバーのあるPCのみ。スマホは表示分しか使わないため通信の無駄を省く）
  if (!touchDevice) {
    window.addEventListener('load', () => {
      peekImgs.forEach((src) => { const im = new Image(); im.src = src; });
    });
  }
  // タッチ端末は最初から表示（固定指定があればその画像、なければランダム）
  if (touchDevice) {
    peekCards.forEach((card) => {
      const img = card.querySelector('.service-peek-img');
      if (!img) return;
      const fixedSrc = img.closest('.service-peek').dataset.peekFixed || null;
      img.src = fixedSrc || peekImgs[Math.floor(Math.random() * peekImgs.length)];
      img.style.transform = 'translate(0,0)';
      img.style.opacity = '1';
      card.classList.add('peek-static');
    });
  }
})();
