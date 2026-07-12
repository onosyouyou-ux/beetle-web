export default function AppFooter() {
  return (
    <footer className="site-footer-app-wrap">
      {/* スマホ専用：浮世絵ヒーローズバナー（BEETLEロゴは画像に焼き込み済み） */}
      <div className="footer-heroes-sp">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/footer-heroes.jpg" alt="" aria-hidden="true" width={2172} height={264} loading="lazy" />
      </div>
      <div className="site-footer-app">
      <div className="sfa-left">
        <a href="https://www.beetle-web.jp" target="_blank" rel="noopener" className="sfa-logo">
          BEET<span>LE</span>
        </a>
        <nav className="sfa-nav">
          <a href="https://www.beetle-web.jp" target="_blank" rel="noopener">ホーム</a>
          <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">ツール</a>
          <a href="https://www.beetle-web.jp/#column" target="_blank" rel="noopener">コラム</a>
          <a href="https://www.beetle-web.jp/#contact" target="_blank" rel="noopener">お問い合わせ</a>
        </nav>
      </div>
      {/* スマホ専用：中央揃えナビ */}
      <nav className="sfa-nav-sp">
        <a href="https://www.beetle-web.jp" target="_blank" rel="noopener">ホーム</a>
        <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">ツール</a>
        <a href="https://www.beetle-web.jp/#column" target="_blank" rel="noopener">コラム</a>
        <a href="https://www.beetle-web.jp/#contact" target="_blank" rel="noopener">お問い合わせ</a>
      </nav>
      <div className="sfa-right">
        <a href="https://www.beetle-web.jp/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>
        <span>© BEETLE</span>
        <span className="sfa-version">
          {process.env.NEXT_PUBLIC_BUILD_DATE} · {process.env.NEXT_PUBLIC_COMMIT_SHA}
        </span>
      </div>
      </div>
    </footer>
  );
}
