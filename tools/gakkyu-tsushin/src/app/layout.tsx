import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const GA_ID = 'G-N6JXJGQ1Q6';
const SITE_URL = 'https://gakkyu-tsushin.vercel.app';
const TITLE = '学級通信メーカー';
const DESC = '記事の素材を入力するだけ。AIが学級通信に整えます。写真ではなくイラストで、子どもの顔出しの心配なし。';
const OG_IMAGE = 'https://www.beetle-web.jp/assets/images/OG.png';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  icons: { icon: '/favicon.svg' },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'BEETLE合同会社',
    title: `${TITLE} | BEETLE`,
    description: DESC,
    url: '/',
    locale: 'ja_JP',
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=M+PLUS+1p:wght@400;700;800&family=M+PLUS+Rounded+1c:wght@400;700;800&family=Shippori+Mincho:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        {children}
        {/* Google Analytics (gtag はインライン必須の例外) */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
        </Script>
      </body>
    </html>
  );
}
