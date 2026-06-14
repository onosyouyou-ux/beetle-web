'use client';

import { forwardRef } from 'react';

export interface FixedFieldValues {
  events: string;
  items: string;
  caution: string;
}

interface Props {
  values: FixedFieldValues;
  onChange: (patch: Partial<FixedFieldValues>) => void;
}

const taClass =
  'w-full resize-y border border-[#dddddd] rounded-lg px-3 py-2.5 text-[14px] leading-relaxed text-[#1c1c2e] focus:outline-none focus:border-[#C0634C]';

// 余白提案の「追加する」から行事欄にフォーカスできるよう ref を渡す
const FixedFields = forwardRef<HTMLTextAreaElement, Props>(function FixedFields({ values, onChange }, ref) {
  return (
    <div className="space-y-3">
      <div className="field-label">固定欄</div>

      <div className="border border-[#e8e4de] rounded-xl bg-white p-3.5">
        <div className="text-[13px] font-bold text-[#1c1c2e] mb-2">📅 今月の行事・イベント</div>
        <textarea
          ref={ref}
          value={values.events}
          onChange={(e) => onChange({ events: e.target.value })}
          rows={2}
          placeholder={'5日 遠足（弁当持参）\n20日 授業参観 13:30〜'}
          className={taClass}
        />
      </div>

      <div className="border border-[#e8e4de] rounded-xl bg-white p-3.5">
        <div className="text-[13px] font-bold text-[#1c1c2e] mb-2">🎒 忘れ物・持ち物連絡</div>
        <textarea
          value={values.items}
          onChange={(e) => onChange({ items: e.target.value })}
          rows={2}
          placeholder={'体操服の記名をお願いします\n水筒を毎日持たせてください'}
          className={taClass}
        />
      </div>

      <div className="border border-[#f7c1c1] rounded-xl bg-[#fcebeb] p-3.5">
        <div className="text-[13px] font-bold text-[#a32d2d] mb-2">⚠ 注意事項</div>
        <textarea
          value={values.caution}
          onChange={(e) => onChange({ caution: e.target.value })}
          rows={2}
          placeholder={'最近忘れ物が多いです\n廊下を走らないようにしてください'}
          className="w-full resize-y border border-[#f7c1c1] rounded-lg px-3 py-2.5 text-[14px] leading-relaxed text-[#1c1c2e] bg-white focus:outline-none focus:border-[#a32d2d]"
        />
      </div>
    </div>
  );
});

export default FixedFields;
