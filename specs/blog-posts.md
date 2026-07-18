---
page: コラム記事（全記事共通仕様）
urls: ["/blog/posts/startup-qa.html", "/blog/posts/ai-instruction.html", "/blog/posts/claude-abc.html", "/blog/posts/ai-bug-report.html", "/blog/posts/bug-or-not.html", "/blog/posts/catch-ball.html", "/blog/posts/sarukani.html", "/blog/posts/test-patterns.html", "/blog/posts/spec-or-bug.html", "/blog/posts/repro-steps.html", "/blog/posts/ai-marunage.html", "/blog/posts/friday-deploy.html", "/blog/posts/verify-engineer.html", "/blog/posts/ai-test-items.html", "/blog/posts/claude-proj.html", "/blog/posts/physical-delete.html", "/blog/posts/like-updated-at.html", "/blog/posts/csv-leading-zero.html", "/blog/posts/naoshimashita.html"]
canonical: self
sitemap: true
title_contains: "BEETLE"
og_image: "any"
required_selectors: ["#site-header", "#site-footer", ".post-body"]
---

# コラム記事 共通仕様（`blog/posts/*.html`）

全19記事に共通で適用される仕様。記事を追加したら frontmatter の `urls` に追記すること。

- **目的**: SEO集客＋note からの深掘り受け皿。QA系・Claude系・教育系の3系統
- **レイアウト型**: Reference系（共通ヘッダー＋共通パーシャルフッター）
- **共通ルール**:
  - ヒーロー画像 `.post-eyecatch`（width/height 属性必須）と og:image をセットで持つ（作成フローは CLAUDE.md「ブログ記事のヒーロー画像」）
  - QA系記事のヒーローは浮世絵歌舞伎絵スタイル（2人キャラ固定）
  - og:image は記事ごとに固有（このspecでは存在と死活のみ検証）
  - sitemap.xml に記事URLと lastmod を登録。**内容更新時に lastmod も更新**
- **手動確認観点**: 記事内のツール誘導リンクが最新の導線方針（ランディング経由/直リンク）と合っているか
