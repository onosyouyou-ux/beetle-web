import Anthropic from '@anthropic-ai/sdk';
import { toneById, eventById, type ToneId, type EventId } from './templates';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export interface Article {
  heading: string;       // 見出し（10字以内）
  body: string;          // 本文（50〜100字）
  illustration: string;  // イラストカテゴリID（先生の選択をそのまま返す）
}

export interface NewsletterResult {
  articles: Article[];
  events: string;
  items: string;
  caution: string;
  fill: string;          // 余白補填用の季節ネタ1文
}

export interface ArticleInput {
  text: string;          // 先生が書いた素材（箇条書きOK）
  illustration: string;  // 選択中のイラストカテゴリID
}

export interface GenerateInput {
  articles: ArticleInput[];
  events: string;
  items: string;
  caution: string;
  tone: ToneId;
  event: EventId;
  revision?: string;            // 修正指示（再生成時）
  previous?: NewsletterResult;  // 前回出力（再生成時）
}

const SYSTEM_PROMPT = `あなたは小学校の先生を支える、学級通信づくりのアシスタントです。
先生が書いた素材（箇条書きでも可）を、保護者に配れる学級通信の「見出し＋本文」に整えます。

【絶対に守るルール（最重要）】
- 先生が書いた事実だけを使う。架空のエピソード・子どもの名前・存在しない出来事は絶対に作らない。
- 書き足しは、てにをや接続など最小限の整えだけ。特定の子やイベントの中身を創作しない。
- 字数が足りなくても、作文で水増ししない。字数調整はフォントサイズ・余白・段数で吸収する前提なので、本文は素材に忠実な範囲にとどめる。
- 先生が書いていない固有名詞・数字・成果を勝手に足さない。

【作り方】
- 先生が入力した記事の数だけ、見出し（10字以内）＋本文（おおむね50〜100字）を作る。
- 見出しは内容が一目で分かる短いもの。本文は素材を自然な文章に整えるだけ。
- events / items / caution は、先生が入力したテキストを読みやすく整える（無ければ空文字）。事実は足さない。
- fill は、特定の子・行事に踏み込まない一般的な季節の一言を1文だけ（例：今の季節の自然や行事の一般的な話題）。余白がない場合でも1文だけ用意する。

【出力形式】
以下のJSONのみで回答する。前後に説明やコードフェンスを付けない。
{
  "articles": [
    { "heading": "見出し", "body": "本文", "illustration": "" }
  ],
  "events": "行事テキスト",
  "items": "忘れ物・持ち物テキスト",
  "caution": "注意事項テキスト",
  "fill": "季節の一言"
}
articles の illustration は空文字でよい（イラストはアプリ側で扱う）。`;

function buildUserMessage(input: GenerateInput): string {
  const tone = toneById(input.tone);
  const ev = eventById(input.event);

  const articlesText = input.articles
    .map((a, i) => `記事${i + 1}:\n${a.text.trim() || '（空）'}`)
    .join('\n\n');

  const parts: string[] = [
    `【クラスの雰囲気】${tone.label} — ${tone.prompt}`,
    `【イベント】${ev.label} — ${ev.prompt}`,
    '',
    `【記事の素材（この数だけ見出し＋本文を作る）】`,
    articlesText,
    '',
    `【固定欄】`,
    `今月の行事・イベント: ${input.events.trim() || '（なし）'}`,
    `忘れ物・持ち物連絡: ${input.items.trim() || '（なし）'}`,
    `注意事項: ${input.caution.trim() || '（なし）'}`,
  ];

  if (input.revision && input.previous) {
    parts.push(
      '',
      '【前回の紙面（JSON）】',
      JSON.stringify(input.previous, null, 2),
      '',
      '【先生からの修正指示】',
      input.revision.trim(),
      '',
      '前回の紙面をベースに、修正指示を反映して作り直してください。指示に関係ない箇所はできるだけ前回を保ちます。事実の創作は引き続き禁止です。',
    );
  }

  return parts.join('\n');
}

export async function generateNewsletter(input: GenerateInput): Promise<NewsletterResult> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(input) }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const jsonText = content.text.replace(/```json\n?|\n?```/g, '').trim();
  const result = JSON.parse(jsonText) as NewsletterResult;

  if (!Array.isArray(result.articles)) result.articles = [];
  // 先生が選んだイラストを各記事に戻す（AIには触らせない）
  result.articles.forEach((a, i) => {
    a.illustration = input.articles[i]?.illustration ?? '';
  });
  result.events = result.events ?? '';
  result.items = result.items ?? '';
  result.caution = result.caution ?? '';
  result.fill = result.fill ?? '';

  return result;
}
