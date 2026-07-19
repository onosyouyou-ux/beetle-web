---
page: 正規表現テスター
urls: ["/tools/regex-tester/"]
canonical: self
sitemap: true
title_contains: "正規表現テスター"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", "#site-footer", "#rt-pattern", "#rt-string", "#rt-output"]
e2e: true
---

# 正規表現テスター（`tools/regex-tester/`）

- **目的**: 日本向けパターン集＋その場で動作確認できる静的ツール（サーバー不要）
- **レイアウト型**: Reference系（[_common.md](_common.md) 参照）＋インタラクティブ部（#tester）
- **主要素**: `#rt-pattern`（パターン入力）・`#rt-flags`・`#rt-string`（テスト文字列）・`#rt-output`（結果）・`#rt-status`・`#patterns`（パターン集）・`#faq`
- **挙動（E2Eで検証）**: パターンとテスト文字列を入力するとリアルタイムでマッチ結果が `#rt-output` に表示される。不正な正規表現ではエラーが `#rt-status` に出てクラッシュしない
- **手動確認観点**: パターン集の各パターンが実際に妥当か（メール・電話番号等の網羅性）
