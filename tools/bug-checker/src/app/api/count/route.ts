import { NextResponse } from 'next/server';
import { getCount } from '@/lib/kv';

export async function GET() {
  try {
    const count = await getCount();
    return NextResponse.json(count);
  } catch {
    return NextResponse.json({ error: 'kv_unavailable' }, { status: 503 });
  }
}
