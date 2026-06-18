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

// プリセットイラストのカテゴリ（フェーズ1は選択値の保持のみ。実画像はフェーズ2）
export const ILLUSTRATIONS: { id: string; label: string }[] = [
  { id: '', label: '（なし）' },
  { id: 'undokai', label: '運動会' },
  { id: 'ensoku', label: '遠足' },
  { id: 'shugaku', label: '修学旅行' },
  { id: 'nyugaku', label: '入学式' },
  { id: 'sotsugyo', label: '卒業式' },
  { id: 'bunkasai', label: '文化祭' },
  { id: 'gakugeikai', label: '学芸会' },
  { id: 'taiikusai', label: '体育祭' },
  { id: 'gassho', label: '合唱' },
  { id: 'club', label: 'クラブ活動' },
  { id: 'iinkai', label: '委員会活動' },
  { id: 'haru', label: '春の自然' },
  { id: 'natsu', label: '夏の自然' },
  { id: 'aki', label: '秋の自然' },
  { id: 'fuyu', label: '冬の自然' },
  { id: 'jugyo', label: '授業' },
  { id: 'test', label: 'テスト' },
  { id: 'benkyo', label: '勉強' },
  { id: 'kyushoku', label: '給食' },
  { id: 'dokusho', label: '読書' },
  { id: 'toshoshitsu', label: '図書室' },
  { id: 'seiso', label: '清掃活動' },
  { id: 'hokenshitsu', label: 'けが/保健室' },
  { id: 'anzen', label: '安全/登下校' },
  { id: 'aisatsu', label: 'あいさつ/マナー' },
  { id: 'volunteer', label: 'ボランティア活動' },
  { id: 'chiiki', label: '地域交流' },
  { id: 'kogai', label: '校外学習' },
  { id: 'camp', label: 'キャンプ' },
  { id: 'yume', label: '将来の夢' },
];
