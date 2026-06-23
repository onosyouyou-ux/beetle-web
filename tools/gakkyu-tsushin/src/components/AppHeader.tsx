export default function AppHeader() {
  return (
    <header>
      <nav className="bc-nav">
        <a href="https://www.beetle-web.jp" target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#C0634C] !text-white text-[12px] font-bold px-4 py-1.5 hover:bg-[#a9543f] transition-colors no-underline"
          href="https://www.beetle-web.jp/tools/gakkyu-tsushin/"
          target="_blank"
          rel="noopener"
        >
          📖 使い方
        </a>
      </nav>

      <div className="page-header">
        <div className="page-header-wrap">
          <div className="page-header-en">NEWSLETTER MAKER</div>
          <div className="page-header-inner">
            <div className="page-header-title">学級通信メーカー</div>
            <p className="page-header-desc">
              今月の出来事をメモするだけ。AIが見出しと文章を整えて、学級通信の紙面に流し込みます。<br />
              写真なしでもイラスト付きで作れるので、子どもの顔出し（個人情報・肖像権）が気になるクラスだよりにも。写真も使えます。
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
