import { NextRequest, NextResponse } from 'next/server';
import { extractText, isOcrMediaType } from '@/lib/claude';

export const maxDuration = 30;

// Vercel のリクエストボディ上限(4.5MB)に収まる範囲で制限（base64は約1.37倍になる）
const MAX_BASE64_LENGTH = 4_200_000;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { mediaType?: string; data?: string };
    const mediaType = String(body.mediaType ?? '');
    const data = String(body.data ?? '');

    if (!isOcrMediaType(mediaType)) {
      return NextResponse.json(
        { error: 'つかえない がぞうの しゅるいだよ。JPEG / PNG / GIF / WEBPを つかってね。' },
        { status: 400 },
      );
    }
    if (!data) {
      return NextResponse.json({ error: 'がぞうを よみこめなかったよ。' }, { status: 400 });
    }
    if (data.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'がぞうが おおきすぎるよ。3MBいかの がぞうを つかってね。' },
        { status: 400 },
      );
    }

    const text = await extractText(mediaType, data);
    if (!text || text.includes('NO_TEXT_FOUND')) {
      return NextResponse.json(
        { error: 'がぞうから もじを みつけられなかったよ。' },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: 'がぞうの よみこみで こまったことが おきたよ。' },
      { status: 500 },
    );
  }
}
