import type { MetadataRoute } from 'next';

const SITE_URL = 'https://gakkyu-tsushin.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: '2026-06-19',
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
