'use client';

interface CounterData {
  used: number;
  limit: number;
}

export default function AppHeader({ counter }: { counter: CounterData | null }) {
  return (
    <header>
      <nav className="bc-nav">
        <div className="bc-nav-inner">
          <a href="https://www.beetle-web.jp" target="_blank" rel="noopener">BEETLE</a>
          <span className="sep">›</span>
          <a href="https://www.beetle-web.jp/#tools" target="_blank" rel="noopener">ツール一覧</a>
          <span className="sep">›</span>
          <span>これってバグなの？</span>
        </div>
      </nav>

      <div className="page-header">
        <div className="page-header-wrap">
          <div className="page-header-en">BUG DETECTOR</div>
          <div className="page-header-inner">
            <div className="page-header-title">これってバグなの？</div>
            <p className="page-header-desc">
              画像を貼るだけでAIがバグか否かを判定。バグなら起票内容を自動生成します。<br />
              タイトル・再現手順・期待値まで全部出てきます。
            </p>
            {counter && (
              <div className="mt-3 inline-flex flex-col gap-1 bg-white border border-[#e8e4de] rounded-lg px-3 py-2" style={{ borderWidth: '0.5px' }}>
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
      </div>
    </header>
  );
}
