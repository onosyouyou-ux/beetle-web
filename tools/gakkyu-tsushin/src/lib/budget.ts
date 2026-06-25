import type { PhotoSizeInput } from './claude';

export interface BudgetParams {
  articleCount: number;
  photoSize: PhotoSizeInput;
  eventsLen: number;
  itemsLen: number;
  cautionLen: number;
  illustCount: number;
}

export function calcCharBudget(p: BudgetParams): { min: number; max: number } {
  let base = 950;

  const photoDeduct: Record<string, number> = { none: 0, small: 130, medium: 220, large: 340 };
  base -= photoDeduct[p.photoSize] ?? 0;

  // 3記事以上は見出し・余白オーバーヘッドが増える（基準は2本）
  if (p.articleCount > 2) base -= (p.articleCount - 2) * 55;

  // 固定欄：本文文字数 + ボックスオーバーヘッド（タイトル行・余白・ボーダー相当 65字）
  const fixedBoxes =
    (p.eventsLen > 0 ? 1 : 0) +
    (p.itemsLen > 0 ? 1 : 0) +
    (p.cautionLen > 0 ? 1 : 0);
  const fixedDeduct = Math.min(
    (p.eventsLen + p.itemsLen + p.cautionLen) + fixedBoxes * 65,
    600,
  );
  base -= fixedDeduct;

  // イラストフロートのオーバーヘッド
  base -= p.illustCount * 60;

  // 20%の安全マージン
  const target = Math.round(Math.max(p.articleCount * 70, base) * 0.82);
  return {
    min: Math.max(p.articleCount * 55, Math.round(target * 0.88)),
    max: target,
  };
}
