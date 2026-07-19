---
page: コラム記事（全記事共通仕様）
urls_from_sitemap: "/blog/posts/"
canonical: self
sitemap: true
title_contains: "BEETLE"
og_image: "any"
required_selectors: ["#site-header", "#site-footer", ".post-body"]
---

# コラム記事 共通仕様（`blog/posts/*.html`）

全記事に共通で適用される仕様。検証対象URLは **sitemap の `/blog/posts/` 配下から自動展開**される（`urls_from_sitemap`）。
記事を追加したら sitemap.xml に登録するだけでよい（それは既存のSEO必須ルール）。仕様書側の追記は不要
（2026-07-19に手動列挙で5記事の追記漏れが起きたため、この方式に変更）。

- **目的**: SEO集客＋note からの深掘り受け皿。QA系・Claude系・教育系の3系統
- **レイアウト型**: Reference系（[_common.md](_common.md) 参照）
- **共通ルール**:
  - ヒーロー画像 `.post-eyecatch`（width/height 属性必須）と og:image をセットで持つ（作成フローは CLAUDE.md「ブログ記事のヒーロー画像」）
  - QA系記事のヒーローは浮世絵歌舞伎絵スタイル（2人キャラ固定）
  - og:image は記事ごとに固有（このspecでは存在と死活のみ検証）
  - sitemap.xml に記事URLと lastmod を登録。**内容更新時に lastmod も更新**
- **手動確認観点**: 記事内のツール誘導リンクが最新の導線方針（ランディング経由/直リンク）と合っているか
