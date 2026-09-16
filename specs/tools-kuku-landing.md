---
page: かけざん修行 ランディング
urls: ["/tools/kuku/landing.html"]
canonical: self
sitemap: true
title_contains: "かけざん修行"
og_image: "/assets/images/kuku-lp-hero-og.jpg"
required_selectors: ["#site-header", ".eal-hero", "#howto", "#for-family", "#faq", ".eal-final", ".eal-footer"]
---

# かけざん修行 ランディング

- **目的**: 検索・教育ツール一覧から受けるSEO集客面。アプリ本体 `/tools/kuku/` への入口。
  九九は小2の2学期に習うので、**9〜12月に検索が伸びる**想定
- **レイアウト型**: 教育系Toolランディング（`/css/edu-app-landing.css` ＋ `/css/ninja-landing.css` を5本の修行と共用）
- **構成**: ヒーロー → 3つの といかた → ●のアレイ図（WHY）→ 使い方3ステップ → おうちのかたへ → FAQ → CTA
- **訴求の軸**: 「九九は計算ではなく音で覚える」。速算ドリルとして売らない。
  ほかの九九アプリとの違いは**唱え方をそのまま出すこと**と**まちがえたら●の図が自動で出ること**の2点
- **ヒーロー画像**は `assets/images/kuku-lp-hero.jpg`（1080x720・お母さんと女の子の水彩。2026-09-16）。
  ほかの修行は透過の忍者キャラを置くが、これは背景つきの絵なので `ninja-landing.css` 末尾で
  **3:2の額（白い縁＋角丸）に切って右の列に置く**。`--nl-art` にこの絵を入れている
- **OGP画像**は `assets/images/kuku-lp-hero-og.jpg`（1200x630。ヒーローから切り出し）。アプリ本体 `tools/kuku/index.html` と共用
- **SEO**: SoftwareApplication・HowTo・FAQPage、canonical self。アプリ本体の canonical もこのURLへ向ける
- **FAQはアプリ画面には置かない**（アプリは あそびかた3ステップだけ）。ここが1か所。
  変えたら JSON-LD の FAQPage も同内容で直す
- **手動確認観点**: CTAが `/tools/kuku/` へ向いていること／FAQ本文と JSON-LD が同内容であること／
  ヒーローの絵が額からはみ出たり、スマホで横に伸びたりしていないこと
