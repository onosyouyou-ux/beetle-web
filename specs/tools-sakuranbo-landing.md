---
page: さんすう うちゅうたんけん さくらんぼざん ランディング
urls: ["/tools/sakuranbo/landing.html"]
canonical: self
sitemap: true
title_contains: "さくらんぼ算"
og_image: "/assets/images/sakuranbo/lp/og-sakuranbo.jpg"
required_selectors: ["#site-header", ".footer-skyline-bar", ".footer-link-bar"]
---

# さくらんぼざん ランディング（`tools/sakuranbo/landing.html`）

- **目的**: SEO集客面。アプリ本体（/tools/sakuranbo/）への入口。検索語「さくらんぼ算 練習」を title の先頭に置く（CLAUDE.md ツール名の付け方）
- **レイアウト型**: さんすう うちゅうたんけん のランディング（`css/sansu-app-lp.css`・`slp-` クラス）を共用。絵も さんすう のものを使う（ユーザー決定）
- **内容**（2026-10-02 アプリの作り直しに追従）: 3つの しゅるい（たしざん／ひきざん まえ＝げんかほう／ひきざん うしろ＝げんげんほう）のカード、
  むずかしさ3つ（ふつう・むずかしい・ちょうなんもん＝100を つくる）の説明、まえを わける（4 + 8）の3ステップ図、
  1もん2だん（わける→こたえ→とき方）の説明、使い方3ステップ、FAQ（JSON-LD FAQPage と同内容）
- **検索語**: title・description に「たし算・ひき算」「くり上がり・くり下がり」「小学1年生」「無料」を入れる（Googleの検索語に引っかかるよう文章を厚くする方針）
- **ヒーロー画像** `assets/images/sakuranbo/lp/app-play.jpg`: 忍者の絵のタブレット画面（左上 413,272・495×370）に、
  1080×796 で撮った とき方が出ている画面を貼る。画面を変えたら撮り直して同じ位置に貼る
- **手動確認観点**: 訴求文言がアプリの現行機能（わけかた3つ・かず2つ）と一致しているか／FAQ と JSON-LD の一致
