import Anthropic from '@anthropic-ai/sdk';
import { EASY_KANJI, SPECIAL_READING } from './easy-kanji';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// claude-sonnet-4-6 は structured outputs 非対応のため、対応している現行 Sonnet を使う
const MODEL = 'claude-sonnet-5';

export interface Segment {
  text: string;
  ruby: string;
}

export type Level = 'all' | 'hard';

// 出力を JSON スキーマで強制する（コードフェンス剥がし・パース失敗の心配がない）
const SEGMENTS_SCHEMA = {
  type: 'object',
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          ruby: { type: 'string' },
        },
        required: ['text', 'ruby'],
        additionalProperties: false,
      },
    },
  },
  required: ['segments'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `あなたは日本語の文章にふりがな（ルビ）を振る処理だけを行います。
渡された文章を、元の文字列を一切変えずに順番通り分割し、segments 配列として出力します。

ルール:
- segments の text を順番につなげると元の文章と完全に一致すること（改行もそのまま含める）
- ひらがな・カタカナ・英数字・記号のみの断片は ruby を空文字("")にすること
- 一つの ruby は対応する text 全体の読み（ひらがな）にすること。送り仮名を含む場合は読み全体を入れる`;

export async function annotate(text: string, level: Level): Promise<Segment[]> {
  // むずかしい だけ でも、AIには いつも ぜんぶ 付けてもらい、外すのは あとで 表を見て行う（2026-10-08）。
  // AIに「やさしい漢字には付けない」と頼むと、「人々」に付いて「販売」に付かないなど ぶれていた
  const levelRule = '漢字を含む語には基本的にすべてふりがなを付けてください。';

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'disabled' },
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: 'json_schema', schema: SEGMENTS_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: `【ふりがなの範囲】${levelRule}\n\n【文章】\n${text}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Unexpected response type');

  const parsed = JSON.parse(block.text) as { segments: Segment[] };
  if (!Array.isArray(parsed.segments)) throw new Error('Invalid segments');
  if (level === 'hard') return parsed.segments.map((s) => (isEasy(s.text) ? { text: s.text, ruby: '' } : s));
  return parsed.segments;
}

// 漢字が 1・2年で習う字（と 々）だけで できている語か。漢字が1つも無い語は ここに来ても ruby が空
function isEasy(text: string): boolean {
  if (Array.from(SPECIAL_READING).some((w) => text.includes(w))) return false;
  const kanji = text.match(/[\u3400-\u9fff\uf900-\ufaff々]/g);
  if (!kanji) return true;
  return kanji.every((k) => k === '々' || EASY_KANJI.has(k));
}

const OCR_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export type OcrMediaType = (typeof OCR_MEDIA_TYPES)[number];

export function isOcrMediaType(v: string): v is OcrMediaType {
  return (OCR_MEDIA_TYPES as readonly string[]).includes(v);
}

export async function extractText(mediaType: OcrMediaType, base64: string): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'disabled' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: 'この画像に写っている文章を、改行位置も含めてできるだけ忠実に書き起こしてください。前置きや説明、注釈は一切不要です。書き起こした文章のみを出力してください。文章が見当たらない場合は「NO_TEXT_FOUND」とだけ出力してください。',
          },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Unexpected response type');
  return block.text.trim();
}
