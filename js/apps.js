// apps.html のページ内タブ。
// やることは2つだけ：
//   1) 固定ヘッダー（共通パーシャル＝fetchで後から入る）の実測高さに合わせて、
//      タブの sticky 位置とアンカーの着地位置を決める
//   2) スクロール位置から「いまどのセクションか」を出して、タブに .is-on を付ける
(function () {
  const bar = document.querySelector('.apps-tabs');
  if (!bar) return;

  const tabs = Array.from(bar.querySelectorAll('.apps-tab'));
  const sections = tabs.map((t) => document.querySelector(t.getAttribute('href')));
  const inner = bar.querySelector('.apps-tabs-inner');
  const root = document.documentElement;
  let anchorOffset = 150;
  let current = -1;

  // ヘッダーの高さは注入前後・画面幅で変わるので、その都度測り直す。
  // なお共通ヘッダー（.nav）は position:sticky を持つが、実際には画面上に残らない。
  // 包んでいる #site-header が body(flex column) の子で高さがナビと同じため、
  // sticky が動ける余地がゼロになっているのが原因（本体側の既存の挙動）。
  // ここでは「ナビが本当に画面に残るときだけ」その高さぶん下げる。
  // ＝ 包み箱がナビより高ければ効いている、と見て自動で追従させる
  const syncOffsets = () => {
    const nav = document.querySelector('.nav');
    const slot = document.getElementById('site-header');
    const navH = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
    const slotH = slot ? Math.round(slot.getBoundingClientRect().height) : 0;
    const navSticks = nav ? getComputedStyle(nav).position === 'sticky' && slotH > navH : false;
    const navOffset = navSticks ? navH : 0;
    const barH = Math.round(bar.getBoundingClientRect().height);
    anchorOffset = navOffset + barH + 10;
    root.style.setProperty('--apps-tabs-top', navOffset + 'px');
    root.style.setProperty('--apps-anchor-offset', anchorOffset + 'px');
  };

  const setActive = (i) => {
    if (i === current) return;
    current = i;
    tabs.forEach((t, n) => {
      t.classList.toggle('is-on', n === i);
      if (n === i) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
    // 横スクロールするSPでは、点いたタブが見えるところまで寄せる
    if (inner.scrollWidth > inner.clientWidth + 1 && tabs[i]) {
      const t = tabs[i];
      const left = t.offsetLeft - (inner.clientWidth - t.offsetWidth) / 2;
      inner.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  };

  const update = () => {
    // タブのすぐ下を判定ラインにする（そこを過ぎたセクションのうち最後のもの＝いまの場所）
    const line = anchorOffset + 4;
    let active = 0;
    sections.forEach((sec, i) => {
      if (sec && sec.getBoundingClientRect().top <= line) active = i;
    });
    // 最下部まで来たら最後のタブを点ける（短いセクションが点かないのを防ぐ）
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      active = tabs.length - 1;
    }
    setActive(active);
  };

  const refresh = () => { syncOffsets(); update(); };

  refresh();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh);
  // ヘッダーは fetch 後に差し込まれるので、入った時点でもう一度測る
  const headerSlot = document.getElementById('site-header');
  if (headerSlot && window.MutationObserver) {
    const mo = new MutationObserver(refresh);
    mo.observe(headerSlot, { childList: true, subtree: true });
  }
})();
