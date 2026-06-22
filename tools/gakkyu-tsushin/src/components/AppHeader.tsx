export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#eee6d8]">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 h-[58px] flex items-center gap-4">
        {/* ロゴ */}
        <a href="https://www.beetle-web.jp" target="_blank" rel="noopener" className="flex items-center gap-2 no-underline shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.beetle-web.jp/assets/icons/beetle-icon.svg" alt="BEETLE" style={{ height: '24px', borderRadius: '5px' }} />
          <span className="font-extrabold tracking-wide text-[#1c1c2e] text-[18px]">BEETLE</span>
        </a>

        <div className="flex-1" />

        {/* ナビ */}
        <nav className="hidden sm:flex items-center gap-6 text-[13px] text-[#5a544c]">
          <a href="#features" className="no-underline hover:text-[#C0634C] transition-colors">できること</a>
          <a href="#steps" className="no-underline hover:text-[#C0634C] transition-colors">使い方</a>
          <a href="https://www.beetle-web.jp/#contact" target="_blank" rel="noopener" className="no-underline hover:text-[#C0634C] transition-colors">お問い合わせ</a>
        </nav>

        {/* CTA */}
        <a
          href="#creator"
          className="shrink-0 inline-flex items-center rounded-full border-2 border-[#C0634C] text-[#C0634C] text-[13px] font-bold px-4 sm:px-5 py-1.5 no-underline hover:bg-[#C0634C] hover:text-white transition-colors"
        >
          無料で試す
        </a>
      </div>
    </header>
  );
}
