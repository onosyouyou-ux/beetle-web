import type { MetadataRoute } from 'next';

// アプリは vercel.app 配信（SEOの正規面は本体ドメインの静的ランディング）。
const SITE_URL = 'https://gakkyu-tsushin.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: '2026-06-22',
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
