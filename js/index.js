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
