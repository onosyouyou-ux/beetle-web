import Anthropic from '@anthropic-ai/sdk';
import { toneById, type ToneId } from './templates';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export interface Article {
  heading: string;       // 見出し（10字以内）
  body: string;          // 本文（50〜100字）
  illustration: string;  // イラストカテゴリID（先生の選択をそのまま返す）
  illustFile: string;    // 選択中の具体的な画像ファイル名（アプリ側で管理）
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
  heading?: string;      // 見出しヒント（空でもOK）
  illustration: string;  // 選択中のイラストカテゴリID
  illustFile: string;    // 選択中の画像ファイル名
}

export interface GenerateInput {
  articles: ArticleInput[];
  events: string;
  items: string;
  caution: string;
  tone: ToneId;
  revision?: string;            // 修正指示（再生成時）
  previous?: NewsletterResult;  // 前回出力（再生成時）
}

const SYSTEM_PROMPT = `あなたは小学校の先生を支える、学級通信づくりのアシスタントです。
先生が書いた素材（箇条書きでも可）を、保護者に配れる学級通信の「見出し＋本文」に整えます。

【絶対に守るルール（最重要）】
- 先生が書いた事実だけを使う。架空のエピソード・子どもの名前・存在しない出来事は絶対に作らない。
- 先生が書いていない固有名詞・数字・成果・行事を勝手に足さない。これは「余白を埋めて」と頼まれても変わらない。
- 上の2つ（＝新しい事実の創作）が禁止なのであって、すでに先生が書いた事実を、より丁寧で具体的な文章に膨らませることは許可されている。両者を混同しない。

【作り方】
- 先生が入力した記事の数だけ、見出し（10字以内）＋本文を作る。
- 本文の分量は記事ごとに固定しない。素材が充実している記事は長く、薄い記事は短くしてよい。ただし1記事あたり最低80字は書くこと。
- 全記事の本文合計が700〜1100字になるよう調整する（A4縦2段組を埋める量）。
- 見出しは内容が一目で分かる短いもの。
- events / items / caution は、先生が入力したテキストを読みやすく整える（無ければ空文字）。事実は足さない。
- fill は、記事の内容を受けた先生からの一言コメント。「子どもたちの様子を見ていて感じたこと」「保護者へ伝えたい気持ち」を1〜2文で書く。記事の内容（先生が書いた事実）に基づいた温かみのある言葉にする。架空の事実は足さない。

【A4縦2段組の充足】
- 紙面はA4縦で左右2段組。記事本文の合計は700〜1100字が目安。
- 記事が少ない・素材が短い場合でも、事実の範囲で本文を膨らませ、できるだけ目安に近づける。
- fill（先生からのひとこと）も1〜2文をしっかり書き、紙面の余白を減らすこと。

【「余白を埋めて」「内容をふやして」と頼まれたとき】
新しい事実の創作は引き続き禁止だが、次の手段で紙面を充実させてよい。修正指示にこの趣旨が含まれるときは、はっきり分量を増やすこと（前回とほぼ同じ長さで返さない）。
- 本文を、すでに書かれた事実の範囲で、より丁寧・具体的な描写や子どもの様子・気持ちの表現に膨らませる。合計が1100字を超えない範囲で各記事を伸ばしてよい。新しい行事・固有名詞・数字・成果は足さない。
- fill（先生からのひとこと）を2〜3文に伸ばす。記事の内容から感じた先生の気持ちや子どもへの思いを丁寧に書く。
- events / items / caution も、書かれた事実の範囲で言い回しを丁寧にして読みやすくする。
- これらはあくまで「書かれた事実をふくらませる」範囲であり、事実そのものの創作ではない。

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
  const tone = toneById(input.tone);

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const articlesText = input.articles
    .map((a, i) => {
      const headingHint = a.heading?.trim() ? `（見出しの希望: ${a.heading.trim()}）` : '';
      return `記事${i + 1}${headingHint}:\n${a.text.trim() || '（空）'}`;
    })
    .join('\n\n');

  const parts: string[] = [
    `【現在の日付】${month}月${day}日（fill の季節ネタはこの時期に合わせること）`,
    '',
    `【クラスの雰囲気】${tone.label} — ${tone.prompt}`,
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
      'もし修正指示が「余白を埋めて」「内容をふやして」「もっと書いて」など分量を増やす趣旨なら、【「余白を埋めて」と頼まれたとき】の手段（本文を事実の範囲で具体的に膨らませる・fillを2〜3文に伸ばす等）を使い、前回より明確に文章量を増やしてください。前回とほぼ同じ長さで返してはいけません。',
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
    a.illustFile = input.articles[i]?.illustFile ?? '';
  });
  result.events = result.events ?? '';
  result.items = result.items ?? '';
  result.caution = result.caution ?? '';
  result.fill = result.fill ?? '';

  return result;
}
