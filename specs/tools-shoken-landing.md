---
page: 所見メーカーランディング
urls: ["/tools/shoken/"]
canonical: self
sitemap: true
title_contains: "所見メーカー"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".footer-skyline-bar", ".footer-link-bar"]
---

# 所見メーカーランディング（`tools/shoken/index.html`）

- **目的**: SEO集客面。AIアプリ本体（https://shoken-maker-topaz.vercel.app）への入口。学期末（7月・12月・3月）に検索が伸びる想定
- **レイアウト型**: Tool系ランディング（[_common.md](_common.md)「Tool系ランディング」参照。教育系・温かいトーン）。CSSは `/css/shoken-lp.css`
- **主な構成**: ヒーロー → 学期末の悩み4枚 → できること3枚 → 「名前を、預かりません」 → 入力例→出力例 → 使い方3ステップ → FAQ → 末尾CTA
- **守る方針（アプリ側と同じ。変えるときは両方直す）**:
  - 子どもの名前を入力させない／メモを保存しない、を訴求の中心に置く
  - 出力は「下書き」であり、事実確認と最終の言い回しは先生が行うことを明記する
  - 決めつけ・診断的表現・他児との比較を書かない方針を明記する
- **FAQ**: ページ内 `details` と JSON-LD FAQPage、アプリ画面下部のFAQは同内容。1か所変えたら3か所そろえる
- **手動確認観点**: CTAがアプリ本体（別タブ）へ飛ぶか／文字数・文体・観点の説明がアプリの現行機能と一致しているか
