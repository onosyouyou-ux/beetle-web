'use client';

import { useState } from 'react';
import { illustById } from '@/lib/templates';
import IllustPicker from '@/components/IllustPicker';

export interface ArticleItem {
  id: string;
  heading: string;
  text: string;
  illustration: string;
  illustFile: string;
  locked: boolean;
  lockedContent: { heading: string; body: string } | null; // ロック時に保存したAI/入力内容
}

interface Props {
  index: number;
  item: ArticleItem;
  canDelete: boolean;
  onChange: (patch: Partial<Omit<ArticleItem, 'id'>>) => void;
  onDelete: () => void;
  onAiRefine: () => void;
  isRefining: boolean;
}

const BOX_CLASSES = ['article-box-orange', 'article-box-blue', 'article-box-green'];

export default function ArticleBox({ index, item, canDelete, onChange, onDelete, onAiRefine, isRefining }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const cat = illustById(item.illustration);
  const hasImage = !!cat && cat.files.length > 0 && !!item.illustFile;
  const colorClass = item.locked ? '' : BOX_CLASSES[index % BOX_CLASSES.length];
  const lockedClass = item.locked ? 'border-[#ccc] bg-[#f7f7f7]' : '';

  return (
    <div className={`rounded-xl p-3.5 border ${colorClass} ${lockedClass}`}>
      {/* ── ヘッダー行 ── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="field-label mb-0">記事{index + 1}</span>
          {item.locked && (
            <span className="text-[10px] text-[#C0634C] font-bold tracking-wide">ロック中</span>
          )}
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[12px] font-bold text-[#ef8a3c] hover:text-[#e07428] transition-colors"
          >
            削除
          </button>
        )}
      </div>

      <div className="flex gap-3">
        {/* 左：入力 */}
        <div className="flex-1 min-w-0">
          <input
            value={item.heading}
            onChange={(e) => onChange({ heading: e.target.value })}
            placeholder="見出し（例：みんなで楽しんだ図書の時間！）"
            className="w-full border border-[#dddddd] rounded-lg px-3 py-2 text-[14px] text-[#1c1c2e] focus:outline-none focus:border-[#C0634C] mb-2"
          />
          <textarea
            value={item.text}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={3}
            placeholder={"メモ（箇条書きや自由入力）\n例）係の仕事を毎日きちんとやっていた / 友だちと協力して掃除をがんばった"}
            className="w-full resize-y border border-[#dddddd] rounded-lg px-3 py-2.5 text-[14px] leading-relaxed text-[#1c1c2e] focus:outline-none focus:border-[#C0634C]"
          />

          {/* ── ボタン行 ── */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {/* AI修正ボタン */}
            <button
              type="button"
              onClick={onAiRefine}
              disabled={isRefining || !item.text.trim()}
              title="この記事だけAIで整える"
              className="flex items-center gap-1 text-[12px] font-bold text-white bg-[#ef8a3c] rounded-lg px-2.5 py-1.5 hover:bg-[#e07428] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefining ? (
                <span className="spin inline-block text-[11px]">↻</span>
              ) : (
                <span className="text-[11px]">✦</span>
              )}
              AI修正
            </button>

            {/* イラストボタン */}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-[12px] text-[#1c1c2e] border border-[#dddddd] rounded-lg px-2.5 py-1.5 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors"
            >
              🖼 {hasImage ? 'イラスト変更' : 'イラスト'}
            </button>

            {/* ロックトグル */}
            <button
              type="button"
              onClick={() => onChange({ locked: !item.locked })}
              title={item.locked ? 'ロック解除（AIで編集可能に戻す）' : 'ロック（AIで編集しない）'}
              className={`text-[13px] px-2 py-1.5 rounded-lg border transition-colors ${
                item.locked
                  ? 'border-[#C0634C] text-[#C0634C] bg-[#fdf3f0] font-bold'
                  : 'border-[#dddddd] text-[#bbb] hover:border-[#aaa] hover:text-[#777]'
              }`}
            >
              {item.locked ? '🔒' : '🔓'}
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
              外す
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
