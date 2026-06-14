'use client';

import { ILLUSTRATIONS } from '@/lib/templates';

export interface ArticleItem {
  id: string;
  text: string;
  illustration: string;
}

interface Props {
  index: number;
  item: ArticleItem;
  canDelete: boolean;
  onChange: (patch: Partial<Omit<ArticleItem, 'id'>>) => void;
  onDelete: () => void;
}

export default function ArticleBox({ index, item, canDelete, onChange, onDelete }: Props) {
  return (
    <div className="border border-[#e8e4de] rounded-xl bg-white p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="field-label mb-0">記事{index + 1}</span>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[12px] text-[#999999] hover:text-[#a32d2d] transition-colors"
          >
            削除
          </button>
        )}
      </div>

      <textarea
        value={item.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={4}
        placeholder="運動会の練習が始まりました。みんな頑張っています。リレーが盛り上がっています。&#10;（箇条書きでOK）"
        className="w-full resize-y border border-[#dddddd] rounded-lg px-3 py-2.5 text-[14px] leading-relaxed text-[#1c1c2e] focus:outline-none focus:border-[#C0634C]"
      />

      <div className="flex items-center gap-2 mt-2">
        <select
          value={item.illustration}
          onChange={(e) => onChange({ illustration: e.target.value })}
          aria-label="イラスト選択"
          className="border border-[#dddddd] rounded-lg bg-white text-[12px] px-2 py-1.5 text-[#1c1c2e] focus:outline-none focus:border-[#C0634C] cursor-pointer"
        >
          {ILLUSTRATIONS.map((il) => (
            <option key={il.id} value={il.id}>
              {il.id ? `🖼 ${il.label}` : il.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled
          title="フェーズ2で対応予定"
          className="text-[12px] text-[#bbb] border border-[#e8e4de] rounded-lg px-2.5 py-1.5 cursor-not-allowed"
        >
          ✨ イラスト化
        </button>
      </div>
    </div>
  );
}
