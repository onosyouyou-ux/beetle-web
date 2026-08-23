/** 注意: sticky を効かせるため、高さの無い <header> 等で包まない（包むと可動域ゼロでstickyが死ぬ） */
export default function AppHeader() {
  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <a className="site-nav-logo" href="https://www.beetle-web.jp" target="_blank" rel="noopener">BEET<span>LE</span></a>
        {/* グローバルメニュー（本体LPと同型のテキストリンク。2026-07-15にボタン→テキスト化。
            リファレンスはヘッダーから外し、ヒーロー内のタイトル・注釈の下に移設） */}
        <div className="site-nav-links">
          <a href="https://www.beetle-web.jp/" target="_blank" rel="noopener">トップ</a>
          <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">QA支援</a>
          <a href="https://www.beetle-web.jp/edu-tools.html" target="_blank" rel="noopener">教育支援</a>
          <a href="https://www.beetle-web.jp/blog/" target="_blank" rel="noopener">コラム</a>
        </div>
      </div>
    </nav>
  );
}
