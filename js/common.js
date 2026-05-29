async function loadPartial(id, url) {
  const el = document.getElementById(id);
  if (!el) return;
  const res = await fetch(url);
  el.innerHTML = await res.text();
}

document.addEventListener('DOMContentLoaded', () => {
  loadPartial('site-header', '/partials/header.html');
  loadPartial('site-footer', '/partials/footer.html');
});
