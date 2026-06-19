'use client';

import { ILLUSTRATIONS, illustById, illustSrc, pickIllustFile } from '@/lib/templates';

export interface ArticleItem {
  id: string;
  text: string;
  illustration: string;  // カテゴリID（'' = なし）
  illustFile: string;    // 選択中の画像ファイル名
}

interface Props {
  index: number;
  item: ArticleItem;
  canDelete: boolean;
  active: boolean;
  onChange: (patch: Partial<Omit<ArticleItem, 'id'>>) => void;
  onDelete: () => void;
  onActivate: () => void;
  onOpenTray: () => void;
}

export default function ArticleBox({ index, item, canDelete, active, onChange, onDelete, onActivate, onOpenTray }: Props) {
  const cat = illustById(item.illustration);
  const hasImages = !!cat && cat.files.length > 0;

  function selectCategory(id: string) {
    onChange({ illustration: id, illustFile: pickIllustFile(id) });
  }
  function shuffle() {
    if (item.illustration) onChange({ illustFile: pickIllustFile(item.illustration) });
  }

  return (
    <div
      onFocusCapture={onActivate}
      onClick={onActivate}
      className={`rounded-xl bg-white p-3.5 border transition-colors ${
        active ? 'border-[#C0634C] ring-1 ring-[#C0634C]' : 'border-[#e8e4de]'
      }`}
    >
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
        <span className="text-[12px] text-[#777] shrink-0">イラスト</span>
        <select
          value={item.illustration}
          onChange={(e) => selectCategory(e.target.value)}
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
          onClick={() => { onActivate(); onOpenTray(); }}
          title="一覧から好きな1枚を選ぶ"
          className="text-[12px] text-[#1c1c2e] border border-[#dddddd] rounded-lg px-2.5 py-1.5 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors"
        >
          🖼 一覧から選ぶ
        </button>

        {hasImages && (
          <button
            type="button"
            onClick={shuffle}
            title="同じカテゴリの別の絵に変える"
            className="text-[12px] text-[#1c1c2e] border border-[#dddddd] rounded-lg px-2.5 py-1.5 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors"
          >
            🔀 別の絵
          </button>
        )}

        {hasImages && item.illustFile && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={illustSrc(item.illustration, item.illustFile)}
            alt=""
            className="w-9 h-9 object-cover rounded-md border border-[#e8e4de] ml-auto"
          />
        )}
      </div>
    </div>
  );
}
