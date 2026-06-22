'use client';

import { useState } from 'react';
import { illustById } from '@/lib/templates';
import IllustPicker from '@/components/IllustPicker';

export interface ArticleItem {
  id: string;
  text: string;
  illustration: string;  // カテゴリID（'' = なし）
  illustFile: string;    // 選択中の画像の完全パス（'' = なし）
}

interface Props {
  index: number;
  item: ArticleItem;
  canDelete: boolean;
  onChange: (patch: Partial<Omit<ArticleItem, 'id'>>) => void;
  onDelete: () => void;
}

export default function ArticleBox({ index, item, canDelete, onChange, onDelete }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const cat = illustById(item.illustration);
  const hasImage = !!cat && cat.files.length > 0 && !!item.illustFile;

  return (
    <div className="rounded-xl bg-white p-3.5 border border-[#e8e4de]">
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

      <div className="flex gap-3">
        {/* 左：入力 */}
        <div className="flex-1 min-w-0">
          <textarea
            value={item.text}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={4}
            placeholder="運動会の練習が始まりました。みんな頑張っています。リレーが盛り上がっています。&#10;（箇条書きでOK）"
            className="w-full resize-y border border-[#dddddd] rounded-lg px-3 py-2.5 text-[14px] leading-relaxed text-[#1c1c2e] focus:outline-none focus:border-[#C0634C]"
          />

          <div className="mt-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-[12px] text-[#1c1c2e] border border-[#dddddd] rounded-lg px-3 py-1.5 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors"
            >
              🖼 {hasImage ? 'イラストを変える' : '一覧から選択'}
            </button>
          </div>
        </div>

        {/* 右：選んだイラストを大きく表示 */}
        {hasImage && (
          <div className="shrink-0 w-28 sm:w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.illustFile}
              alt=""
              className="w-full aspect-square object-cover rounded-lg border border-[#e8e4de]"
            />
            <button
              type="button"
              onClick={() => onChange({ illustration: '', illustFile: '' })}
              className="mt-1 w-full text-center text-[11px] text-[#999] hover:text-[#a32d2d] transition-colors"
            >
              イラストを外す
            </button>
          </div>
        )}
      </div>

      <IllustPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        current={{ illustration: item.illustration, illustFile: item.illustFile }}
        onSelect={(catId, file) => onChange({ illustration: catId, illustFile: file })}
        onClear={() => onChange({ illustration: '', illustFile: '' })}
      />
    </div>
  );
}
