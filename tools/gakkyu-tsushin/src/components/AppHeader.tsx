/** 注意: sticky を効かせるため、高さの無い <header> 等で包まない（包むと可動域ゼロでstickyが死ぬ） */
export default function AppHeader() {
  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <a className="site-nav-logo" href="https://www.beetle-web.jp" target="_blank" rel="noopener">BEET<span>LE</span></a>
        {/* ボタンは全画面「トップ・QA支援・教育支援」で統一（2026-07-14決定）＋リファレンス */}
        <div className="site-nav-links">
          <a className="site-nav-btn site-nav-top" href="https://www.beetle-web.jp/" target="_blank" rel="noopener">トップ</a>
          <a className="site-nav-btn" href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">QA<span className="nav-cta-full">支援</span></a>
          <a className="site-nav-btn site-nav-edu" href="https://www.beetle-web.jp/edu-tools.html" target="_blank" rel="noopener">教育<span className="nav-cta-full">支援</span></a>
          <a className="site-nav-howto" href="https://www.beetle-web.jp/tools/gakkyu-tsushin/" target="_blank" rel="noopener">リファレンス</a>
        </div>
      </div>
    </nav>
  );
}
