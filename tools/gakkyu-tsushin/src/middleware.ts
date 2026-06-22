import { NextRequest, NextResponse } from 'next/server';

// 素の *.vercel.app ドメインに直接アクセスされたときだけ noindex にする。
// 本体ドメインからのリライト(プロキシ)経由では upstream の Host が vercel.app になるため、
// クライアントが実際に使った host（x-forwarded-host 優先）で判定する。
// これを誤ると本体ドメインの正規ページまで noindex になるので必ず x-forwarded-host を見る。
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const clientHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  if (clientHost.endsWith('.vercel.app')) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

export const config = {
  matcher: ['/:path*'],
};
