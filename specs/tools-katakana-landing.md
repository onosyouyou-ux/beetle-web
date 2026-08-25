---
page: カタカナ修行 ランディング
urls: ["/tools/katakana/landing.html"]
canonical: self
sitemap: true
title_contains: "カタカナ修行"
og_image: "/assets/images/ninja/katakana-infiltration-og.jpg"
required_selectors: ["#site-header", ".eal-hero", "#howto", "#faq", ".eal-final", ".eal-footer"]
---

# カタカナ修行 ランディング

- **目的**: 検索・教育ツール一覧から受けるSEO集客面。アプリ本体 `/tools/katakana/` への入口。
  カタカナ導入は小1の2学期なので、**9〜10月に検索が伸びる**想定
- **レイアウト型**: 教育系Toolランディング（`/css/edu-app-landing.css` をかんじ・とけいと共用）
- **レスポンシブ**: [_common.md](_common.md) の「レスポンシブ共通ルール」に従う。スマホでは**ヒーロー画像を画面の高さから決めた帯**にし、
  **カードの絵と番号は同じ行**に置く（1カラムに折り返したときに大きな塊・余分な改行を作らない）
- **構成**: ヒーロー → 3つの修行 → カタカナで書く4つのルール → 使い方3ステップ → FAQ → CTA
- **ヒーロー画像は未設定**。いまは `.eal-hero-grid` を使わず1カラムで組んである。
  画像を用意したら `.eal-hero-grid` ＋ `.eal-hero-img` を足すだけでかんじ・とけいと同じ2カラムになる
- **訴求の軸**: 「つまずいているのは字ではなく、どの言葉をカタカナで書くのか」。
  字形ドリルとして売らない（そこは既存の教材が多く、差別化にならない）
- **SEO**: SoftwareApplication・HowTo・FAQPage、canonical self。アプリ本体のcanonicalもこのURLへ向ける
- **手動確認観点**: CTAが `/tools/katakana/` へ向いていること／FAQがアプリ画面のFAQと同内容であること
