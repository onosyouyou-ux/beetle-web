'use client';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRegenerate: () => void;
  disabled: boolean;
  loading: boolean;
}

export default function RevisionBox({ value, onChange, onRegenerate, disabled, loading }: Props) {
  return (
    <div className="mt-3">
      <div className="field-label">修正指示</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        disabled={disabled}
        placeholder="例：「運動会練習」の記事をもう少し温かい表現に。遠足の日付を6日に直して。"
        className="w-full resize-y border border-[#dddddd] rounded-lg px-3 py-2.5 text-[13px] leading-relaxed text-[#1c1c2e] focus:outline-none focus:border-[#C0634C] disabled:bg-[#f4f3f0] disabled:text-[#aaa]"
      />
      <button
        type="button"
        onClick={onRegenerate}
        disabled={disabled || loading}
        className="mt-2 w-full flex items-center justify-center gap-2 border border-[#dddddd] rounded-lg bg-white text-[14px] font-bold text-[#1c1c2e] py-2.5 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[#dddddd] disabled:hover:text-[#1c1c2e]"
      >
        {loading ? <span className="spin inline-block">↻</span> : '↻'}
        この内容で再生成する
      </button>
    </div>
  );
}
