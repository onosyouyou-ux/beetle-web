/** @type {import('next').NextConfig} */
// アプリは vercel.app 配信のまま（SEOは本体ドメインの静的ランディングが担当）。
const nextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
};

export default nextConfig;
