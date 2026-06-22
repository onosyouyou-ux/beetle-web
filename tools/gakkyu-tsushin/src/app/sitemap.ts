import type { MetadataRoute } from 'next';

// 本体ドメイン配下の正規URL。
const SITE_URL = 'https://www.beetle-web.jp/tools/gakkyu-tsushin/';

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
