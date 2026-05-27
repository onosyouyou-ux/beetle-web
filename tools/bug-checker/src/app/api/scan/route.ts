import { NextRequest, NextResponse } from 'next/server';
import { scanImage } from '@/lib/claude';
import { getCount, incrementCount, isLimitExceeded, getSubscription } from '@/lib/kv';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, mimeType, subscriptionToken, note } = body as {
      image?: string;
      mimeType?: string;
      subscriptionToken?: string;
      note?: string;
    };

    if (!image || !mimeType) {
      return NextResponse.json({ error: 'Missing image or mimeType' }, { status: 400 });
    }

    const validMime = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validMime.includes(mimeType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    // base64で約6.8MB = 元画像5MB相当
    if (image.length > 6.8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    let isSubscriber = false;
    if (subscriptionToken && subscriptionToken.length <= 100) {
      const sub = await getSubscription(subscriptionToken).catch(() => null);
      isSubscriber = sub?.status === 'active';
    }

    if (!isSubscriber) {
      const exceeded = await isLimitExceeded().catch(() => false);
      if (exceeded) {
        return NextResponse.json({ error: 'FREE_LIMIT_EXCEEDED', remaining: 0 }, { status: 429 });
      }
    }

    const result = await scanImage(image, mimeType, note);

    if (!isSubscriber) {
      await incrementCount().catch(() => null);
    }

    const { remaining } = await getCount().catch(() => ({ remaining: 0 }));
    return NextResponse.json({ ...result, remaining });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
