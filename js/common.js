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
      const footerVisible = footer && footer.getBoundingClientRect().top < window.innerHeight;
      btn.classList.toggle('visible', window.scrollY > 200 && !footerVisible);
    }, { passive: true });
  });
});
