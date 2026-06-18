'use client';

import { useRef } from 'react';
import { VISUAL_SIZES, type VisualSizeId } from '@/lib/templates';

interface Props {
  photo: string | null;
  size: VisualSizeId;
  onChange: (patch: { photo?: string | null; size?: VisualSizeId }) => void;
}

const MAX_MB = 8;

export default function MainVisual({ photo, size, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同じファイルを選び直せるようにリセット
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選んでください。');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`画像が大きすぎます（${MAX_MB}MBまで）。`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ photo: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="field-label">メインビジュアル（写真）</div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />

      {!photo ? (
        <button
          type="button"
          onClick={pickFile}
          className="w-full border border-dashed border-[#cbc8c0] rounded-xl bg-white text-[13px] text-[#777] py-5 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors"
        >
          📷 写真を選ぶ
          <span className="block text-[11px] text-[#aaa] mt-1">タイトル下に大きく載せる1枚（{MAX_MB}MBまで）</span>
        </button>
      ) : (
        <div className="border border-[#e8e4de] rounded-xl bg-white p-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt="メインビジュアル"
              className="w-20 h-14 object-cover rounded-lg border border-[#e8e4de] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#777]">大きさ</span>
                <div className="flex gap-1">
                  {VISUAL_SIZES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onChange({ size: v.id })}
                      className={`text-[12px] rounded-md px-2.5 py-1 border transition-colors ${
                        size === v.id
                          ? 'border-[#C0634C] text-[#C0634C] font-bold bg-[#fdf3f0]'
                          : 'border-[#dddddd] text-[#555] hover:border-[#C0634C]'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={pickFile}
                  className="text-[12px] text-[#1c1c2e] hover:text-[#C0634C] transition-colors"
                >
                  差し替え
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ photo: null })}
                  className="text-[12px] text-[#999] hover:text-[#a32d2d] transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
