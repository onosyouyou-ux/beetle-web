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
  const peekImgs = Array.from({ length: 19 }, (_, i) =>
    `/assets/images/peek/peek-${String(i + 1).padStart(2, '0')}.jpg`);
  const peekDirs = ['translate(0,-110%)', 'translate(0,110%)', 'translate(-110%,0)', 'translate(110%,0)'];
  document.querySelectorAll('.service-card').forEach((card) => {
    const img = card.querySelector('.service-peek-img');
    if (!img) return;
    card.addEventListener('mouseenter', () => {
      img.src = peekImgs[Math.floor(Math.random() * peekImgs.length)];
      img.style.transition = 'none';
      img.style.transform = peekDirs[Math.floor(Math.random() * peekDirs.length)];
      img.style.opacity = '0';
      void img.offsetWidth;
      img.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1), opacity .15s ease';
      img.style.transform = 'translate(0,0)';
      img.style.opacity = '1';
    });
    card.addEventListener('mouseleave', () => {
      img.style.opacity = '0';
    });
  });

  // ホバー前にキャラ画像を先読み（ページ読み込み完了後）
  window.addEventListener('load', () => {
    peekImgs.forEach((src) => { const im = new Image(); im.src = src; });
  });
