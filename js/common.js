async function loadPartial(id, url) {
  const el = document.getElementById(id);
  if (!el) return;
  const res = await fetch(url);
  el.innerHTML = await res.text();
}

document.addEventListener('DOMContentLoaded', () => {
  loadPartial('site-header', '/partials/header.html').then(() => {
    const path = location.pathname;

    // グローバルメニュー（トップ・QA支援・教育支援・コラム）は全画面共通のテキストリンク
    // （2026-07-15にボタン→テキスト化）。現在ページのリンクに aria-current を付与して色替え
    const currentHref =
      path === '/' || path === '/index.html' ? '/'
      : path.startsWith('/blog/') ? '/blog/'
      : path === '/test-tools.html' ? '/test-tools.html'
      : path === '/edu-tools.html' ? '/edu-tools.html'
      : null;
    if (currentHref) {
      const link = document.querySelector(`.nav-links a[href="${currentHref}"]`);
      if (link) link.setAttribute('aria-current', 'page');
    }

    // 本体配信の静的アプリ（えいごよんで等）はリファレンスボタン（オレンジ→ランディング）を追加注入
    const staticApps = {
      '/tools/eigo/': { ref: '/tools/eigo/landing.html' },
      '/tools/eigo/index.html': { ref: '/tools/eigo/landing.html' },
    };
    const appConf = staticApps[path];
    if (appConf) {
      const links = document.querySelector('.nav-links');
      if (links) {
        const ref = document.createElement('a');
        ref.href = appConf.ref;
        ref.className = 'nav-cta nav-cta-ref';
        ref.textContent = 'リファレンス';
        links.appendChild(ref);
      }
    }

    // 2段目：ページ内セクションリンク（定義があるページだけ表示）
    const sectionLinks = {
      '/test-tools.html': [
        ['#cando', 'できること'],
        ['#reference', 'リファレンス'],
        ['#tools', '検証ツール'],
        ['#column', '検証コラム'],
        ['#services', 'QAサービス'],
        ['#contact', 'お問い合わせ'],
      ],
      '/edu-tools.html': [
        ['#cando', 'できること'],
        ['#family', 'おうちで使える'],
        ['#teacher', '先生向け'],
        ['#contact', 'お問い合わせ'],
      ],
    }[path];
    const secNav = document.querySelector('.nav-sections');
    if (secNav && sectionLinks) {
      secNav.innerHTML = sectionLinks
        .map(([hash, label]) => `<a href="${hash}">${label}</a>`)
        .join('');
    }
  });
  loadPartial('site-footer', '/partials/footer.html').then(() => {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      // バナー画像を含むフッター全体（#site-footer）の上で止める
      const footer = document.getElementById('site-footer');
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
  peekImgEls.forEach((img) => {
    const card = img.closest('a') || img.closest('.service-peek').parentElement;
    if (!card) return;
    peekCards.push(card);
    // data-peek-fixed 指定があればランダムにせず固定画像を使う（ブログ一覧＝著者アバター）
    const fixedSrc = img.closest('.service-peek').dataset.peekFixed || null;
    let hoverId = 0;
    card.addEventListener('mouseenter', () => {
      const id = ++hoverId;
      resetPeeks(card);
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
  // スクロール・タブ切替・ウィンドウ離脱でも表示を解除（mouseleave取りこぼし対策）
  window.addEventListener('scroll', () => resetPeeks(null), { passive: true });
  window.addEventListener('blur', () => resetPeeks(null));
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetPeeks(null); });
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
