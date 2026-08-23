/** @type {import('next').NextConfig} */
// アプリは vercel.app 配信のまま（SEOは本体ドメインの静的ランディングが担当）。
const nextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    // ビルド（デプロイ）した日付を「更新日」として焼き込む
    NEXT_PUBLIC_UPDATED_DATE: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }),
  },
};

export default nextConfig;
