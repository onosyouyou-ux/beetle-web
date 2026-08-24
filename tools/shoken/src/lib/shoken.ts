import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * メモを所見の文章に整えるのは、長考より丁寧な言い換えが要る仕事なので Sonnet 5 で足りる。
 * ルビ職人・学級通信メーカーも Sonnet 系で、このリポジトリの既定に揃う。
 *
 * 2026-08-24 の実測（4人×2案・目安120字＝許容108〜132字。本番URLに同一入力）:
 *   Opus 5   effort=medium              → 平均112.0字 / 範囲内 7/8 / 46.3秒
 *   Sonnet 5 effort=low  （±10%指示）   → 平均 83.6字 / 範囲内 0/8 / 11.1秒 ← 短すぎて不可
 *   Sonnet 5 effort=medium（明示レンジ） → 平均121.0字 / 範囲内 7/8 / 40.1秒
 *   Sonnet 5 effort=low  （明示レンジ） → 平均118.1字 / 範囲内 8/8 / 40.6秒 ← 採用
 * 字数を外していた原因は effort ではなく「±10%をモデルに計算させていたこと」だった。
 * 下限・上限を数字で渡したら effort=low でも全件が範囲に入り、Opus 5 より字数が正確になった。
 * 出力単価は Opus $25/1M に対し Sonnet $10/1M（〜2026-08-31 の導入価格。通常 $15/1M）。
 */
const MODEL = 'claude-sonnet-5';

export type StyleId = 'desu' | 'dearu';

export interface ShokenEntry {
  no: number;
  memo: string;
}

export interface ShokenInput {
  grade: string;        // 小1〜小6・中1〜中3
  term: string;         // 1学期 / 前期 など
  length: number;       // 1件あたりの目安文字数
  style: StyleId;       // 文体
  focus: string[];      // 観点（学習面・生活面 など）
  common: string;       // クラス共通のできごと（運動会・校外学習など）
  drafts: 1 | 2;        // 1人あたりの案の数
  entries: ShokenEntry[];
}

export interface ShokenDraftSet {
  no: number;
  drafts: string[];
}

/** 1リクエストで扱う人数の上限（超える分は呼び出し側で分割する） */
export const MAX_ENTRIES_PER_REQUEST = 8;

const STYLE_LABEL: Record<StyleId, string> = {
  desu: 'です・ます調（敬体）',
  dearu: 'である調（常体）',
};

const SYSTEM_PROMPT = `あなたは小学校・中学校の先生を支える、通知表の所見（行動の記録・総合所見）の下書きアシスタントです。
先生が書いた「その子のメモ」を、そのまま通知表に貼れる文章の下書きに整えます。

【最重要のルール】
- 先生が書いた事実だけを使う。メモにない出来事・数字・エピソード・成果を足すことは絶対にしない。
- 子どもの名前は書かない。文の主語は省くか「学習では」「友達との関わりでは」など場面で受ける。メモに名前が入っていても、出力には残さない。
- 決めつけを書かない。性格・能力・発達についての断定（「〜な性格である」「落ち着きがない」「能力が低い」など）や、医学的・診断的な表現は使わない。
- 他の子や平均との比較を書かない（「クラスで一番」「平均より」など）。
- 保護者と本人が読む文章として、事実→そこで見えた育ち、の順で書く。

【短所・気になる点の書き方】
メモに気になる点が書かれていたら、事実を消さずに、次の学期に向けた前向きな書き方に変える。
- 悪い例：「落ち着きがなく、話を最後まで聞けない」
- よい例：「気づいたことをすぐ行動に移す姿が見られました。話を最後まで聞いてから動くことを意識すると、よさがさらに生きてきます。」
このように「見えた事実 → 伸びしろの言い方」で結ぶ。断罪や注意喚起の文にしない。

【文章の作り方】
- 指定された文字数の範囲に必ず収める。**短すぎるのは字数オーバーと同じく不可**で、下限を下回ったら書き足して調整する。
  書き足すのは「事実の意味づけ」だけで、メモにない出来事は絶対に足さない。1件ずつ独立した文章にする。
- 指定された文体（敬体／常体）を全文で統一する。
- 学期のまとめとして自然な言い回しにする（学年・学期は与えられる）。
- 観点が指定されている場合は、その観点が文章に含まれるようにする。
- クラス共通のできごとが与えられている場合、その子のメモに関係する範囲でだけ触れてよい（メモに書かれていない参加ぶりを創作しない）。
- メモが空、または「特になし」のときは、drafts に空文字を入れず、当たりさわりのない一般的な所見は作らない。代わりに ["（メモがないため作成できません）"] を返す。
- 同じ子に複数案を作るときは、同じ事実を使いながら、書き出しと構成を変えた別案にする（内容を増やさない）。

【出力形式】
以下のJSONのみで回答する。前後に説明やコードフェンスを付けない。
{
  "results": [
    { "no": 1, "drafts": ["所見の文章1", "所見の文章2"] }
  ]
}
no は入力で与えられた番号をそのまま使う。drafts の数は指定された案の数に合わせる。`;

function buildUserMessage(input: ShokenInput): string {
  const parts: string[] = [
    `【学年】${input.grade}`,
    `【学期】${input.term}`,
    `【文体】${STYLE_LABEL[input.style]}`,
    // 「±10%」をモデルに計算させると短めに寄るので、下限・上限を数字で渡す
    `【1件あたりの文字数】${lengthRange(input.length).lo}字以上 ${lengthRange(input.length).hi}字以内（目安${input.length}字）`,
    `【1人あたりの案の数】${input.drafts}案`,
    `【入れたい観点】${input.focus.length ? input.focus.join('・') : '指定なし（メモの内容に合わせる）'}`,
    `【クラス共通のできごと】${input.common.trim() || '（なし）'}`,
    '',
    '【子どもごとのメモ】',
  ];

  input.entries.forEach((e) => {
    parts.push(`${e.no}: ${e.memo.trim() || '（メモなし）'}`);
  });

  const range = lengthRange(input.length);
  parts.push(
    '',
    `上の ${input.entries.length} 件すべてについて、番号を保ったまま所見の下書きを作ってください。`,
    `どの案も ${range.lo}字以上 ${range.hi}字以内 にしてください。短くなりそうなときは、` +
      `メモにない出来事を足すのではなく、書かれている事実の意味づけ（そこで育った力・次につながる姿）を厚くして長さを合わせます。`,
  );

  return parts.join('\n');
}

/** 指定文字数の許容レンジ（±10%）。プロンプトにも検証にも同じ値を使う */
function lengthRange(length: number): { lo: number; hi: number } {
  return { lo: Math.round(length * 0.9), hi: Math.round(length * 1.1) };
}

/**
 * max_tokens を決める（日本語は1字≒1トークンで概算）。
 * Sonnet 5 は思考がデフォルトONで、**思考トークンも max_tokens を消費する**。
 * 本文ぶんだけで見積もると思考で使い切って JSON が途中で切れる（2026-08-24 の生成失敗の原因）。
 * そのため「本文の見込み ＋ 思考の余裕」で確保する。
 */
const THINKING_HEADROOM = 8000;

function calcMaxTokens(input: ShokenInput): number {
  const perDraft = Math.round(input.length * 1.8) + 60;
  const body = input.entries.length * input.drafts * perDraft + 800;
  return Math.min(32000, body + THINKING_HEADROOM);
}

/** 出力JSONの形をモデル側に保証させる（前置きやコードフェンスが混ざらなくなる） */
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          no: { type: 'integer' },
          drafts: { type: 'array', items: { type: 'string' } },
        },
        required: ['no', 'drafts'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
};

export async function generateShoken(input: ShokenInput): Promise<ShokenDraftSet[]> {
  // 人数×案数ぶんの長い出力になるので、HTTPタイムアウトを避けてストリーミングで受ける
  const response = await getClient()
    .messages.stream({
      model: MODEL,
      max_tokens: calcMaxTokens(input),
      // 字数は「明示レンジ」で守れるので effort は low で足りる（上の実測を参照）
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(input) }],
    })
    .finalMessage();

  // 途中で切れたまま JSON.parse すると原因のわからない失敗になるので、ここで弾く
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Output truncated (max_tokens=${calcMaxTokens(input)})`);
  }

  const content = response.content.find((b) => b.type === 'text');
  if (!content || content.type !== 'text') throw new Error('Unexpected response type');

  const jsonText = content.text.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(jsonText) as { results?: ShokenDraftSet[] };
  const results = Array.isArray(parsed.results) ? parsed.results : [];

  // 番号が欠けた場合も画面が崩れないよう、入力の並びに合わせて詰め直す
  return input.entries.map((e) => {
    const hit = results.find((r) => Number(r.no) === e.no);
    const drafts = (hit?.drafts ?? []).filter((d) => typeof d === 'string' && d.trim());
    return { no: e.no, drafts: drafts.length ? drafts : ['（生成できませんでした。もう一度お試しください）'] };
  });
}
