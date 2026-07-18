---
page: トップLP
urls: ["/"]
canonical: self
sitemap: true
title_contains: "BEETLE合同会社"
og_image: "/assets/images/og-top.jpg"
required_selectors: [".header-entry", ".hero", ".footer-skyline-bar", ".footer-link-bar", "#contact"]
---

# トップLP（`index.html`）

- **目的**: 会社の顔。QA事業・教育事業の入口へ振り分け、お問い合わせにつなげる
- **レイアウト型**: LP型（独自2段ヘッダー＋LP型2段フッター。共通パーシャル不使用）
- **主な構成**: ヒーロー（AIが量産する時代の品質保証。）→ サービス → 事例 → 流れ → なぜ今 → スタイル → 自社ツール（QA系6カードのみ）→ 代表 → お問い合わせCTA（#contact）
- **固定ルール**:
  - ヘッダー1段目はグローバルメニュー（トップ・QA支援・教育支援・コラム）のテキストリンク4つ。現在ページは `aria-current="page"`
  - ヘッダー背景は白（rgba(255,255,255,0.96)）
  - 自社ツールはQA系6カードのみ。教育カードは置かず一覧リンクで誘導
  - カード末尾リンクは「詳しく見る →」太字テキストのみ（バッジ禁止）
- **手動確認観点**: ヒーロー画像（浮世絵QAキャラ）のSP非表示／サービスカードのhover演出がSPで非表示／CTAのメールとGoogleフォームが生きているか
