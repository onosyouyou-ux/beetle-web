import Anthropic from '@anthropic-ai/sdk';
import { toneById, type ToneId, type VisualSizeId } from './templates';
import { calcLeftBudget, calcRightArticleBudget } from './budget';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export interface Article {
  heading: string;
  body: string;
  illustration: string;
  illustFile: string;
}

export interface NewsletterResult {
  articles: Article[];
  events: string;
  items: string;
  caution: string;
  fill: string;
}

export interface ArticleInput {
  text: string;
  heading?: string;
  illustration: string;
  illustFile: string;
}

export type PhotoSizeInput = 'none' | VisualSizeId;

export interface GenerateInput {
  articles: ArticleInput[];
  events: string;
  items: string;
  caution: string;
  tone: ToneId;
  photoSize?: PhotoSizeInput;
  revision?: string;
  previous?: NewsletterResult;
  // 個別AI修正時に呼び元が計算した予算を直接渡す（省略時はサーバー側で計算）
  articleBudgetOverride?: { min: number; max: number };
}

const SYSTEM_PROMPT = `あなたは小学校の先生を支える、学級通信づくりのアシスタントです。
先生が書いた素材（箇条書きでも可）を、保護者に配れる学級通信の「見出し＋本文」に整えます。

【紙面の構造（重要）】
学級通信は左右2カラム固定レイアウト。
- 左カラム：記事1・記事2（合計文字数を厳守）
- 右カラム：記事3（省略可）＋固定欄（行事・持ち物・注意事項）＋先生からの一言

【絶対に守るルール（最重要）】
- 先生が書いた事実だけを使う。架空のエピソード・子どもの名前・存在しない出来事は絶対に作らない。
- 先生が書いていない固有名詞・数字・成果・行事を勝手に足さない。これは「余白を埋めて」と頼まれても変わらない。
- 上の2つ（＝新しい事実の創作）が禁止なのであって、すでに先生が書いた事実を、より丁寧で具体的な文章に膨らませることは許可されている。両者を混同しない。

【作り方】
- 先生が入力した記事の数だけ、見出し（10字以内）＋本文を作る。
- 本文の分量は記事ごとに固定しない。素材が充実している記事は長く、薄い記事は短くしてよい。ただし入力のある記事は最低60字は書くこと。
- 【目標文字数】の各上限を1字でも超えないこと。超えると紙面から内容が切れる。
- 見出しは内容が一目で分かる短いもの。
- events / items / caution は、先生が入力したテキストを読みやすく整える（無ければ空文字）。事実は足さない。
- fill は、記事の内容を受けた先生からの一言コメント。「子どもたちの様子を見ていて感じたこと」「保護者へ伝えたい気持ち」を1〜2文で書く。架空の事実は足さない。

【紙面の充足】
- 記事が少ない・素材が短い場合でも、事実の範囲で本文を膨らませ、できるだけ下限に近づける。
- fill も1〜2文をしっかり書き、紙面の余白を減らすこと。

【「余白を埋めて」「内容をふやして」と頼まれたとき】
新しい事実の創作は引き続き禁止だが、次の手段で紙面を充実させてよい。修正指示にこの趣旨が含まれるときは、はっきり分量を増やすこと（前回とほぼ同じ長さで返さない）。
- 本文を、すでに書かれた事実の範囲で、より丁寧・具体的な描写や子どもの様子・気持ちの表現に膨らませる。各上限は厳守。
- fill を2〜3文に伸ばす。記事の内容から感じた先生の気持ちや子どもへの思いを丁寧に書く。
- events / items / caution も、書かれた事実の範囲で言い回しを丁寧にして読みやすくする。

【出力形式】
以下のJSONのみで回答する。前後に説明やコードフェンスを付けない。
{
  "articles": [
    { "heading": "見出し", "body": "本文", "illustration": "" }
  ],
  "events": "行事テキスト",
  "items": "忘れ物・持ち物テキスト",
  "caution": "注意事項テキスト",
  "fill": "先生からのひとこと（1〜2文）"
}
articles の illustration は空文字でよい（イラストはアプリ側で扱う）。`;

function buildUserMessage(input: GenerateInput): string {
  const tone   = toneById(input.tone);
  const photo  = input.photoSize ?? 'none';
  const eventsLen  = (input.previous?.events  ?? input.events).trim().length;
  const itemsLen   = (input.previous?.items   ?? input.items).trim().length;
  const cautionLen = (input.previous?.caution ?? input.caution).trim().length;

  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  // 個別AI修正（単記事 + override）か全体生成かで予算表示を分ける
  const isSingleRefine = input.articles.length === 1 && !!input.articleBudgetOverride;

  let budgetText: string;
  if (isSingleRefine) {
    const b = input.articleBudgetOverride!;
    budgetText = `本文：${b.max}字以内（推奨 ${b.min}〜${b.max}字）。超えると紙面から切れる。`;
  } else {
    const leftCount = Math.min(2, input.articles.filter(a => a.text.trim()).length || input.articles.length);
    const left  = calcLeftBudget(photo, leftCount);
    const right = calcRightArticleBudget(photo, eventsLen, itemsLen, cautionLen);
    const hasA3 = input.articles.length >= 3 && !!input.articles[2]?.text.trim();
    budgetText = [
      `記事1・2の本文合計（左カラム）：${left.max}字以内（推奨 ${left.min}〜${left.max}字）`,
      hasA3
        ? `記事3の本文（右カラム）：${right.max}字以内（推奨 ${right.min}〜${right.max}字）${right.max < 60 ? '　※固定欄が多いため短めに' : ''}`
        : `記事3：なし（右カラムは固定欄と先生コメントのみ）`,
      '各カラムの上限を1字でも超えると紙面から内容が切れる。厳守すること。',
    ].join('\n');
  }

  const articlesText = input.articles
    .map((a, i) => {
      const col = i < 2 ? '左カラム' : '右カラム';
      const headingHint = a.heading?.trim() ? `（見出しの希望: ${a.heading.trim()}）` : '';
      return `記事${i + 1}（${col}）${headingHint}:\n${a.text.trim() || '（空）'}`;
    })
    .join('\n\n');

  const parts: string[] = [
    `【現在の日付】${month}月${day}日（fill の季節ネタはこの時期に合わせること）`,
    '',
    `【クラスの雰囲気】${tone.label} — ${tone.prompt}`,
    '',
    `【目標文字数】\n${budgetText}`,
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
      'もし修正指示が「余白を埋めて」「内容をふやして」「もっと書いて」など分量を増やす趣旨なら、本文を事実の範囲で具体的に膨らませ・fillを2〜3文に伸ばすなど前回より明確に文章量を増やしてください。前回とほぼ同じ長さで返してはいけません。',
    );
  }

  return parts.join('\n');
}

export async function generateNewsletter(input: GenerateInput): Promise<NewsletterResult> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
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
    a.illustFile   = input.articles[i]?.illustFile   ?? '';
  });
  result.events  = result.events  ?? '';
  result.items   = result.items   ?? '';
  result.caution = result.caution ?? '';
  result.fill    = result.fill    ?? '';

  return result;
}
