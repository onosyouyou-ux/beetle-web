import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const SYSTEM_PROMPT = `あなたはソフトウェアQAの専門家です。アップロードされた画像を見て、バグ・不具合かどうかを判断してください。
以下のJSON形式のみで回答してください。他のテキストは一切含めないでください。
verdict が "not_bug" または "unclear" の場合、ticket は null にしてください。

{
  "verdict": "bug" | "not_bug" | "unclear",
  "reason": "判定理由（日本語・2〜3文）",
  "ticket": {
    "title": "バグタイトル",
    "severity": "Critical" | "High" | "Medium" | "Low",
    "category": "UI" | "API" | "Performance" | "Logic" | "Security",
    "description": "詳細説明",
    "steps": ["手順1", "手順2", "手順3"],
    "expected": "期待する動作",
    "actual": "実際の動作",
    "env": "環境情報（画像から推測）"
  } | null
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
  ticket: Ticket | null;
}

export async function scanImage(base64: string, mimeType: string): Promise<ScanResult> {
  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
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
          { type: 'text', text: 'この画像を分析してください。' },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const jsonText = content.text.replace(/```json\n?|\n?```/g, '').trim();
  const result = JSON.parse(jsonText) as ScanResult;

  if (result.ticket) {
    result.ticket.id = `BUG-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return result;
}
