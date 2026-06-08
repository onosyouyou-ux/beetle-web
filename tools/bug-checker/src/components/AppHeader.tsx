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
            <div className="page-header-metrics">
              <div className="phm-item">
                <div className="phm-num">{counter ? counter.used.toLocaleString() : '…'}</div>
                <div className="phm-label">今月の利用回数</div>
              </div>
              <div className="phm-item">
                <div className="phm-num">0</div>
                <div className="phm-label">サーバー保存</div>
              </div>
              <div className="phm-item">
                <div className="phm-num">∞</div>
                <div className="phm-label">生成回数</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
