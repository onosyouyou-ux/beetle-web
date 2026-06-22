'use client';

interface Props {
  onStart: () => void;
}

export default function BottomCta({ onStart }: Props) {
  return (
    <section className="bg-gradient-to-b from-[#fffaf2] to-[#fdf0e0] border-t border-[#f0e4cf]">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-12 sm:py-16 flex items-center justify-center gap-6">
        {/* 左の先生（あとで挿絵に差し替え可：/illust/lp/cta-1.png） */}
        <div aria-hidden className="hidden md:block text-[64px] select-none">👩‍🏫</div>

        <div className="text-center">
          <h2 className="text-[22px] sm:text-[28px] font-extrabold text-[#1c1c2e]">まずは1枚、作ってみませんか？</h2>
          <div className="mt-6">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-full bg-[#C0634C] text-white text-[16px] sm:text-[18px] font-bold px-12 py-4 shadow-[0_10px_28px_rgba(192,99,76,0.32)] hover:bg-[#a9543f] hover:-translate-y-0.5 transition-all"
            >
              無料で始める <span className="text-[18px]">›</span>
            </button>
            <p className="mt-3 text-[12px] text-[#9a938a]">登録不要・インストール不要・無料</p>
          </div>
        </div>

        {/* 右の先生（あとで挿絵に差し替え可：/illust/lp/cta-2.png） */}
        <div aria-hidden className="hidden md:block text-[64px] select-none">👨‍🏫</div>
      </div>
    </section>
  );
}
