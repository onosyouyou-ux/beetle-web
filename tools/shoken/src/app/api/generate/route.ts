import { NextRequest, NextResponse } from 'next/server';
import { generateShoken, MAX_ENTRIES_PER_REQUEST, type ShokenInput } from '@/lib/shoken';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ShokenInput>;
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (entries.length === 0) {
      return NextResponse.json({ error: 'メモを1人分以上入力してください' }, { status: 400 });
    }
    if (entries.length > MAX_ENTRIES_PER_REQUEST) {
      return NextResponse.json(
        { error: `1回に送れるのは${MAX_ENTRIES_PER_REQUEST}人までです` },
        { status: 400 },
      );
    }

    const results = await generateShoken({
      grade: String(body.grade ?? '小学3年'),
      term: String(body.term ?? '1学期'),
      length: Math.min(300, Math.max(60, Number(body.length) || 120)),
      style: body.style === 'dearu' ? 'dearu' : 'desu',
      focus: Array.isArray(body.focus) ? body.focus.map(String).slice(0, 6) : [],
      common: String(body.common ?? ''),
      drafts: body.drafts === 2 ? 2 : 1,
      entries: entries.map((e, i) => ({
        no: Number(e?.no) || i + 1,
        memo: String(e?.memo ?? '').slice(0, 600),
      })),
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: '生成に失敗しました。もう一度お試しください。' }, { status: 500 });
  }
}
