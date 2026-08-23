import type { MetadataRoute } from 'next';

// アプリは vercel.app 配信（SEOの正規面は本体ドメインの静的ランディング）。
const SITE_URL = 'https://shoken-maker-topaz.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: '2026-08-23',
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
