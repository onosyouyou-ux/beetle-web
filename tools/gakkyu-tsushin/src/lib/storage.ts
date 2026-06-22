// 作成した紙面の保存・取り込み（localStorage）。
import type { ArticleItem } from '@/components/ArticleBox';
import type { FixedFieldValues } from '@/components/FixedFields';
import type { NewsletterResult } from '@/lib/claude';
import type { ToneId, EventId, FontId, SizeId, VisualSizeId, PhotoCrop } from '@/lib/templates';

const KEY = 'gakkyu:saved';
const MAX_ITEMS = 20;

export interface NewsletterSnapshot {
  v: 1;
  id: string;
  savedAt: number;       // epoch ms
  title: string;
  meta: string;
  articles: ArticleItem[];
  fixed: FixedFieldValues;
  tone: ToneId;
  event: EventId;
  font: FontId;
  size: SizeId;
  photo: string | null;
  photoSize: VisualSizeId;
  photoCrop: PhotoCrop;
  result: NewsletterResult | null;
}

function read(): NewsletterSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as NewsletterSnapshot[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function listSaved(): NewsletterSnapshot[] {
  return read().sort((a, b) => b.savedAt - a.savedAt);
}

/** 保存。容量オーバー時は写真を外して再試行する。戻り値は成否＋写真を落としたか。 */
export function saveSnapshot(snap: NewsletterSnapshot): { ok: boolean; droppedPhoto: boolean } {
  const others = read().filter((s) => s.id !== snap.id);
  const tryWrite = (items: NewsletterSnapshot[]): boolean => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
      return true;
    } catch {
      return false;
    }
  };
  const next = [snap, ...others];
  if (tryWrite(next)) return { ok: true, droppedPhoto: false };
  // 容量オーバー → 写真を外してもう一度
  const lite = [{ ...snap, photo: null }, ...others];
  if (tryWrite(lite)) return { ok: true, droppedPhoto: !!snap.photo };
  return { ok: false, droppedPhoto: false };
}

export function deleteSaved(id: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(read().filter((s) => s.id !== id)));
  } catch {
    /* noop */
  }
}
