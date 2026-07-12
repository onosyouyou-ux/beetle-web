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
            <a className="site-nav-howto" href="https://www.beetle-web.jp/tools/gakkyu-tsushin/" target="_blank" rel="noopener">リファレンス</a>
          </div>
        </div>
      </nav>

    </header>
  );
}
