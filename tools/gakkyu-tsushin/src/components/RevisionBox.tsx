'use client';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRegenerate: () => void;
  disabled: boolean;
  loading: boolean;
  lockedCount?: number;
}

export default function RevisionBox({ value, onChange, onRegenerate, disabled, loading, lockedCount = 0 }: Props) {
  return (
    <div className="mt-3">
      <div className="field-label">修正指示</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        disabled={disabled}
        placeholder="例：「係活動」の記事をもう少し温かい表現に。給食の話題の日付を6日に直して。"
        className="textarea-base"
      />
      {!disabled && lockedCount > 0 && (
        <p className="mt-1 text-[11px] leading-relaxed text-[#a35b2d]">
          🔒 ロック中の記事（{lockedCount}件）には修正指示が反映されません。直したい記事はロックを外してから再生成してください。
        </p>
      )}
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
