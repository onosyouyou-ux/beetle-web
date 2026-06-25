'use client';

import { useEffect, useRef, useState } from 'react';
import { VISUAL_SIZES, DEFAULT_CROP, type VisualSizeId, type PhotoCrop } from '@/lib/templates';

interface Props {
  photo: string | null;
  size: VisualSizeId;
  onChange: (patch: { photo?: string | null; size?: VisualSizeId }) => void;
}

const MAX_MB = 8;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const ASPECT: Record<VisualSizeId, number> = { small: 5, medium: 3, large: 2 };
const CANVAS_W = 1200;

function canvasCrop(origSrc: string, ratio: number, { posX, posY, zoom }: PhotoCrop): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = CANVAS_W;
      const H = Math.round(W / ratio);
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      const { naturalWidth: iw, naturalHeight: ih } = img;
      const scale = Math.max(W / iw, H / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      const ox = (posX / 100) * (W - sw);
      const oy = (posY / 100) * (H - sh);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(img, ox, oy, sw, sh);
      ctx.restore();
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = origSrc;
  });
}

export default function MainVisual({ photo, size, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emitSeq = useRef(0); // レースコンディション防止：最新の emit のみ photo に反映

  useEffect(() => () => { if (zoomTimer.current) clearTimeout(zoomTimer.current); }, []);

  const [origSrc, setOrigSrc] = useState<string | null>(null);
  const cropRef = useRef<PhotoCrop>({ ...DEFAULT_CROP }); // drags で stale にならないよう ref でも管理
  const [crop, _setCrop] = useState<PhotoCrop>({ ...DEFAULT_CROP });

  function setCrop(c: PhotoCrop | ((prev: PhotoCrop) => PhotoCrop)) {
    const next = typeof c === 'function' ? c(cropRef.current) : c;
    cropRef.current = next;
    _setCrop(next);
  }

  async function emit(src: string, newSize: VisualSizeId, c: PhotoCrop) {
    const seq = ++emitSeq.current;
    const cropped = await canvasCrop(src, ASPECT[newSize], c);
    if (seq === emitSeq.current) onChange({ photo: cropped }); // 古い結果は捨てる
  }

  function pickFile() { inputRef.current?.click(); }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('画像ファイルを選んでください。'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { alert(`画像が大きすぎます（${MAX_MB}MBまで）。`); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const src = reader.result as string;
      const c = { ...DEFAULT_CROP };
      setOrigSrc(src);
      setCrop(c);
      await emit(src, size, c);
    };
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
    setCrop((c) => ({
      ...c,
      posX: clamp(drag.current!.posX - (dx / width) * 100, 0, 100),
      posY: clamp(drag.current!.posY - (dy / height) * 100, 0, 100),
    }));
  }

  async function onPointerUp(e: React.PointerEvent) {
    if (!drag.current || !origSrc || !boxRef.current) { drag.current = null; return; }
    const { width, height } = boxRef.current.getBoundingClientRect();
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const posX = clamp(drag.current.posX - (dx / width) * 100, 0, 100);
    const posY = clamp(drag.current.posY - (dy / height) * 100, 0, 100);
    drag.current = null;
    const c = { ...cropRef.current, posX, posY }; // ref から読んで stale 回避
    setCrop(c);
    await emit(origSrc, size, c);
  }

  function onZoom(newZoom: number) {
    const c = { ...cropRef.current, zoom: newZoom };
    setCrop(c);
    if (zoomTimer.current) clearTimeout(zoomTimer.current);
    if (!origSrc) return;
    zoomTimer.current = setTimeout(() => emit(origSrc, size, c), 300);
  }

  async function onSizeClick(newSize: VisualSizeId) {
    onChange({ size: newSize });
    if (origSrc) await emit(origSrc, newSize, crop);
  }

  async function onReset() {
    const c = { ...DEFAULT_CROP };
    setCrop(c);
    if (origSrc) await emit(origSrc, size, c);
  }

  function onDelete() {
    setOrigSrc(null);
    setCrop({ ...DEFAULT_CROP });
    onChange({ photo: null });
  }

  return (
    <div>
      <div className="field-label">メインビジュアル（写真・任意）</div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      {!origSrc ? (
        <div>
          <button
            type="button"
            onClick={pickFile}
            className="w-full border-2 border-dashed border-[#ef8a3c] rounded-xl bg-white py-6 flex flex-col items-center gap-1.5 hover:bg-[#fdf3f0] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#ef8a3c]">
              <path d="M12 2a7 7 0 0 1 6.93 5.98A5.5 5.5 0 0 1 17.5 19H7a5 5 0 0 1-.24-9.98A7 7 0 0 1 12 2Zm0 2a5 5 0 0 0-4.9 4.01l-.06.42-.43.04A3 3 0 0 0 7 14h10.5a3.5 3.5 0 0 0 .24-6.99l-.49-.02-.09-.48A5 5 0 0 0 12 4Zm0 4a1 1 0 0 1 .993.883L13 9v2h2a1 1 0 0 1 .117 1.993L15 13h-2v2a1 1 0 0 1-1.993.117L11 15v-2H9a1 1 0 0 1-.117-1.993L9 11h2V9a1 1 0 0 1 1-1Z"/>
            </svg>
            <span className="text-[14px] font-bold text-[#ef8a3c]">写真を選ぶ（任意）</span>
          </button>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span
              className="hint-chip"
              data-tooltip={"📄 JPG / PNG（最大8MB）\n\n• 大サイズ → 〜4MB　印刷時 約19×9cm\n• 中サイズ → 〜2MB　印刷時 約19×6cm\n• 小サイズ → 〜1MB　印刷時 約19×4cm"}
            >
              📄 JPG / PNG
            </span>
          </div>
        </div>
      ) : (
        <div className="border border-[#e8e4de] rounded-xl bg-white p-3 space-y-2.5">
          {/* ライブプレビュー: origSrc で CSS crop（見た目確認用） */}
          <div
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative w-full overflow-hidden rounded-lg bg-[#f1efe9] cursor-move touch-none select-none"
            style={{ aspectRatio: `${ASPECT[size]} / 1` }}
            title="ドラッグで位置を調整"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={origSrc}
              alt="メインビジュアル"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
              style={{ objectPosition: `${crop.posX}% ${crop.posY}%`, transform: `scale(${crop.zoom})` }}
            />
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black/45 rounded-full px-2 py-0.5 pointer-events-none">
              ドラッグで位置調整
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#777] shrink-0">ズーム</span>
            <input
              type="range" min={1} max={3} step={0.05}
              value={crop.zoom}
              onChange={(e) => onZoom(Number(e.target.value))}
              className="flex-1 accent-[#C0634C]"
              aria-label="ズーム"
            />
            <button type="button" onClick={onReset} className="text-[11px] text-[#999] hover:text-[#C0634C] transition-colors shrink-0">
              リセット
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#777]">大きさ</span>
              <div className="flex gap-1">
                {VISUAL_SIZES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSizeClick(v.id)}
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
              <button type="button" onClick={onDelete} className="text-[12px] text-[#999] hover:text-[#a32d2d] transition-colors">
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
