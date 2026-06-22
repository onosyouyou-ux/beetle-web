// クラスの性格（トーン）× イベント のテンプレート定義。
// プルダウンの選択肢と、Claude へのトーン指示の両方に使う。

export type ToneId = 'lower' | 'upper' | 'friendly';
export type EventId = 'undokai' | 'ensoku' | 'normal' | 'sotsugyo';
export type FontId = 'round' | 'gothic' | 'mincho';
export type SizeId = 'small' | 'medium' | 'large';
export type VisualSizeId = 'small' | 'medium' | 'large';

// メインビジュアルのトリミング情報。
// posX/posY は object-position(%)、zoom は拡大率（1=ぴったりcover）。
export interface PhotoCrop {
  posX: number;  // 0–100
  posY: number;  // 0–100
  zoom: number;  // 1–3
}

export const DEFAULT_CROP: PhotoCrop = { posX: 50, posY: 50, zoom: 1 };

export interface Tone {
  id: ToneId;
  label: string;
  /** Claude に渡すトーン指示 */
  prompt: string;
  /** 既定フォント */
  defaultFont: FontId;
}

export interface NewsletterEvent {
  id: EventId;
  label: string;
  /** Claude に渡すイベントの雰囲気指示 */
  prompt: string;
}

export const TONES: Tone[] = [
  {
    id: 'lower',
    label: '低学年・やわらか',
    prompt: '低学年向け。丸っこく元気で、ひらがな多め・短い文。明るく親しみやすい言葉づかい。',
    defaultFont: 'round',
  },
  {
    id: 'upper',
    label: '高学年・すっきり',
    prompt: '高学年向け。大人っぽく簡潔。落ち着いた言葉づかいで、要点を端的にまとめる。',
    defaultFont: 'gothic',
  },
  {
    id: 'friendly',
    label: '仲良し学級',
    prompt: 'やさしく幼げで、あたたかい雰囲気。やわらかい言葉づかいでクラスの和を感じさせる。',
    defaultFont: 'round',
  },
];

export const EVENTS: NewsletterEvent[] = [
  { id: 'undokai', label: '運動会', prompt: '運動会号。がんばりや活気が伝わる見出し。' },
  { id: 'ensoku', label: '遠足', prompt: '遠足号。わくわく感や思い出が伝わる見出し。' },
  { id: 'normal', label: '通常号', prompt: '通常号。日々のできごとを落ち着いて伝える。' },
  { id: 'sotsugyo', label: '卒業', prompt: '卒業号。感謝や門出を感じさせる、少し改まった見出し。' },
];

export const FONTS: { id: FontId; label: string; className: string }[] = [
  { id: 'round', label: 'ゴシック（丸）', className: 'font-round' },
  { id: 'gothic', label: 'ゴシック', className: 'font-gothic' },
  { id: 'mincho', label: '明朝', className: 'font-mincho' },
];

export const SIZES: { id: SizeId; label: string; className: string }[] = [
  { id: 'small', label: '小', className: 'size-small' },
  { id: 'medium', label: '中', className: 'size-medium' },
  { id: 'large', label: '大', className: 'size-large' },
];

// メインビジュアル写真の大きさ（帯の高さ＝アスペクト比で切替）
export const VISUAL_SIZES: { id: VisualSizeId; label: string; className: string }[] = [
  { id: 'small', label: '小', className: 'vis-small' },
  { id: 'medium', label: '中', className: 'vis-medium' },
  { id: 'large', label: '大', className: 'vis-large' },
];

export function toneById(id: ToneId): Tone {
  return TONES.find((t) => t.id === id) ?? TONES[0];
}

export function eventById(id: EventId): NewsletterEvent {
  return EVENTS.find((e) => e.id === id) ?? EVENTS[2];
}

// プリセットイラスト。実画像は public/illust/{dir}/ に配置。
// files は「完全な src パス」（/illust/{dir}/{file}）で持つ。
// カテゴリは複数ディレクトリを束ねられる（例：行事＝運動会＋行事＋入学式）。
export interface Illustration {
  id: string;        // '' = なし
  label: string;
  files: string[];   // 例: '/illust/gakko/gakko-01.jpg'
}

// 本体ドメイン配下で配信するための basePath。
// next.config.mjs の basePath と必ず一致させること。public配下の資産やAPIはこの接頭辞が要る。
export const BASE_PATH = '/tools/gakkyu-tsushin';

// {BASE_PATH}/illust/{dir}/{prefix}-01.jpg … を n 枚ぶん生成
function illustSet(dir: string, prefix: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${BASE_PATH}/illust/${dir}/${prefix}-${String(i + 1).padStart(2, '0')}.jpg`);
}

export const ILLUSTRATIONS: Illustration[] = [
  { id: '', label: '（なし）', files: [] },
  { id: 'gakko', label: '学校生活', files: illustSet('gakko', 'gakko', 14) },
  {
    id: 'gyoji',
    label: '行事',
    files: [
      ...illustSet('gyoji', 'gyoji', 11),
      ...illustSet('undokai', 'undokai', 11),
      ...illustSet('nyugaku', 'nyugaku', 4),
    ],
  },
];

export function illustById(id: string): Illustration | undefined {
  return ILLUSTRATIONS.find((il) => il.id === id);
}

// カテゴリ内からランダムに1枚選ぶ（なし/該当なしは空文字）。戻り値は完全な src パス。
export function pickIllustFile(id: string): string {
  const il = illustById(id);
  if (!il || il.files.length === 0) return '';
  return il.files[Math.floor(Math.random() * il.files.length)];
}
