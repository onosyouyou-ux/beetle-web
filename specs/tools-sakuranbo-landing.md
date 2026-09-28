---
page: さんすう うちゅうたんけん さくらんぼざん ランディング
urls: ["/tools/sakuranbo/landing.html"]
canonical: self
sitemap: true
title_contains: "さくらんぼ算"
og_image: "/assets/images/sansu/lp/og-sansu.jpg"
required_selectors: ["#site-header", ".footer-skyline-bar", ".footer-link-bar"]
---

# さくらんぼざん ランディング（`tools/sakuranbo/landing.html`）

- **目的**: SEO集客面。アプリ本体（/tools/sakuranbo/）への入口。検索語「さくらんぼ算 練習」を title の先頭に置く（CLAUDE.md ツール名の付け方）
- **レイアウト型**: さんすう うちゅうたんけん のランディング（`css/sansu-app-lp.css`・`slp-` クラス）を共用。絵も さんすう のものを使う（ユーザー決定）
- **内容**: 4つの形（うしろ・まえ × 1けた・2けた）のカード、まえを わける（4 + 8）の3ステップ図、使い方3ステップ、FAQ（JSON-LD FAQPage と同内容）
- **手動確認観点**: 訴求文言がアプリの現行機能（わけかた3つ・かず2つ）と一致しているか／FAQ と JSON-LD の一致
