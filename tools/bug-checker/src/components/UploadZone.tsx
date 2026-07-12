'use client';

import { useRef, useState } from 'react';
import { IconPhotoScan, IconX } from '@tabler/icons-react';

interface Props {
  preview: string | null;
  onUpload: (file: File, dataUrl: string) => void;
  onReset: () => void;
  disabled: boolean;
}

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function UploadZone({ preview, onUpload, onReset, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (!ACCEPT.includes(file.type)) {
      alert('PNG / JPEG / WebP / GIF のみ対応しています');
      return;
    }
    if (file.size > MAX_BYTES) {
      alert('5MB 以下の画像を選択してください');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onUpload(file, reader.result as string);
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  if (preview) {
    return (
      <div className="border border-[#c8c7c0] rounded-xl my-3 overflow-hidden relative">
        <img
          src={preview}
          alt="アップロード済み画像"
          className="w-full max-h-[200px] object-contain block bg-[#fafaf8]"
        />
        <button
          onClick={onReset}
          className="absolute top-2 right-2 w-[26px] h-[26px] rounded-full bg-white border border-[#c8c7c0] flex items-center justify-center text-muted hover:text-ink transition-colors"
          style={{ borderWidth: '0.5px' }}
        >
          <IconX size={13} />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
      <div
        className={`border border-dashed rounded-xl py-5 px-4 text-center bg-[#fafaf8] my-3 cursor-pointer transition-colors
          ${dragging ? 'border-[#888780] bg-white' : 'border-[#c8c7c0]'}
          ${disabled ? 'pointer-events-none opacity-50' : 'hover:border-[#888780] hover:bg-white'}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="text-[#888780] mb-1 flex justify-center">
          <IconPhotoScan size={34} />
        </div>
        <div className="text-[15px] font-bold text-ink">クリックして画像をアップロード</div>
        <div className="text-[12px] text-[#888780] mt-1">
          スクリーンショット・エラー画面・UIの不具合など PNG / JPEG / WebP / GIF（5MBまで）
        </div>
      </div>
    </>
  );
}
