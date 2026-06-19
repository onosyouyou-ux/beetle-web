'use client';

import { useState } from 'react';
import { ILLUSTRATIONS, illustSrc } from '@/lib/templates';

interface Props {
  open: boolean;
  onToggle: () => void;
  /** 入り先の記事ラベル（例：「記事2」） */
  targetLabel: string;
  /** いま選択中の画像 */
  current: { illustration: string; illustFile: string };
  onSelect: (catId: string, file: string) => void;
  onClear: () => void;
}

// 画像を持つカテゴリだけタブにする（「（なし）」は除外）
const CATEGORIES = ILLUSTRATIONS.filter((il) => il.files.length > 0);

export default function IllustTray({ open, onToggle, targetLabel, current, onSelect, onClear }: Props) {
  const [tab, setTab] = useState(CATEGORIES[0]?.id ?? '');
  const cat = CATEGORIES.find((c) => c.id === tab) ?? CATEGORIES[0];

  return (
    <div className="fixed bottom-0 inset-x-0 z-[90]">
      {/* ── 展開パネル ── */}
      {open && (
        <div className="bg-white border-t border-[#e8e4de] shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-3">
            {/* カテゴリタブ */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTab(c.id)}
                  className={`text-[12px] rounded-full px-3 py-1.5 border transition-colors ${
                    tab === c.id
                      ? 'border-[#C0634C] text-[#C0634C] font-bold bg-[#fdf3f0]'
                      : 'border-[#dddddd] text-[#555] hover:border-[#C0634C]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                onClick={onClear}
                className="ml-auto text-[12px] text-[#999] hover:text-[#a32d2d] transition-colors"
              >
                イラストを外す
              </button>
            </div>

            {/* サムネイル一覧 */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[38vh] overflow-y-auto">
              {cat?.files.map((file) => {
                const selected = current.illustration === cat.id && current.illustFile === file;
                return (
                  <button
                    key={file}
                    type="button"
                    onClick={() => onSelect(cat.id, file)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selected ? 'border-[#C0634C]' : 'border-transparent hover:border-[#cbc8c0]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={illustSrc(cat.id, file)} alt="" className="w-full h-full object-cover" />
                    {selected && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#C0634C] text-white text-[10px] leading-4 text-center">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 常設バー ── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-2 bg-[#1c1c2e] text-white text-[13px] py-3 hover:bg-[#2a2a44] transition-colors"
      >
        <span>🖼 イラストを一覧から選ぶ</span>
        <span className="text-white/60">（{targetLabel}に入れる）</span>
        <span className="ml-1 text-white/60">{open ? '▼' : '▲'}</span>
      </button>
    </div>
  );
}
