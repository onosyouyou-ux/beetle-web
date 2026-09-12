// apps.html のタブ。押した面だけを出す（ページ内リンクのジャンプではなく画面の切り替え）。
//
// 方針:
// - HTMLには全4面を書いたままにする。隠すのはJSの仕事。
//   JSが動かない環境（クローラ含む）では全部が縦に並ぶだけで、内容は失われない
// - URLのハッシュと同期する。/apps.html#qa-apps を直接開けばその面が出る
// - タブはリンクのままにしてあるので、新しいタブで開く・リンクをコピーする も普通にできる
(function () {
  const bar = document.querySelector('.apps-tabs');
  if (!bar) return;

  const tabs = Array.from(bar.querySelectorAll('.apps-tab'));
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  if (panels.some((p) => !p)) return;

  const inner = bar.querySelector('.apps-tabs-inner');
  const root = document.documentElement;
  let current = -1;

  // 共通ヘッダー（.nav）は position:sticky を持つが、包んでいる #site-header が
  // body(flex column) の子で高さがナビと同じため、実際には画面に残らない。
  // 「本当に残るときだけ」その高さぶん下げる（ヘッダー側が直れば自動で追従する）
  const syncOffsets = () => {
    const nav = document.querySelector('.nav');
    const slot = document.getElementById('site-header');
    const navH = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
    const slotH = slot ? Math.round(slot.getBoundingClientRect().height) : 0;
    const sticks = nav ? getComputedStyle(nav).position === 'sticky' && slotH > navH : false;
    root.style.setProperty('--apps-tabs-top', (sticks ? navH : 0) + 'px');
  };

  const show = (i, opts) => {
    if (i < 0 || i >= tabs.length) return;
    const changed = i !== current;
    current = i;
    tabs.forEach((t, n) => {
      const on = n === i;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      // 選ばれていないタブはTabキーの順番から外す（ARIAのタブの作法。←→で移動する）
      t.tabIndex = on ? 0 : -1;
      panels[n].hidden = !on;
    });
    // 横スクロールするSPでは、点いたタブが見えるところまで寄せる
    if (changed && inner.scrollWidth > inner.clientWidth + 1) {
      const t = tabs[i];
      inner.scrollTo({ left: Math.max(0, t.offsetLeft - (inner.clientWidth - t.offsetWidth) / 2), behavior: 'smooth' });
    }
    // 下の方を見ている最中に切り替えたら、タブが見える位置まで戻す
    // （切り替え先が短いと、いきなり余白だけの画面になってしまうため）
    if (changed && opts && opts.scroll && bar.getBoundingClientRect().top < 0) {
      const y = bar.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: 'auto' });
    }
  };

  const indexOfHash = (hash) => tabs.findIndex((t) => t.getAttribute('href') === hash);

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', (e) => {
      // 別タブで開く・リンクを保存する といった操作は邪魔しない
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      show(i, { scroll: true });
      history.replaceState(null, '', tab.getAttribute('href'));
    });
    // ←→で隣のタブへ（ARIAのタブの作法）
    tab.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const n = (i + step + tabs.length) % tabs.length;
      show(n, { scroll: true });
      history.replaceState(null, '', tabs[n].getAttribute('href'));
      tabs[n].focus();
    });
  });

  window.addEventListener('hashchange', () => {
    const i = indexOfHash(location.hash);
    if (i >= 0) show(i, { scroll: true });
  });
  window.addEventListener('resize', syncOffsets);
  window.addEventListener('load', syncOffsets);
  // ヘッダーは fetch 後に差し込まれるので、入った時点でもう一度測る
  const slot = document.getElementById('site-header');
  if (slot && window.MutationObserver) new MutationObserver(syncOffsets).observe(slot, { childList: true, subtree: true });

  syncOffsets();
  const start = indexOfHash(location.hash);
  show(start >= 0 ? start : 0, { scroll: false });
})();
