  const links = document.querySelectorAll('.toc-link');
  const cards = document.querySelectorAll('.card[id]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = document.querySelector('.toc-link[href="#' + entry.target.id + '"]');
        if (active) {
          active.classList.add('active');
          active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    });
  }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });

  cards.forEach(c => observer.observe(c));
