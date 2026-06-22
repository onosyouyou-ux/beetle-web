import type { MetadataRoute } from 'next';

// 本体ドメイン配下の正規URL（basePath 込み）。
const SITE_URL = 'https://www.beetle-web.jp/tools/gakkyu-tsushin';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/tools/gakkyu-tsushin/', disallow: '/tools/gakkyu-tsushin/api/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
