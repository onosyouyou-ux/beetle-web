import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'これってバグなの？',
  description: '画像を貼るだけで判定 → バグなら起票内容を自動生成',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="font-sans">{children}</body>
    </html>
  );
}
