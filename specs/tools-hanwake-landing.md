---
page: 班分けメーカー ランディング
urls: ["/tools/hanwake/landing.html"]
canonical: self
sitemap: true
title_contains: "班分けメーカー"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".eal-hero", "#howto", "#faq", ".eal-final", ".eal-footer"]
---

# 班分けメーカー ランディング

- **目的**: 「班分け 自動」「グループ分け ツール」などの検索と、教育ツール一覧から受けるSEO集客面。
  アプリ本体 `/tools/hanwake/` への入口
- **レイアウト型**: 教育系Toolランディング（`/css/edu-app-landing.css` を共用）。席替えメーカーと同じトーン
- **構成**: ヒーロー → 特徴3つ → 個人情報保護 → 使い方3ステップ → FAQ → CTA
- **ヒーロー画像は未設定**。`.eal-hero-grid` を使わず1カラムで組んであるので画像が無くても崩れない。
  用意できたら `.eal-hero-grid` ＋ `.eal-hero-img` に変えて2カラムにする（OGPも差し替える）
- **SEO**: SoftwareApplication・BreadcrumbList・HowTo・FAQPage、canonical self。
  アプリ本体のcanonicalもこのURLへ向ける
- **手動確認観点**: 名簿を送信しないこと、配慮4種類、アプリCTAが `/tools/hanwake/` へ向いていること、
  席替えメーカーとの相互リンクが生きていること
