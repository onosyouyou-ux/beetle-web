'use client';

import { useEffect, useState } from 'react';

interface CounterData {
  used: number;
  limit: number;
}

/** 全幅の共通ライトナビ（紙面の外） */
export default function AppHeader() {
  return (
    <header>
      <nav className="site-nav">
        <div className="site-nav-inner">
          <a className="site-nav-logo" href="https://www.beetle-web.jp" target="_blank" rel="noopener">BEET<span>LE</span></a>
          <div className="site-nav-links">
            <a href="https://www.beetle-web.jp/" target="_blank" rel="noopener">ホーム</a>
            <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">ツール</a>
            <a href="https://www.beetle-web.jp/blog/" target="_blank" rel="noopener">コラム</a>
            <a href="https://www.beetle-web.jp/#contact" target="_blank" rel="noopener">お問い合わせ</a>
            <a className="site-nav-howto" href="https://www.beetle-web.jp/tools/bug-checker/landing.html" target="_blank" rel="noopener">リファレンス</a>
          </div>
        </div>
      </nav>
    </header>
  );
}

/** ページヘッダー（紙面の中）。たたむとタイトル1行になる */
export function PageHero({ counter }: { counter: CounterData | null }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem('bc_hero_collapsed') === '1') setCollapsed(true); } catch {}
  }, []);

  function toggle() {
    setCollapsed(c => {
      try { localStorage.setItem('bc_hero_collapsed', c ? '0' : '1'); } catch {}
      return !c;
    });
  }

  return (
    <div className="page-header">
      <button type="button" className="ph-toggle" onClick={toggle} aria-expanded={!collapsed}>
        {collapsed ? '▼ ひらく' : '▲ たたむ'}
      </button>

      {collapsed ? (
        <div className="ph-collapsed">
          <span className="page-header-en" style={{ marginBottom: 0 }}>BUG DETECTOR</span>
          <span className="ph-collapsed-title">これってバグなの？</span>
        </div>
      ) : (
        <div className="page-header-wrap ph-with-visual">
          <div className="ph-main">
            <div className="page-header-en">BUG DETECTOR</div>
            <div className="page-header-inner">
              <div className="page-header-title">これってバグなの？</div>
              <p className="page-header-desc">
                画像を貼るだけでAIがバグか否かを判定。<br />バグなら起票内容を自動生成します。<br />タイトル・再現手順・期待値まで全部出てきます。
              </p>
              {/* 使用回数は無料枠の8割（8,000回）を超えたら表示（残量アラートとして） */}
              {counter && counter.used >= counter.limit * 0.8 && (
                <div className="mt-2 inline-flex flex-col gap-0.5 bg-white border border-[#e8e4de] rounded-lg px-3 py-1.5" style={{ borderWidth: '0.5px' }}>
                  <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    今月みんなで {counter.used.toLocaleString()} 回使いました（無料枠 {counter.limit.toLocaleString()} 回まで）
                  </div>
                  <div className="w-[200px] h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (counter.used / counter.limit) * 100)}%`, background: 'var(--color-accent)' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* LPメインビジュアル */}
          <img className="ph-visual" src="/hero-lp.jpg" alt="" aria-hidden="true" width="1600" height="900" />
        </div>
      )}
    </div>
  );
}
