import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/api/scan',
};

export default async function middleware(req: NextRequest) {
  const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown';
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return NextResponse.next();
  }

  const key = `rate:${ip}`;
  try {
    const incrRes = await fetch(`${kvUrl}/incr/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const { result: count } = await incrRes.json();

    if (count === 1) {
      await fetch(`${kvUrl}/expire/${key}/60`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` },
      });
    }

    if (count > 10) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  } catch {
    // KV unavailable — allow request
  }

  return NextResponse.next();
}
