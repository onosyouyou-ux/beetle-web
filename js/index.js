  // header menu
  const headerMenuBtn = document.querySelector('.header-menu-btn');
  const headerMenuDropdown = document.querySelector('.header-menu-dropdown');
  const headerMenu = document.querySelector('.header-menu');
  headerMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = headerMenuDropdown.classList.toggle('open');
    headerMenu.classList.toggle('open', isOpen);
    headerMenuBtn.setAttribute('aria-expanded', isOpen);
  });
  document.addEventListener('click', () => {
    headerMenuDropdown.classList.remove('open');
    headerMenu.classList.remove('open');
    headerMenuBtn.setAttribute('aria-expanded', 'false');
  });

  // back to top
  const backToTop = document.querySelector('.back-to-top');
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 300);
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // service card peek（ホバーでキャラがランダムな方向から顔を出す）
  const peekImgs = Array.from({ length: 22 }, (_, i) =>
    `/assets/images/peek/peek-${String(i + 1).padStart(2, '0')}.jpg`);
  const peekDirs = ['translate(0,-110%)', 'translate(0,110%)', 'translate(-110%,0)', 'translate(110%,0)'];
  const peekCards = document.querySelectorAll('.service-card, .tool-card, .column-card');
  // 表示中のキャラを全部引っ込める（exceptだけ残す）。
  // タブ切替や放置でmouseleaveを取りこぼしても複数表示にならないための保険
  const resetPeeks = (except) => {
    peekCards.forEach((card) => {
      if (card === except || card.classList.contains('peek-static')) return;
      card.classList.remove('peek-on');
      const im = card.querySelector('.service-peek-img');
      if (im) im.style.opacity = '0';
    });
  };
  peekCards.forEach((card) => {
    const img = card.querySelector('.service-peek-img');
    if (!img) return;
    let hoverId = 0;
    card.addEventListener('mouseenter', () => {
      const id = ++hoverId;
      resetPeeks(card);
      card.classList.add('peek-on');
      // まず隠してから画像を差し替え、デコード完了を待って動かす
      // （読み込みが間に合わず前回の顔のまま飛び出すのを防ぐ）
      img.style.transition = 'none';
      img.style.transform = peekDirs[Math.floor(Math.random() * peekDirs.length)];
      img.style.opacity = '0';
      img.src = peekImgs[Math.floor(Math.random() * peekImgs.length)];
      const start = () => {
        if (id !== hoverId) return; // 次のホバーが始まっていたら何もしない
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

  // スクロール・タブ切替・ウィンドウ離脱でも表示を解除（mouseleave取りこぼし対策）
  window.addEventListener('scroll', () => resetPeeks(null), { passive: true });
  window.addEventListener('blur', () => resetPeeks(null));
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetPeeks(null); });

  // ホバー前にキャラ画像を先読み（ホバーのあるPCのみ。スマホは表示分しか使わない）
  if (!window.matchMedia('(hover: none)').matches) {
    window.addEventListener('load', () => {
      peekImgs.forEach((src) => { const im = new Image(); im.src = src; });
    });
  }

  // タッチ端末はホバーがないため、最初からランダムのキャラを表示
  if (window.matchMedia('(hover: none)').matches) {
    document.querySelectorAll('.service-card, .tool-card, .column-card').forEach((card) => {
      const img = card.querySelector('.service-peek-img');
      if (!img) return;
      img.src = peekImgs[Math.floor(Math.random() * peekImgs.length)];
      img.style.transform = 'translate(0,0)';
      img.style.opacity = '1';
      card.classList.add('peek-static');
    });
  }
