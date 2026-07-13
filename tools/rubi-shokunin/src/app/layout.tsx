import type { Metadata } from 'next';
import Script from 'next/script';
import ScrollTopButton from '../components/ScrollTopButton';
import './globals.css';

const GA_ID = 'G-N6JXJGQ1Q6';

// アプリ本体は vercel.app 配信。集客(SEO)は本体ドメインの静的ランディングが担当。
// アプリ画面はランディングを正規URLとして指す（評価をランディングに集約）。
const APP_URL = 'https://rubi-shokunin.vercel.app';
const LANDING_URL = 'https://www.beetle-web.jp/tools/rubi-shokunin/';
const TITLE = 'ルビメーカー';
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
      <body>
        <nav className="site-nav">
          <div className="site-nav-inner">
            <a className="site-nav-logo" href="https://www.beetle-web.jp" target="_blank" rel="noopener">BEET<span>LE</span></a>
            <div className="site-nav-links">
              <a href="https://www.beetle-web.jp/" target="_blank" rel="noopener">ホーム</a>
              <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">ツール</a>
              <a href="https://www.beetle-web.jp/blog/" target="_blank" rel="noopener">コラム</a>
              <a href="https://www.beetle-web.jp/#contact" target="_blank" rel="noopener">お問い合わせ</a>
              <a className="site-nav-howto" href={LANDING_URL} target="_blank" rel="noopener">リファレンス</a>
            </div>
          </div>
        </nav>

        {/* 紙面（1180px固定）。余白はモザイクタイルの背景 */}
        <div className="app-paper">
          <main className="app-main">{children}</main>
          <p className="paper-release">更新日：{process.env.NEXT_PUBLIC_UPDATED_DATE}</p>
        </div>

        {/* その他ツール用フッター：バナーなしのテキストロゴ版。
            1段目「BEETLEロゴ＋ナビリンク」、2段目「プライバシーポリシー・会社名」。PC・スマホとも中央揃え */}
        <footer className="site-footer-app">
          <div className="sfa-row">
            <a href="https://www.beetle-web.jp" target="_blank" rel="noopener" className="sfa-logo">
              BEET<span>LE</span>
            </a>
            <nav className="sfa-nav">
              <a href="https://www.beetle-web.jp/" target="_blank" rel="noopener">ホーム</a>
              <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">ツール</a>
              <a href="https://www.beetle-web.jp/blog/" target="_blank" rel="noopener">コラム</a>
              <a href="mailto:info@beetle-web.jp">お問い合わせ</a>
            </nav>
          </div>
          <div className="sfa-copy">
            <a href="https://www.beetle-web.jp/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>
            <span>© 2026 BEETLE Co., LLC</span>
          </div>
        </footer>
        <ScrollTopButton />

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
