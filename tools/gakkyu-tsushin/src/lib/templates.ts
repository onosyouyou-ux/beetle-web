// クラスの性格（トーン）× イベント のテンプレート定義。
// プルダウンの選択肢と、Claude へのトーン指示の両方に使う。

export type ToneId = 'lower' | 'upper' | 'friendly';
export type EventId = 'undokai' | 'ensoku' | 'normal' | 'sotsugyo';
export type FontId = 'round' | 'gothic' | 'mincho';
export type SizeId = 'small' | 'medium' | 'large';
export type VisualSizeId = 'small' | 'medium' | 'large';

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

// プリセットイラスト。実画像は public/illust/{id}/ に配置。
export interface Illustration {
  id: string;        // '' = なし
  label: string;
  files: string[];   // /illust/{id}/ 配下のファイル名（複数バリエーション）
}

export const ILLUSTRATIONS: Illustration[] = [
  { id: '', label: '（なし）', files: [] },
  { id: 'undokai', label: '運動会', files: ['undokai-01.jpg', 'undokai-02.jpg', 'undokai-03.jpg', 'undokai-04.jpg', 'undokai-05.jpg', 'undokai-06.jpg', 'undokai-07.jpg', 'undokai-08.jpg', 'undokai-09.jpg', 'undokai-10.jpg', 'undokai-11.jpg'] },
  { id: 'gakko', label: '学校生活', files: ['gakko-01.jpg', 'gakko-02.jpg', 'gakko-03.jpg', 'gakko-04.jpg', 'gakko-05.jpg', 'gakko-06.jpg', 'gakko-07.jpg', 'gakko-08.jpg', 'gakko-09.jpg', 'gakko-10.jpg', 'gakko-11.jpg', 'gakko-12.jpg', 'gakko-13.jpg', 'gakko-14.jpg'] },
  { id: 'gyoji', label: '行事', files: ['gyoji-01.jpg', 'gyoji-02.jpg', 'gyoji-03.jpg', 'gyoji-04.jpg', 'gyoji-05.jpg', 'gyoji-06.jpg', 'gyoji-07.jpg', 'gyoji-08.jpg', 'gyoji-09.jpg', 'gyoji-10.jpg', 'gyoji-11.jpg'] },
  { id: 'nyugaku', label: '入学式', files: ['nyugaku-01.jpg', 'nyugaku-02.jpg', 'nyugaku-03.jpg', 'nyugaku-04.jpg'] },
];

export function illustById(id: string): Illustration | undefined {
  return ILLUSTRATIONS.find((il) => il.id === id);
}

export function illustSrc(id: string, file: string): string {
  return `/illust/${id}/${file}`;
}

// カテゴリ内からランダムに1枚選ぶ（なし/該当なしは空文字）
export function pickIllustFile(id: string): string {
  const il = illustById(id);
  if (!il || il.files.length === 0) return '';
  return il.files[Math.floor(Math.random() * il.files.length)];
}
