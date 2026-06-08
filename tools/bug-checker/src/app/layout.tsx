import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'これってバグなの？',
  description: '画像を貼るだけで判定 → バグなら起票内容を自動生成',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=M+PLUS+1p:wght@700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
