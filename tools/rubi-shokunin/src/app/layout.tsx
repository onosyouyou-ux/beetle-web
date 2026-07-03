import type { Metadata } from 'next';
import './globals.css';

// アプリ本体は vercel.app 配信。集客(SEO)は本体ドメインの静的ランディングが担当。
// アプリ画面はランディングを正規URLとして指す（評価をランディングに集約）。
const APP_URL = 'https://rubi-shokunin.vercel.app';
const LANDING_URL = 'https://www.beetle-web.jp/tools/rubi-shokunin/';
const TITLE = 'ふりがなメーカー';
const DESC = 'ぶんしょうを はりつけるだけで、かんじに ふりがなが つくよ。がぞうからの よみこみにも たいおう。';
const OG_IMAGE = 'https://www.beetle-web.jp/assets/images/OG.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: TITLE,
  description: DESC,
  icons: { icon: '/favicon.svg' },
  alternates: { canonical: LANDING_URL },
  openGraph: {
    type: 'website',
    siteName: 'BEETLE合同会社',
    title: `${TITLE} | BEETLE`,
    description: DESC,
    url: LANDING_URL,
    locale: 'ja_JP',
    images: [{ url: OG_IMAGE, width: 1200, height: 800 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | BEETLE`,
    description: DESC,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
