'use client';

import { useState, useEffect } from 'react';
import { ILLUSTRATIONS } from '@/lib/templates';

interface Props {
  open: boolean;
  onClose: () => void;
  current: { illustration: string; illustFile: string };
  onSelect: (catId: string, file: string) => void;
  onClear: () => void;
}

// 画像を持つカテゴリだけ（「（なし）」は除外）
const CATEGORIES = ILLUSTRATIONS.filter((il) => il.files.length > 0);

export default function IllustPicker({ open, onClose, current, onSelect, onClear }: Props) {
  const [tab, setTab] = useState(CATEGORIES[0]?.id ?? '');
  const cat = CATEGORIES.find((c) => c.id === tab) ?? CATEGORIES[0];

  // Escで閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[560px] max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#e8e4de]">
          <span className="text-[14px] font-bold text-[#1c1c2e]">イラストを選ぶ</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-[#999] hover:text-[#1c1c2e] text-[18px] leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* カテゴリタブ */}
        <div className="shrink-0 flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-[#f0ece4]">
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
            onClick={() => { onClear(); onClose(); }}
            className="ml-auto text-[12px] text-[#999] hover:text-[#a32d2d] transition-colors"
          >
            イラストを外す
          </button>
        </div>

        {/* サムネイル一覧（枚数が多いカテゴリはここだけスクロール） */}
        <div className="flex-1 min-h-0 grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-4 content-start overflow-y-auto overscroll-contain">
          {cat?.files.map((file) => {
            const selected = current.illustration === cat.id && current.illustFile === file;
            return (
              <button
                key={file}
                type="button"
                onClick={() => { onSelect(cat.id, file); onClose(); }}
                className={`relative self-start rounded-lg overflow-hidden border-2 transition-colors ${
                  selected ? 'border-[#C0634C]' : 'border-transparent hover:border-[#cbc8c0]'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file} alt="" loading="lazy" className="block w-full aspect-square object-cover" />
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
  );
}
