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

    </header>
  );
}
