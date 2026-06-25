import type { PhotoSizeInput } from './claude';

// 1カラムあたりの文字数容量（size-medium、実測に近い550px幅で再計算）
// paper padding 5.5%両側 → 有効幅 489px、カラム幅 ≈ 235px
// chars/line ≈ 235/13px = 18字（日本語全角）、line-height 24px
// body_height = 有効高700px - header56px - photo高
const COL_CAP: Record<string, number> = {
  none:   485,   // body 644px → (644/24)×18
  small:  403,   // body 534px → photo 110+margin
  medium: 353,   // body 469px → photo 163+margin
  large:  291,   // body 388px → photo 245+margin
};

const SAFETY       = 0.82;
const ART_OVERHEAD = 42;  // 見出し + article margin-bottom（1行分相当）
const BOX_OVERHEAD = 65;  // 固定ボックス1個（タイトル行 + padding + border + margin）
const FILL_BUDGET  = 80;  // 先生からの一言 + ラベルオーバーヘッド

/** 左カラム（記事1・2合計）の予算 */
export function calcLeftBudget(photoSize: PhotoSizeInput, articleCount: number): { min: number; max: number } {
  const cap = COL_CAP[photoSize] ?? 535;
  const n   = Math.max(1, Math.min(2, articleCount));
  const base = Math.max(n * 70, cap - n * ART_OVERHEAD);
  const max  = Math.round(base * SAFETY);
  return { min: Math.round(max * 0.85), max };
}

/** 右カラム：固定欄・先生コメントを引いた後の記事3予算 */
export function calcRightArticleBudget(
  photoSize: PhotoSizeInput,
  eventsLen: number,
  itemsLen: number,
  cautionLen: number,
): { min: number; max: number } {
  const cap   = COL_CAP[photoSize] ?? 535;
  const boxes = (eventsLen > 0 ? 1 : 0) + (itemsLen > 0 ? 1 : 0) + (cautionLen > 0 ? 1 : 0);
  const used  = eventsLen + itemsLen + cautionLen + boxes * BOX_OVERHEAD + FILL_BUDGET + ART_OVERHEAD;
  const max   = Math.round(Math.max(0, cap - used) * SAFETY);
  return { min: Math.round(max * 0.85), max };
}
