import { NextRequest, NextResponse } from 'next/server';
import { annotate, type Level } from '@/lib/claude';

// 1回に送るのは 画面側で分けた 250字ほど（2026-10-08）。500字を1回で送ると 30秒の時間切れで落ちていた
export const maxDuration = 60;

const MAX_CHARS = 600;

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
        { error: `ながすぎるよ。${MAX_CHARS}じ いないに してね。` },
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
