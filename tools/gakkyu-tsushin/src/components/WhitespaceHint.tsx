'use client';

interface Props {
  onAdd: () => void;
}

export default function WhitespaceHint({ onAdd }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border border-[#fac775] bg-[#faeeda] rounded-xl px-3.5 py-3">
      <div className="flex items-start gap-2 text-[13px] text-[#854f0b] leading-relaxed">
        <span aria-hidden>💡</span>
        <span>記事が少なめです。固定欄を入れると余白がちょうどよくなります。</span>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 text-[12px] font-bold text-[#854f0b] border border-[#fac775] rounded-lg bg-white px-3 py-1.5 hover:bg-[#fff8ee] transition-colors"
      >
        追加する
      </button>
    </div>
  );
}
