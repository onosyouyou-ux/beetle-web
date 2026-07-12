/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // ビルド（デプロイ）した日付を「更新日」として焼き込む
    NEXT_PUBLIC_UPDATED_DATE: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }),
  },
};

export default nextConfig;
