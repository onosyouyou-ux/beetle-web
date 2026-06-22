'use client';

import { useRef } from 'react';
import { VISUAL_SIZES, DEFAULT_CROP, type VisualSizeId, type PhotoCrop } from '@/lib/templates';

interface Props {
  photo: string | null;
  size: VisualSizeId;
  crop: PhotoCrop;
  onChange: (patch: { photo?: string | null; size?: VisualSizeId; crop?: PhotoCrop }) => void;
}

const MAX_MB = 8;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// 帯のアスペクト比（プレビューと揃える）
const BAND_RATIO: Record<VisualSizeId, number> = { small: 5, medium: 3, large: 2 };

export default function MainVisual({ photo, size, crop, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

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
    // 画像を差し替えたらトリミングは初期化
    reader.onload = () => onChange({ photo: reader.result as string, crop: { ...DEFAULT_CROP } });
    reader.readAsDataURL(file);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, posX: crop.posX, posY: crop.posY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !boxRef.current) return;
    const { width, height } = boxRef.current.getBoundingClientRect();
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    onChange({
      crop: {
        ...crop,
        posX: clamp(drag.current.posX - (dx / width) * 100, 0, 100),
        posY: clamp(drag.current.posY - (dy / height) * 100, 0, 100),
      },
    });
  }
  function onPointerUp() {
    drag.current = null;
  }

  return (
    <div>
      <div className="field-label">メインビジュアル（写真・任意）</div>

      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      {!photo ? (
        <button
          type="button"
          onClick={pickFile}
          className="w-full border border-dashed border-[#cbc8c0] rounded-xl bg-white text-[13px] text-[#777] py-5 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors"
        >
          📷 写真を選ぶ（任意）
          <span className="block text-[11px] text-[#aaa] mt-1">写真は任意。なくてもイラストで作れます（{MAX_MB}MBまで）</span>
        </button>
      ) : (
        <div className="border border-[#e8e4de] rounded-xl bg-white p-3 space-y-2.5">
          {/* トリミングプレビュー（紙面の帯と同じ比率／ドラッグで位置調整） */}
          <div
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative w-full overflow-hidden rounded-lg bg-[#f1efe9] cursor-move touch-none select-none"
            style={{ aspectRatio: `${BAND_RATIO[size]} / 1` }}
            title="ドラッグで位置を調整"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt="メインビジュアル"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
              style={{ objectPosition: `${crop.posX}% ${crop.posY}%`, transform: `scale(${crop.zoom})` }}
            />
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black/45 rounded-full px-2 py-0.5 pointer-events-none">
              ドラッグで位置調整
            </span>
          </div>

          {/* ズーム */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#777] shrink-0">ズーム</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={crop.zoom}
              onChange={(e) => onChange({ crop: { ...crop, zoom: Number(e.target.value) } })}
              className="flex-1 accent-[#C0634C]"
              aria-label="ズーム"
            />
            <button
              type="button"
              onClick={() => onChange({ crop: { ...DEFAULT_CROP } })}
              className="text-[11px] text-[#999] hover:text-[#C0634C] transition-colors shrink-0"
            >
              リセット
            </button>
          </div>

          {/* 大きさ＋操作 */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#777]">大きさ</span>
              <div className="flex gap-1">
                {VISUAL_SIZES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onChange({ size: v.id })}
                    title={`A4印刷時のおよそ ${v.hint}`}
                    className={`flex flex-col items-center leading-tight rounded-md px-2.5 py-1 border transition-colors ${
                      size === v.id
                        ? 'border-[#C0634C] text-[#C0634C] font-bold bg-[#fdf3f0]'
                        : 'border-[#dddddd] text-[#555] hover:border-[#C0634C]'
                    }`}
                  >
                    <span className="text-[12px]">{v.label}</span>
                    <span className="text-[9px] text-[#999] font-normal">{v.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={pickFile} className="text-[12px] text-[#1c1c2e] hover:text-[#C0634C] transition-colors">
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
      )}
    </div>
  );
}
