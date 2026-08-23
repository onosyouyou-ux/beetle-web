/** 全アプリ共通のテキストロゴ版フッター（2026-07-15統一）。
 *  1段目「BEETLEロゴ＋ナビリンク」、2段目「プライバシーポリシー・会社名」。PC・スマホとも中央揃え */
export default function AppFooter() {
  return (
    <footer className="site-footer-app">
      <div className="sfa-row">
        <a href="https://www.beetle-web.jp" target="_blank" rel="noopener" className="sfa-logo">
          BEET<span>LE</span>
        </a>
        <nav className="sfa-nav">
          <a href="https://www.beetle-web.jp/" target="_blank" rel="noopener">トップ</a>
          <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">QA支援</a>
          <a href="https://www.beetle-web.jp/edu-tools.html" target="_blank" rel="noopener">教育支援</a>
          <a href="https://www.beetle-web.jp/blog/" target="_blank" rel="noopener">コラム</a>
          <a href="https://www.beetle-web.jp/#contact" target="_blank" rel="noopener">お問い合わせ</a>
        </nav>
      </div>
      <div className="sfa-copy">
        <a href="https://www.beetle-web.jp/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>
        <span>© 2026 BEETLE Co., LLC</span>
      </div>
    </footer>
  );
}
