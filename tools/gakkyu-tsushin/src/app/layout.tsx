import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '学級通信メーカー',
  description: '記事の素材を入力するだけ。AIが学級通信に整えます。写真ではなくイラストで、子どもの顔出しの心配なし。',
  icons: { icon: '/favicon.svg' },
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
      <body className="font-sans">{children}</body>
    </html>
  );
}
