import type { MetadataRoute } from 'next';

const SITE_URL = 'https://shoken-maker-topaz.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
