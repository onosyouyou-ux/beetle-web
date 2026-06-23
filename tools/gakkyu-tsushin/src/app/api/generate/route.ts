import { NextRequest, NextResponse } from 'next/server';
import { generateNewsletter, type GenerateInput } from '@/lib/claude';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<GenerateInput>;
    const { articles, events, items, caution, tone, event, revision, previous } = body;

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({ error: '記事を1件以上入力してください' }, { status: 400 });
    }

    const hasContent = articles.some((a) => a?.text?.trim());
    if (!hasContent) {
      return NextResponse.json({ error: '記事の内容を入力してください' }, { status: 400 });
    }

    const result = await generateNewsletter({
      articles: articles.map((a) => ({
        text: String(a?.text ?? ''),
        heading: a?.heading ? String(a.heading) : undefined,
        illustration: String(a?.illustration ?? ''),
        illustFile: String(a?.illustFile ?? ''),
      })),
      events: String(events ?? ''),
      items: String(items ?? ''),
      caution: String(caution ?? ''),
      tone: tone ?? 'lower',
      event: event ?? 'normal',
      revision: revision ? String(revision) : undefined,
      previous: previous,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: '生成に失敗しました。もう一度お試しください。' }, { status: 500 });
  }
}
