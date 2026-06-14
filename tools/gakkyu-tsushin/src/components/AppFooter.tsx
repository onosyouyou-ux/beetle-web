export default function AppFooter() {
  return (
    <footer className="site-footer-app">
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
      <div className="sfa-right">
        <a href="https://www.beetle-web.jp/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>
        <span>© BEETLE</span>
      </div>
    </footer>
  );
}
