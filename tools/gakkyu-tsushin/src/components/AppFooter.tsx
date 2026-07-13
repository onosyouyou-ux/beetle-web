/** その他ツール（学校・子ども向け）用フッター：バナーなしのテキストロゴ版。
 *  1段目「BEETLEロゴ＋ナビリンク」、2段目「プライバシーポリシー・会社名」。PC・スマホとも中央揃え */
export default function AppFooter() {
  return (
    <footer className="site-footer-app">
      <div className="sfa-row">
        <a href="https://www.beetle-web.jp" target="_blank" rel="noopener" className="sfa-logo">
          BEET<span>LE</span>
        </a>
        <nav className="sfa-nav">
          <a href="https://www.beetle-web.jp" target="_blank" rel="noopener">ホーム</a>
          <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">ツール</a>
          <a href="https://www.beetle-web.jp/blog/" target="_blank" rel="noopener">コラム</a>
          <a href="https://www.beetle-web.jp/#contact" target="_blank" rel="noopener">お問い合わせ</a>
        </nav>
      </div>
      <div className="sfa-copy">
        <a href="https://www.beetle-web.jp/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>
        <span>© 2026 BEETLE Co., LLC</span>
        <span className="sfa-version">
          {process.env.NEXT_PUBLIC_BUILD_DATE} · {process.env.NEXT_PUBLIC_COMMIT_SHA}
        </span>
      </div>
    </footer>
  );
}
