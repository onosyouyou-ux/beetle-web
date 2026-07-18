---
page: 教育支援メインページ
urls: ["/edu-tools.html"]
canonical: self
sitemap: true
title_contains: "教育"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".footer-skyline-bar", ".footer-link-bar", "#contact"]
---

# 教育支援メインページ（`edu-tools.html`）

- **目的**: 教育事業のメインページ。教育分野の受託とおうち・先生向けツールの入口
- **レイアウト型**: 共通ヘッダー＋LP型2段フッター。CSSは test-tools.css を流用し edu-tools.css で温かいオレンジに上書き
- **主な構成**: 01 教育分野でできること（アプリ制作・コンテンツ制作・PTA向けページ制作）→ 02 おうちで使えるツール（えいごよんで・ルビメーカー）→ 03 先生向けツール（学級通信メーカー）→ お問い合わせCTA
- **固定ルール**:
  - SP（600px以下）ではツールカードの説明文をアコーディオン化（▼ボタンで開閉。`js/tool-card-accordion.js`。test-tools.html と共通。2026-07-19）
- **手動確認観点**: ツールカードのリンク先（ランディング経由かアプリ直か）が方針どおりか／トーンがQA側と作り分けられているか／SPで▼開閉が動くか
