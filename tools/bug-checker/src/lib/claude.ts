import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM_PROMPT = `あなたはソフトウェアQAの専門家です。アップロードされた画像を見て、画面上に存在するバグ・不具合をすべて列挙してください。

【重要ルール】
- 画面上で視認できる問題は、根本原因が同じでも「別々の症状」として1件ずつ別チケットに起こす
- ナビゲーション・ヘッダー・コンテンツエリア・レイアウト・テキスト・ボタン・空白など、画面の各パーツを個別にチェックする
- 「根本原因が同じだから1件にまとめる」はしない。見えている問題はすべて出す
- バグが1件もない場合のみ verdict を "not_bug" にする

以下のJSON形式のみで回答してください。他のテキストは一切含めないでください。
verdict が "not_bug" または "unclear" の場合、tickets は空配列 [] にしてください。

{
  "verdict": "bug" | "not_bug" | "unclear",
  "reason": "判定理由（日本語・2〜3文）",
  "tickets": [
    {
      "title": "バグタイトル",
      "severity": "Critical" | "High" | "Medium" | "Low",
      "category": "UI" | "API" | "Performance" | "Logic" | "Security",
      "description": "詳細説明",
      "steps": ["手順1", "手順2", "手順3"],
      "expected": "期待する動作",
      "actual": "実際の動作",
      "env": "環境情報（画像から推測）"
    }
  ]
}`;

export interface Ticket {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'UI' | 'API' | 'Performance' | 'Logic' | 'Security';
  description: string;
  steps: string[];
  expected: string;
  actual: string;
  env: string;
}

export interface ScanResult {
  verdict: 'bug' | 'not_bug' | 'unclear';
  reason: string;
  tickets: Ticket[];
}

export async function scanImage(base64: string, mimeType: string, note?: string): Promise<ScanResult> {
  const userText = note
    ? `この画像を分析してください。\n\n【ユーザーからの補足情報】\n${note}`
    : 'この画像を分析してください。';

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
              data: base64,
            },
          },
          { type: 'text', text: userText },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const jsonText = content.text.replace(/```json\n?|\n?```/g, '').trim();
  const result = JSON.parse(jsonText) as ScanResult;

  if (!Array.isArray(result.tickets)) result.tickets = [];
  result.tickets.forEach(t => {
    t.id = `BUG-${Math.floor(1000 + Math.random() * 9000)}`;
  });

  return result;
}
