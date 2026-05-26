import { NextResponse } from 'next/server';
import { getCount } from '@/lib/kv';

export async function GET() {
  try {
    const count = await getCount();
    return NextResponse.json(count);
  } catch {
    const limit = parseInt(process.env.FREE_LIMIT ?? '10000');
    return NextResponse.json({ used: 0, limit, remaining: limit, resetAt: '' });
  }
}
