export default function AppHeader() {
  return (
    <header>
      <nav className="bc-nav">
        <a href="https://www.beetle-web.jp" target="_blank" rel="noopener">
          <img
            src="https://www.beetle-web.jp/assets/icons/beetle-icon.svg"
            alt="BEETLE"
            style={{ height: '22px', borderRadius: '4px' }}
          />
        </a>
        <span className="sep">›</span>
        <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">ツール一覧</a>
        <span className="sep">›</span>
        <span className="bc-current">学級通信メーカー</span>
        <span className="bc-spacer" />
        <a
          className="bc-ref-btn"
          href="https://www.beetle-web.jp/tools/gakkyu-tsushin/landing.html"
          target="_blank"
          rel="noopener"
        >
          使い方
        </a>
      </nav>

      <div className="page-header">
        <div className="page-header-wrap">
          <div className="page-header-en">NEWSLETTER MAKER</div>
          <div className="page-header-inner">
            <div className="page-header-title">学級通信メーカー</div>
            <p className="page-header-desc">
              記事の素材を入力するだけ。AIが文章を整え、学級通信の紙面に流し込みます。<br />
              写真ではなくイラストを使うので、子どもの顔出し（個人情報・肖像権）の心配がありません。
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
