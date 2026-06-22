'use client';

import { useEffect, useState } from 'react';
import { listSaved, saveSnapshot, deleteSaved, type NewsletterSnapshot } from '@/lib/storage';

type SnapshotData = Omit<NewsletterSnapshot, 'id' | 'savedAt' | 'v'>;

interface Props {
  /** 現在の編集内容をスナップショット化して返す */
  buildSnapshot: () => SnapshotData;
  /** 保存済みを読み込む */
  onLoad: (snap: NewsletterSnapshot) => void;
}

const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `n${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function fmt(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function SavedBar({ buildSnapshot, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NewsletterSnapshot[]>([]);

  const refresh = () => setItems(listSaved());
  useEffect(() => { refresh(); }, []);

  function handleSave() {
    const data = buildSnapshot();
    const snap: NewsletterSnapshot = { v: 1, id: newId(), savedAt: Date.now(), ...data };
    const { ok, droppedPhoto } = saveSnapshot(snap);
    refresh();
    if (!ok) {
      alert('保存できませんでした（保存容量がいっぱいの可能性があります）。古い紙面を削除してからお試しください。');
      return;
    }
    if (droppedPhoto) {
      alert('保存しました。ただし写真は容量の都合で保存できませんでした（文章とレイアウトは保存済みです）。');
    }
  }

  function handleDelete(id: string) {
    deleteSaved(id);
    refresh();
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 border border-[#dddddd] rounded-lg bg-white text-[13px] text-[#1c1c2e] py-2 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors"
        >
          💾 この紙面を保存
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 border border-[#dddddd] rounded-lg bg-white text-[13px] text-[#1c1c2e] py-2 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors"
        >
          📂 以前の紙面を取り込む{items.length > 0 ? `（${items.length}）` : ''}
          <span className="ml-1 text-[#aaa]">{open ? '▲' : '▼'}</span>
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-[#e8e4de] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.1)] p-2 max-h-[50vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-[13px] text-[#999] text-center py-6">
              保存した紙面はまだありません。<br />「💾 この紙面を保存」で残せます。
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#faf9f7]">
                  <button
                    type="button"
                    onClick={() => { onLoad(s); setOpen(false); }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-[13px] text-[#1c1c2e] truncate">
                      {s.title?.trim() || '（無題のたより）'}
                    </div>
                    <div className="text-[11px] text-[#999] truncate">
                      {(s.meta?.trim() || '—')} ・ {fmt(s.savedAt)}{s.photo ? ' ・📷' : ''}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="text-[11px] text-[#999] hover:text-[#a32d2d] transition-colors shrink-0"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
