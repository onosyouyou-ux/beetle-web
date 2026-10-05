---
page: クラス分けメーカー ランディング
urls: ["/tools/kurasuwake/landing.html"]
canonical: self
sitemap: true
title_contains: "クラス分けメーカー"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".eal-hero", "#howto", "#faq", ".eal-final", ".eal-footer"]
---

# クラス分けメーカー ランディング

- **目的**: 「クラス分け 自動」「クラス編成 ツール」などの検索と、教育ツール一覧から受けるSEO集客面。アプリ本体 `/tools/kurasuwake/` への入口
- **レイアウト型**: 教育系Toolランディング（`/css/edu-app-landing.css` を共用）。席替え・班分けメーカーと同じトーン
- **title**: 「検索語｜説明｜クラス分けメーカー」の語順（CLAUDE.md のランディングの title ルール）
- **構成**: ヒーロー → 特徴3つ → 個人情報保護 → 使い方4ステップ → FAQ → CTA
- **ヒーロー画像は仮**: 使っていなかった `edu-thumbs/sekigae.jpg`（ノートPCで並びを見比べる先生）を当てている。専用の絵ができたら差し替える（一覧のカードも同じ）
- **SEO**: SoftwareApplication・BreadcrumbList・HowTo・FAQPage、canonical self。アプリ本体のcanonicalもこのURLへ向ける
- **手動確認観点**: 名簿・点数を送信しないこと、印刷は名前だけ、アプリCTAが `/tools/kurasuwake/` へ向いていること、席替え・班分けメーカーとの相互リンク
