import { NextRequest, NextResponse } from 'next/server';
import { annotate, type Level } from '@/lib/claude';

export const maxDuration = 30;

const MAX_CHARS = 800;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { text?: string; level?: string };
    const text = String(body.text ?? '').trim();
    const level: Level = body.level === 'hard' ? 'hard' : 'all';

    if (!text) {
      return NextResponse.json({ error: 'ぶんしょうを いれてね。' }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `ながすぎるよ。${MAX_CHARS}じ いないに わけて はりつけてね。` },
        { status: 400 },
      );
    }

    const segments = await annotate(text, level);
    return NextResponse.json({ segments });
  } catch (error) {
    console.error('Annotate error:', error);
    return NextResponse.json(
      { error: 'うまく できなかったよ。もういちど ためしてね。' },
      { status: 500 },
    );
  }
}
