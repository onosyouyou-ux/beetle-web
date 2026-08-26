---
page: とけい修行 ランディング
urls: ["/tools/tokei/landing.html"]
canonical: self
sitemap: true
title_contains: "とけい修行"
og_image: "/assets/images/ninja/tokei-clockwork-og.jpg"
required_selectors: ["#site-header", ".eal-hero", "#howto", "#for-family", "#faq", ".eal-final", ".eal-footer"]
---

# とけい修行 ランディング

- **目的**: note・検索・教育ツール一覧から受けるSEO集客面。アプリ本体 `/tools/tokei/` への入口
- **レイアウト型**: 教育系Toolランディング。温かいクリーム＋オレンジ、生成済み時計学習画像を使用
- **レスポンシブ**: [_common.md](_common.md) の「レスポンシブ共通ルール」に従う。スマホでは**ヒーロー画像を画面の高さから決めた帯**にし、
  **カードの絵と番号は同じ行**に置く（1カラムに折り返したときに大きな塊・余分な改行を作らない）
- **構成**: ヒーロー → 特徴3つ → 難しさ4段階 → 使い方3ステップ → FAQ → CTA
- **おうちのかたへ（`#for-family`）**: アプリ画面から移した大人向けの説明3つ。FAQもアプリ側の設問を取り込み済み（2026-08-26）
- **SEO**: SoftwareApplication・HowTo・FAQPage、canonical self。アプリ本体のcanonicalもこのURLへ向ける
- **手動確認観点**: ちょうどの じかん・30ぷんきざみ・5ふんきざみ・1ぷんきざみ の4段階が明記され、アプリCTAが `/tools/tokei/` へ向いていること
